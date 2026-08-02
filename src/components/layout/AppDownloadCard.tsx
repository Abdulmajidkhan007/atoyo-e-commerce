/**
 * ANDROID ILOVASINI YUKLAB OLISH bloki (footer'da).
 *
 * APK har push'da GitHub Actions'da yig'iladi va "latest" degan
 * ko'chuvchi teg ostidagi ochiq Release'ga qo'yiladi - shuning uchun
 * havola doim eng oxirgi versiyaga olib boradi va o'zgarmaydi.
 */

const APK_URL =
  "https://github.com/Abdulmajidkhan007/atoyo-e-commerce/releases/latest/download/app-release.apk";

const RELEASE_PAGE = "https://github.com/Abdulmajidkhan007/atoyo-e-commerce/releases/latest";

export function AppDownloadCard() {
  return (
    <div className="rounded-xl2 border border-navy-500/60 bg-navy-800/60 p-5">
      <div className="flex items-start gap-3">
        {/* Android robotchasi - tashqi rasm/kutubxonasiz, sof SVG. */}
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-aqua-500/15">
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-aqua-300" aria-hidden="true">
            <path d="M6 9h12v8a2 2 0 0 1-2 2h-1v3h-2v-3h-2v3H9v-3H8a2 2 0 0 1-2-2V9Zm-1.5 0A1.5 1.5 0 0 1 6 10.5v4a1.5 1.5 0 0 1-3 0v-4A1.5 1.5 0 0 1 4.5 9Zm15 0A1.5 1.5 0 0 1 21 10.5v4a1.5 1.5 0 0 1-3 0v-4A1.5 1.5 0 0 1 19.5 9ZM8.7 3.6 7.8 2.2a.4.4 0 0 1 .7-.4l.9 1.5a6.8 6.8 0 0 1 5.2 0l.9-1.5a.4.4 0 0 1 .7.4l-.9 1.4A5.9 5.9 0 0 1 18 8H6a5.9 5.9 0 0 1 2.7-4.4ZM9.5 5.6a.6.6 0 1 0 0 1.2.6.6 0 0 0 0-1.2Zm5 0a.6.6 0 1 0 0 1.2.6.6 0 0 0 0-1.2Z" />
          </svg>
        </span>

        <div className="min-w-0">
          <p className="font-semibold text-white">Atoyo ilovasi</p>
          <p className="mt-1 text-sm text-navy-300">
            Android uchun mobil ilova: katalog, savat, buyurtma va sharhlar — telefoningizda,
            saytdagi kabi.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={APK_URL}
          className="inline-flex items-center gap-2 rounded-full bg-aqua-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-aqua-400"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
            <path d="M12 3a1 1 0 0 1 1 1v9.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.4L11 13.6V4a1 1 0 0 1 1-1Zm-7 15h14a1 1 0 1 1 0 2H5a1 1 0 1 1 0-2Z" />
          </svg>
          APK yuklab olish
        </a>

        <a
          href={RELEASE_PAGE}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-navy-300 underline-offset-2 hover:text-aqua-300 hover:underline"
        >
          Barcha versiyalar
        </a>
      </div>

      <p className="mt-3 text-xs text-navy-300">
        O&apos;rnatishda &quot;Noma&apos;lum manbalar&quot;ga ruxsat berish so&apos;raladi — bu
        normal, ilova Play Market orqali emas, to&apos;g&apos;ridan-to&apos;g&apos;ri tarqatiladi.
        iPhone uchun ilova hozircha yo&apos;q — saytdan foydalanavering.
      </p>
    </div>
  );
}
