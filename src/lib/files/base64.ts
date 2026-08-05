/**
 * Faylni base64 matnga o'giradi (BRAUZERDA).
 *
 * `Buffer` brauzerda yo'q - shuning uchun `Uint8Array` + `btoa`
 * ishlatiladi. Katta fayllarda `String.fromCharCode(...)` ga bir yo'la
 * juda ko'p argument bermaslik uchun bo'laklarga bo'lib o'giriladi.
 */
export async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
