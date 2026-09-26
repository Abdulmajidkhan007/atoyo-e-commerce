import { describe, expect, it } from "vitest";
import * as site from "./text";
import * as app from "../../../mobile/src/delivery-text";

/**
 * SAYT VA ILOVA MATNI BIR XIL (qulf).
 *
 * `CLAUDE.md` 9-bo'lim: ilova nusxasi saytnikidan qolib ketmasligi
 * kerak. Har bir holatda ikkala funksiya AYNAN bir xil matn berishi
 * shart — bittasini o'zgartirib, ikkinchisini unutsangiz shu test
 * yiqiladi.
 */
const CASES = [
  undefined,
  {},
  { freeRadiusKm: 0 },
  { city: "", freeRadiusKm: 10 },
  { city: "", freeRadiusKm: 0 },
  { note: "Butun viloyatga bepul." },
  { enabled: true, fee: 15000, freeFrom: 50000 },
  { enabled: true, fee: 15000, freeFrom: 0 },
  { enabled: true, fee: 15000, freeFrom: 50000, city: "", freeRadiusKm: 0 },
  { enabled: false, fee: 15000, freeFrom: 50000 },
  { installEnabled: false },
  { installNote: "Faqat moyka." },
];

describe("yetkazish matni: sayt === ilova", () => {
  for (const settings of CASES) {
    it(JSON.stringify(settings ?? null), () => {
      expect(app.freeDeliveryText(settings)).toBe(site.freeDeliveryText(settings));
      expect(app.installServiceText(settings)).toBe(site.installServiceText(settings));
    });
  }
});
