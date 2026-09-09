import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/firebase/admin-content";

export const dynamic = "force-dynamic";

/**
 * MAXFIYLIK SIYOSATI.
 *
 * Play Store ilovani qabul qilishi uchun ochiq maxfiylik siyosati
 * havolasi SHART (`https://atoyo.uz/maxfiylik`). Matn shu
 * loyihada haqiqatan yig'iladigan ma'lumotlarga mos yozilgan —
 * "Data safety" anketasi ham shu ro'yxat bilan to'ldiriladi.
 */
export const metadata: Metadata = {
  title: "Maxfiylik siyosati",
  description:
    "Atoyo Santexnika qanday ma'lumot yig'adi, nima uchun ishlatadi va uni qanday himoya qiladi. Политика конфиденциальности Atoyo.",
  alternates: { canonical: "/maxfiylik" },
};

const UPDATED_AT = "2026-yil 3-avgust";

export default async function PrivacyPage() {
  const settings = await getSiteSettings();

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-navy-900 dark:text-white">Maxfiylik siyosati</h1>
      <p className="mb-8 text-sm text-navy-300">Oxirgi yangilanish: {UPDATED_AT}</p>

      <div className="flex flex-col gap-6 text-sm leading-6 text-navy-600 dark:text-navy-100">
        <p>
          Ushbu siyosat &laquo;Atoyo Santexnika &amp; Otopleniye&raquo; sayti
          (atoyo.uz), Android ilovasi va Telegram boti uchun amal qiladi. Ulardan
          foydalanish orqali siz quyidagi shartlarga rozilik bildirasiz.
        </p>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-navy-900 dark:text-white">
            1. Qanday ma&apos;lumot yig&apos;amiz
          </h2>
          <ul className="list-disc pl-5">
            <li>
              <b>Hisob ma&apos;lumotlari</b> — ism, email, telefon raqami. Google, Telegram yoki
              email orqali ro&apos;yxatdan o&apos;tganingizda olinadi.
            </li>
            <li>
              <b>Buyurtma ma&apos;lumotlari</b> — yetkazib berish manzili yoki xarita nuqtasi,
              buyurtma tarkibi va holati.
            </li>
            <li>
              <b>Qurilma bildirishnoma tokeni</b> — buyurtma holati o&apos;zgarganda xabar
              yuborish uchun (ilovada).
            </li>
            <li>
              <b>Siz yuborgan matn va rasmlar</b> — yordamchiga savol yoki rasm bo&apos;yicha
              qidiruv uchun yuborilgan surat.
            </li>
            <li>
              <b>Texnik ma&apos;lumot</b> — IP manzil (spamdan himoya uchun) va, agar analitika
              yoqilgan bo&apos;lsa, sahifa ko&apos;rishlar statistikasi.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-navy-900 dark:text-white">
            2. Nima uchun ishlatamiz
          </h2>
          <p>
            Faqat xizmat ko&apos;rsatish uchun: buyurtmani qabul qilish va yetkazish, holat
            haqida xabar berish, mijoz bilan bog&apos;lanish, mahsulot qidiruvida yordam berish
            va do&apos;kon ishini yaxshilash. <b>Ma&apos;lumotlaringiz sotilmaydi</b> va reklama
            maqsadida uchinchi shaxslarga berilmaydi.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-navy-900 dark:text-white">
            3. Kim bilan bo&apos;lishamiz
          </h2>
          <ul className="list-disc pl-5">
            <li>
              <b>Google Firebase</b> — ma&apos;lumotlarni saqlash, kirish va bildirishnomalar;
            </li>
            <li>
              <b>Telegram</b> — bot orqali buyurtma bergan yoki hisobini bog&apos;lagan
              bo&apos;lsangiz;
            </li>
            <li>
              <b>Anthropic va Google (AI)</b> — yordamchiga yuborilgan savol yoki rasm shu
              xizmatlarda qayta ishlanadi; ular bu ma&apos;lumotni model o&apos;rgatishda
              ishlatmaydi;
            </li>
            <li>
              <b>SMS operatori va to&apos;lov tizimi</b> — xabar yuborish va to&apos;lovni qabul
              qilish uchun (yoqilgan bo&apos;lsa).
            </li>
          </ul>
          <p className="mt-2">
            Karta raqamingiz bizda <b>saqlanmaydi</b> — u to&apos;g&apos;ridan-to&apos;g&apos;ri
            to&apos;lov tizimiga yuboriladi, bizda faqat maxfiy token qoladi.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-navy-900 dark:text-white">
            4. Qancha vaqt saqlaymiz
          </h2>
          <p>
            Hisobingiz va buyurtmalar tarixi hisobingiz mavjud bo&apos;lgunicha saqlanadi.
            Buyurtma hujjatlari hisobot uchun qonun talab qilgan muddatgacha qoladi.
            Yordamchi bilan suhbat serverda saqlanmaydi.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-navy-900 dark:text-white">
            5. Sizning huquqlaringiz
          </h2>
          <p>
            Ma&apos;lumotlaringizni ko&apos;rish, tuzatish yoki hisobingizni butunlay
            o&apos;chirishni so&apos;rashingiz mumkin. Buning uchun quyidagi manzilga yozing —
            so&apos;rov 7 ish kuni ichida bajariladi. Bildirishnomalarni esa istalgan payt
            ilova sozlamalaridan o&apos;chirasiz.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-navy-900 dark:text-white">
            6. Bolalar
          </h2>
          <p>
            Xizmat 18 yoshdan katta foydalanuvchilarga mo&apos;ljallangan; biz bolalardan
            ataylab ma&apos;lumot yig&apos;maymiz.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-navy-900 dark:text-white">
            7. Bog&apos;lanish
          </h2>
          <p>
            Email: <b>{settings.email}</b>
            <br />
            Telefon: <b>{settings.phone}</b>
            <br />
            Manzil: {settings.address}
          </p>
        </div>

        <p className="text-xs text-navy-300">
          Siyosat o&apos;zgarsa yangi matn shu sahifada e&apos;lon qilinadi va yuqoridagi sana
          yangilanadi.
        </p>
      </div>
    </section>
  );
}
