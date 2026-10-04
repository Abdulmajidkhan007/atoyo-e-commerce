import { describe, expect, it } from "vitest";
import * as site from "./text";
import * as app from "../../../mobile/src/delivery-text";
import { deliveryFeeFor } from "@/lib/orders/promo";
import type { DeliverySettings } from "@/types/promo";

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

/** Savatdagi "Bepul yetkazishga X so'm qoldi" chizig'i — sayt === ilova. */
const GAP_CASES: [Partial<DeliverySettings> | undefined, number][] = [
  [undefined, 0],
  [{ enabled: true, fee: 15000, freeFrom: 50000 }, 0],
  [{ enabled: true, fee: 15000, freeFrom: 50000 }, 12345.5],
  [{ enabled: true, fee: 15000, freeFrom: 50000 }, 50000],
  [{ enabled: true, fee: 15000, freeFrom: 50000 }, 90000],
  [{ enabled: true, fee: 15000, freeFrom: 50000 }, -10],
  [{ enabled: true, fee: 15000, freeFrom: 0 }, 1000],
  [{ enabled: false, fee: 15000, freeFrom: 50000 }, 1000],
  [{ enabled: true, fee: 0, freeFrom: 50000 }, 1000],
];

describe("freeDeliveryGap: sayt === ilova", () => {
  for (const [settings, payable] of GAP_CASES) {
    it(`${JSON.stringify(settings ?? null)} / ${payable}`, () => {
      expect(app.freeDeliveryGap(settings, payable)).toEqual(site.freeDeliveryGap(settings, payable));
    });
  }
});

/** Hudud bilan yetkazish narxi (checkout, 1 klik) — sayt === ilova. */
const ZONES = [
  { id: "z1", name: "Markaz", fee: 10000 },
  { id: "z2", name: "Chet", fee: 30000, freeFrom: 200000 },
  { id: "z3", name: "Bepul", fee: 0 },
];
const FEE_SETTINGS: DeliverySettings[] = [
  { enabled: true, fee: 15000, freeFrom: 50000, zones: ZONES },
  { enabled: false, fee: 15000, freeFrom: 50000, zones: ZONES },
  { enabled: true, fee: 15000, freeFrom: 0 },
];

describe("deliveryFeeForZone: sayt === ilova", () => {
  for (const settings of FEE_SETTINGS) {
    for (const zoneId of [null, "z1", "z2", "z3", "yoq"]) {
      for (const payable of [0, 49999, 50000, 199999, 200000]) {
        it(`${settings.enabled}/${settings.freeFrom}/${zoneId}/${payable}`, () => {
          expect(app.deliveryFeeForZone(settings, payable, zoneId)).toBe(deliveryFeeFor(settings, payable, zoneId));
        });
      }
    }
  }
});
