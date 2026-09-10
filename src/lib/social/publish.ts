import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { logAction } from "@/lib/telegram/action-log";
import { effectivePrice } from "@/lib/products/pricing";
import { hasVariants, minVariantPrice } from "@/lib/products/variants";
import { retailFromWholesale, DEFAULT_RETAIL_MARKUP } from "@/lib/products/wholesale";
import { publicDescription } from "@/lib/products/description";
import { getPricingSettings } from "@/lib/products/pricing-settings";
import { getSocialSettings } from "./settings";
import { publishToFacebook, publishToInstagram } from "./meta";
import { uploadToYoutube } from "./youtube";
import { SOCIAL_LABELS, type SocialJob, type SocialNetwork } from "@/types/social";
import type { Product } from "@/types/product";
import { DEFAULT_BLOG_DESTINATIONS, type BlogPost } from "@/types/content";
import { formatSom } from "@/lib/format";

/**
 * IJTIMOIY TARMOQQA POST QILISH VA NAVBAT.
 *
 * Telegram kanalidan farqli o'laroq bu tarmoqlarda kunlik chegara bor
 * (Instagram: 24 soatda 50 ta post; YouTube: kuniga ~6 ta video).
 * Shuning uchun har bir post NAVBATGA (`socialQueue`) yoziladi va
 * chegaradan oshmagan holda yuboriladi; xatosi bo'lsa 3 martagacha
 * qayta uriniladi.
 *
 * Ommaviy kirimda (masalan butun narxnomani zaxiraga olishda) navbatga
 * umuman qo'yilmaydi - `enqueueProduct` ni chaqirmaymiz.
 */

const COLLECTION = "socialQueue";
const MAX_ATTEMPTS = 3;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://atoyo.uz";

/**
 * POST MATNI. Ijtimoiy tarmoqda DONA (chakana) narx ko'rsatiladi -
 * optom narx faqat optom mijozlarga (maxfiylik qoidasi).
 */
export async function buildCaption(product: Product): Promise<string> {
  const settings = await getSocialSettings();
  const pricing = await getPricingSettings();
  const markup =
    typeof product.retailMarkupPercent === "number" && product.retailMarkupPercent >= 0
      ? product.retailMarkupPercent
      : (pricing.retailMarkupPercent ?? DEFAULT_RETAIL_MARKUP);

  const wholesale = hasVariants(product)
    ? (minVariantPrice(product) ?? product.price)
    : effectivePrice(product);
  const retail = retailFromWholesale(wholesale, markup);
  const price = `${formatSom(retail)}${hasVariants(product) ? " dan" : ""}`;

  const text = settings.template
    .replaceAll("{nomi}", product.name)
    .replaceAll("{kodi}", product.sku || String(product.code ?? ""))
    .replaceAll("{narx}", price)
    .replaceAll("{kategoriya}", product.category)
    .replaceAll("{brend}", product.brand ?? "")
    // Ichki xizmat ma'lumoti (1C kodi) ijtimoiy tarmoqqa chiqmaydi.
    .replaceAll("{tavsif}", publicDescription(product.description))
    .replaceAll("{havola}", `${SITE_URL}/mahsulot/${product.id}`);

  return `${text}\n\n${settings.hashtags}`.trim();
}

/** Bitta tarmoqqa DARHOL post qilish (navbatsiz). */
export async function publishNow(
  product: Product,
  network: SocialNetwork
): Promise<{ postId: string }> {
  const caption = await buildCaption(product);
  const images = (product.images ?? []).filter(Boolean);
  const video = (product.videos ?? []).filter(Boolean)[0];

  if (network === "youtube") {
    if (!video) throw new Error("YouTube uchun mahsulotda video bo'lishi kerak.");
    const postId = await uploadToYoutube({
      videoUrl: video,
      title: product.name,
      description: caption,
      tags: [product.brand, product.category].filter(Boolean) as string[],
    });
    return { postId };
  }

  if (images.length === 0 && !video) {
    throw new Error("Mahsulotda rasm yo'q - post qilib bo'lmaydi.");
  }

  const postId =
    network === "instagram"
      ? await publishToInstagram({ caption, images, video: images.length === 0 ? video : undefined })
      : await publishToFacebook({ caption, images, video: images.length === 0 ? video : undefined });

  return { postId };
}

/**
 * BLOG MAQOLASI → ijtimoiy tarmoq.
 *
 * Mahsulot postidan farqli: bu maslahat/ko'rsatma maqolasi, narx
 * ham, kod ham yozilmaydi — sarlavha, qisqa tavsif va maqola havolasi
 * ketadi. Telegram kanaliga esa `announceBlogPost` o'zi yuboradi.
 *
 * YouTube uchun VIDEO shart; Instagram/Facebook uchun muqova rasmi
 * (yoki video) yetadi.
 */
async function publishBlogNow(
  post: BlogPost,
  network: SocialNetwork
): Promise<{ postId: string }> {
  const settings = await getSocialSettings();
  const link = `${SITE_URL}/blog/${post.slug}`;

  if (network === "youtube") {
    if (!post.videoUrl) throw new Error("Maqolada video yo'q.");
    const description = [post.excerpt, link, settings.hashtags].filter(Boolean).join("\n\n");
    const postId = await uploadToYoutube({
      videoUrl: post.videoUrl,
      title: post.title,
      description,
    });
    return { postId };
  }

  const caption = [post.title, post.excerpt, link, settings.hashtags]
    .filter(Boolean)
    .join("\n\n");
  const images = post.coverImageUrl ? [post.coverImageUrl] : [];
  const video = images.length === 0 ? post.videoUrl : undefined;
  if (images.length === 0 && !video) {
    throw new Error("Maqolada rasm ham, video ham yo'q - post qilib bo'lmaydi.");
  }

  const postId =
    network === "instagram"
      ? await publishToInstagram({ caption, images, video })
      : await publishToFacebook({ caption, images, video });
  return { postId };
}

/** Maqola shu tarmoqqa yuborilishi kerakmi (maydon + tarmoq talabi). */
function blogNetworks(post: BlogPost): SocialNetwork[] {
  const wanted = post.destinations ?? DEFAULT_BLOG_DESTINATIONS;
  const networks: SocialNetwork[] = [];
  // YouTube - faqat videosi bor maqola uchun.
  if (wanted.youtube && post.videoUrl) networks.push("youtube");
  // Instagram/Facebook - muqova rasmi yoki video kerak.
  if (post.coverImageUrl || post.videoUrl) {
    if (wanted.instagram) networks.push("instagram");
    if (wanted.facebook) networks.push("facebook");
  }
  return networks;
}

/**
 * Maqolani TANLANGAN tarmoqlar navbatiga qo'yadi (`post.destinations`).
 *
 * Tarmoq admin sozlamasida ham yoqilgan bo'lishi shart; YouTube uchun
 * video, Instagram/Facebook uchun muqova rasmi kerak. Bir maqola bir
 * tarmoqqa ikki marta tushmaydi.
 */
export async function enqueueBlogPost(post: BlogPost): Promise<number> {
  if (!post.isPublished) return 0;
  const settings = await getSocialSettings();

  const networks = blogNetworks(post).filter((network) => {
    if (!settings[network]) return false;
    // YouTube'ga allaqachon yuklangan bo'lsa - takror yuklanmaydi.
    if (network === "youtube" && post.youtubeVideoId) return false;
    return true;
  });
  if (networks.length === 0) return 0;

  const db = getAdminDb();
  let added = 0;

  for (const network of networks) {
    const existing = await db
      .collection(COLLECTION)
      .where("blogId", "==", post.id)
      .where("network", "==", network)
      .limit(5)
      .get();
    if (existing.docs.some((doc) => (doc.data() as SocialJob).status !== "failed")) continue;

    const ref = db.collection(COLLECTION).doc();
    const job: SocialJob = {
      id: ref.id,
      kind: "blog",
      productId: "",
      blogId: post.id,
      productName: post.title,
      network,
      status: "pending",
      attempts: 0,
      error: null,
      postId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await ref.set(job);
    added += 1;
  }

  return added;
}

/** Bugun shu tarmoqqa nechta post ketgan. */
async function postedToday(network: SocialNetwork): Promise<number> {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const snapshot = await getAdminDb()
    .collection(COLLECTION)
    .where("network", "==", network)
    .where("status", "==", "done")
    .limit(200)
    .get();

  return snapshot.docs.filter((doc) => ((doc.data() as SocialJob).updatedAt ?? 0) > since).length;
}

/**
 * Mahsulotni navbatga qo'yadi (yoqilgan tarmoqlar bo'yicha).
 * Bitta mahsulot bir tarmoqqa ikki marta tushmaydi.
 */
export async function enqueueProduct(product: Product): Promise<number> {
  const settings = await getSocialSettings();
  const networks: SocialNetwork[] = [];
  if (settings.instagram) networks.push("instagram");
  if (settings.facebook) networks.push("facebook");
  // YouTube - faqat videosi bor mahsulot uchun.
  if (settings.youtube && (product.videos ?? []).length > 0) networks.push("youtube");

  if (networks.length === 0) return 0;
  if ((product.images ?? []).length === 0 && (product.videos ?? []).length === 0) return 0;

  const db = getAdminDb();
  let added = 0;

  for (const network of networks) {
    const existing = await db
      .collection(COLLECTION)
      .where("productId", "==", product.id)
      .where("network", "==", network)
      .limit(5)
      .get();
    // Allaqachon yuborilgan yoki navbatda tursa - takror qo'shilmaydi.
    if (existing.docs.some((doc) => (doc.data() as SocialJob).status !== "failed")) continue;

    const ref = db.collection(COLLECTION).doc();
    const job: SocialJob = {
      id: ref.id,
      productId: product.id,
      productName: product.name,
      network,
      status: "pending",
      attempts: 0,
      error: null,
      postId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await ref.set(job);
    added += 1;
  }

  return added;
}

/**
 * NAVBATNI BO'SHATISH: kunlik chegaraga sig'gan holda pending
 * postlarni yuboradi. Panel tugmasi va tashqi cron shu yo'lni chaqiradi.
 */
export async function processQueue(max = 10): Promise<{ posted: number; failed: number }> {
  const db = getAdminDb();
  const settings = await getSocialSettings();

  const snapshot = await db
    .collection(COLLECTION)
    .where("status", "==", "pending")
    .limit(Math.min(max, 25))
    .get();

  let posted = 0;
  let failed = 0;
  const usedToday = new Map<SocialNetwork, number>();

  for (const doc of snapshot.docs) {
    const job = doc.data() as SocialJob;

    // Kunlik chegara: har tarmoq uchun alohida hisoblanadi.
    let used = usedToday.get(job.network);
    if (used === undefined) {
      used = await postedToday(job.network);
      usedToday.set(job.network, used);
    }
    if (settings.dailyLimit > 0 && used >= settings.dailyLimit) continue;

    // BLOG videosi: mahsulot emas, maqola hujjati o'qiladi.
    if (job.kind === "blog") {
      const postSnap = await db.collection("blogPosts").doc(job.blogId ?? "").get();
      if (!postSnap.exists) {
        await doc.ref.update({ status: "failed", error: "Maqola topilmadi.", updatedAt: Date.now() });
        failed += 1;
        continue;
      }
      const post = { id: postSnap.id, ...postSnap.data() } as BlogPost;
      try {
        const { postId } = await publishBlogNow(post, job.network);
        await doc.ref.update({
          status: "done",
          postId,
          error: null,
          attempts: FieldValue.increment(1),
          updatedAt: Date.now(),
        });
        // YouTube ID maqolaga yozib qo'yiladi - ikkinchi marta
        // yuklanmasin (Instagram/Facebook uchun bunday cheklov yo'q).
        if (job.network === "youtube") await postSnap.ref.update({ youtubeVideoId: postId });
        usedToday.set(job.network, used + 1);
        posted += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Xatolik";
        const attempts = (job.attempts ?? 0) + 1;
        await doc.ref.update({
          status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          attempts,
          error: message,
          updatedAt: Date.now(),
        });
        failed += 1;
      }
      continue;
    }

    const productSnap = await db.collection("products").doc(job.productId).get();
    if (!productSnap.exists) {
      await doc.ref.update({ status: "failed", error: "Mahsulot topilmadi.", updatedAt: Date.now() });
      failed += 1;
      continue;
    }
    const product = { id: productSnap.id, ...productSnap.data() } as Product;

    try {
      const { postId } = await publishNow(product, job.network);
      await doc.ref.update({
        status: "done",
        postId,
        error: null,
        attempts: FieldValue.increment(1),
        updatedAt: Date.now(),
      });
      usedToday.set(job.network, used + 1);
      posted += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Xatolik";
      const attempts = (job.attempts ?? 0) + 1;
      await doc.ref.update({
        status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        attempts,
        error: message,
        updatedAt: Date.now(),
      });
      failed += 1;
    }
  }

  if (posted > 0 || failed > 0) {
    await logAction(
      `📣 Ijtimoiy tarmoqlar: ${posted} ta post yuborildi` +
        (failed > 0 ? `, ${failed} tasida xato` : "")
    );
  }
  return { posted, failed };
}

/** Navbat holati (admin panel uchun). */
export async function queueSummary(): Promise<{
  pending: number;
  failed: number;
  recent: SocialJob[];
}> {
  const db = getAdminDb();
  const [pendingSnap, failedSnap, recentSnap] = await Promise.all([
    db.collection(COLLECTION).where("status", "==", "pending").limit(500).get(),
    db.collection(COLLECTION).where("status", "==", "failed").limit(100).get(),
    db.collection(COLLECTION).orderBy("updatedAt", "desc").limit(15).get(),
  ]);

  return {
    pending: pendingSnap.size,
    failed: failedSnap.size,
    recent: recentSnap.docs.map((doc) => doc.data() as SocialJob),
  };
}
