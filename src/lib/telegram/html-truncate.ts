/**
 * TELEGRAM UCHUN HTML MATNNI XAVFSIZ QISQARTIRISH.
 *
 * Albom izohi (caption) 1024 belgi bilan cheklangan, shuning uchun
 * uzun post matni kesiladi. Ilgari kesish oddiy `slice()` bilan
 * bo'lardi va matn HTML bo'lgani uchun teg O'RTASIDAN kesilib
 * qolardi:
 *
 *   `<b>Oyna hammom uchun` — `</b>` yo'q
 *
 * Telegram bunday matnni butunlay rad etadi:
 * `Can't parse entities: Can't find end tag corresponding to start
 * tag "b"` — natijada mahsulot kanalga umuman chiqmasdi.
 *
 * Bu funksiya:
 *   • teg ichida ham, HTML entity (`&amp;`) ichida ham KESMAYDI;
 *   • kesilgan joyda ochiq qolgan teglarni O'ZI yopadi;
 *   • yopuvchi teglar va uch nuqta uchun ham joy hisoblaydi, ya'ni
 *     natija chegaradan oshmaydi.
 *
 * Fayl `server-only` EMAS — sof matn mantiqi, testda ham ishlaydi.
 */

/** Yopilishi shart bo'lmagan (bo'sh) teglar. */
const SELF_CLOSING = new Set(["br", "hr", "img"]);

export function truncateHtml(html: string, limit: number, ellipsis = "..."): string {
  if (limit <= 0) return "";
  if (html.length <= limit) return html;

  const open: string[] = [];
  let result = "";
  let index = 0;
  let cut = false;

  /** Hozir ochiq turgan teglarni yopish uchun kerak bo'ladigan joy. */
  const closingLength = () => open.reduce((sum, tag) => sum + tag.length + 3, 0);

  while (index < html.length) {
    const char = html[index]!;

    // --- Teg ---
    if (char === "<") {
      const end = html.indexOf(">", index);
      if (end === -1) {
        // Buzuq HTML: qolganini olmaymiz (yarim teg yuborilmasin).
        cut = true;
        break;
      }
      const tag = html.slice(index, end + 1);
      const name = tag.replace(/^<\/?/, "").split(/[\s/>]/)[0]!.toLowerCase();
      const isClosing = tag.startsWith("</");
      const isSelfClosing = tag.endsWith("/>") || SELF_CLOSING.has(name);

      // Ochiluvchi teg kelajakda yopilishi ham kerak - joyini hisobga olamiz.
      const future = isClosing || isSelfClosing ? 0 : name.length + 3;
      if (result.length + tag.length + future + ellipsis.length + closingLength() > limit) {
        cut = true;
        break;
      }

      if (isClosing) {
        const last = open.lastIndexOf(name);
        if (last !== -1) open.splice(last, 1);
      } else if (!isSelfClosing) {
        open.push(name);
      }

      result += tag;
      index = end + 1;
      continue;
    }

    // --- Matn (HTML entity bir butun olinadi) ---
    let piece = char;
    if (char === "&") {
      const semicolon = html.indexOf(";", index);
      if (semicolon !== -1 && semicolon - index <= 10) {
        piece = html.slice(index, semicolon + 1);
      }
    }

    if (result.length + piece.length + ellipsis.length + closingLength() > limit) {
      cut = true;
      break;
    }
    result += piece;
    index += piece.length;
  }

  // Kesilgan joyda bo'sh joy/yangi qator osilib qolmasin.
  if (cut) result = result.replace(/\s+$/, "") + ellipsis;

  // Ochiq qolgan teglarni teskari tartibda yopamiz.
  for (let i = open.length - 1; i >= 0; i -= 1) result += `</${open[i]}>`;

  return result;
}
