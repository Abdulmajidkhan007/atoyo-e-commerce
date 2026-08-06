/**
 * PRELOAD - sayt bilan ilova o'rtasidagi yagona ko'prik.
 *
 * Bu yerda ATAYLAB deyarli hech narsa ochilmaydi: sayt masofadagi kod,
 * unga Node imkoniyatlarini berish xavfli. Faqat "ilova ichida
 * ochilganmi" degan belgi qo'yiladi - kerak bo'lsa sayt shunga qarab
 * (masalan "Ilovani yuklab oling" bannerini yashirish) o'zini tutadi.
 */
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("atoyoDesktop", {
  isDesktop: true,
  platform: process.platform,
  version: process.versions.electron,
});
