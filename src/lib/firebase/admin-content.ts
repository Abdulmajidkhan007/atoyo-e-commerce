import "server-only";
import { getAdminDb } from "./admin";
import { DEFAULT_SITE_SETTINGS, type BlogPost, type SiteSettings } from "@/types/content";

/** Sayt sozlamalari (kontakt, ijtimoiy tarmoqlar, about). Yo'q bo'lsa default. */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const snap = await getAdminDb().doc("settings/site").get();
    const data = snap.data() as Partial<SiteSettings> | undefined;
    if (!data) return DEFAULT_SITE_SETTINGS;
    return {
      phone: data.phone ?? DEFAULT_SITE_SETTINGS.phone,
      email: data.email ?? DEFAULT_SITE_SETTINGS.email,
      address: data.address ?? DEFAULT_SITE_SETTINGS.address,
      socials: Array.isArray(data.socials) ? data.socials : DEFAULT_SITE_SETTINGS.socials,
      about: {
        title: data.about?.title ?? DEFAULT_SITE_SETTINGS.about.title,
        body: data.about?.body ?? DEFAULT_SITE_SETTINGS.about.body,
        imageUrl: data.about?.imageUrl ?? DEFAULT_SITE_SETTINGS.about.imageUrl,
      },
      channelFooter: {
        phones: Array.isArray(data.channelFooter?.phones) ? data.channelFooter.phones : [],
        slogan: data.channelFooter?.slogan ?? "",
        address: data.channelFooter?.address ?? "",
        links: Array.isArray(data.channelFooter?.links) ? data.channelFooter.links : [],
      },
    };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

/** Chop etilgan blog postlari (public sahifa uchun). */
export async function getPublishedPosts(limitCount = 30): Promise<BlogPost[]> {
  try {
    const snap = await getAdminDb()
      .collection("blogPosts")
      .where("isPublished", "==", true)
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BlogPost);
  } catch {
    // Kompozit indeks hali yaratilmagan bo'lishi mumkin (isPublished + createdAt).
    // Bunday holda sahifa yiqilmasligi uchun oddiy so'rov + xotirada saralash.
    try {
      const snap = await getAdminDb()
        .collection("blogPosts")
        .where("isPublished", "==", true)
        .limit(limitCount)
        .get();
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as BlogPost)
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }
}

/** Admin panel uchun barcha postlar (chop etilmaganlar ham). */
export async function getAllPosts(limitCount = 50): Promise<BlogPost[]> {
  const snap = await getAdminDb().collection("blogPosts").orderBy("createdAt", "desc").limit(limitCount).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BlogPost);
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const snap = await getAdminDb().collection("blogPosts").where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return { id: doc.id, ...doc.data() } as BlogPost;
}
