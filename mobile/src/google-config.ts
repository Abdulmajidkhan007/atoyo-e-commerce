/**
 * GOOGLE ORQALI KIRISH uchun "web client ID".
 *
 * Bu qiymat maxfiy emas (har bir APK ichida bo'ladi), lekin har bir
 * Firebase loyihasida boshqacha. `google-services.json` ichidagi
 * `client_type: 3` yozuvidagi `client_id` shu qiymat.
 *
 * CI (GitHub Actions) uni `GOOGLE_SERVICES_JSON` secret'idan avtomatik
 * chiqarib, build paytida shu faylni qayta yozadi (.github/workflows/ci.yml).
 * Shuning uchun repoda bo'sh turadi - bo'sh bo'lsa "Google orqali kirish"
 * tugmasi ko'rinmaydi va boshqa hamma narsa ishlashda davom etadi.
 *
 * Lokal build uchun qo'lda ham yozib qo'yish mumkin.
 */
export const GOOGLE_WEB_CLIENT_ID = '';
