/**
 * Brend palitrasi - logotipdan olingan (saytdagi tailwind.config.ts
 * bilan bir xil qiymatlar). Ilova va sayt bir xil ko'rinishda bo'lishi
 * uchun ranglar shu yerda yagona manbada turadi.
 */
export const colors = {
  navy: '#072D40',
  navyDark: '#04202F',
  navyLight: '#0B3B54',
  border: '#DFE8EE',
  borderDark: '#175071',
  muted: '#5E8CA6',
  gold: '#C49A6C',
  goldDark: '#8A6640',
  goldTint: '#F0E1CC',
  bg: '#FFFFFF',
  bgAlt: '#F3F7FA',
  white: '#FFFFFF',
  danger: '#D64545',
  success: '#2E7D5B',
} as const;

export const spacing = {xs: 4, sm: 8, md: 12, lg: 16, xl: 24} as const;
export const radius = {sm: 8, md: 12, lg: 20} as const;

export function formatSom(amount: number): string {
  return `${amount.toLocaleString('uz-UZ')} so'm`;
}
