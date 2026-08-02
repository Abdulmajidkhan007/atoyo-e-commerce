import Script from "next/script";

/**
 * GOOGLE ANALYTICS (GA4) - IXTIYORIY.
 *
 * `NEXT_PUBLIC_GA_ID` env o'zgaruvchisi qo'yilgan bo'lsagina yuklanadi
 * (masalan `G-XXXXXXXXXX`). Qo'yilmagan bo'lsa sahifaga hech qanday
 * tashqi skript qo'shilmaydi - sayt tezligi va maxfiylik shundan
 * yutadi. Kalitni App Hosting sozlamalarida (`apphosting.yaml`) yoki
 * hosting env'ida berish yetarli, koddan hech narsa o'zgartirilmaydi.
 */
export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');`}
      </Script>
    </>
  );
}
