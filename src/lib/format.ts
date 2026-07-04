// Narxni bo'sh joy bilan ajratilgan raqam + valyuta belgisi ko'rinishida
// formatlaydi (masalan "1 250 000 so'm"). Valyuta belgisi joriy tilga qarab
// lug'atdan (t.common.currencyUzs) uzatiladi.
export function formatPrice(amount: number, currencyLabel: string): string {
  return `${amount.toLocaleString("uz-UZ")} ${currencyLabel}`;
}
