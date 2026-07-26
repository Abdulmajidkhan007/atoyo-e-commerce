import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// eslint-config-next@16 endi FlatCompat kerak bo'lmaydigan tabiiy
// ("flat") ESLint konfiguratsiya massivini eksport qiladi.
const eslintConfig = [
  // scripts/ - Admin SDK bilan ishlaydigan bir martalik CommonJS util
  // skriptlar (seed, make-admin); Next.js/TS lint qoidalari ularga tegishli emas.
  // mobile/ - alohida React Native loyihasi, o'z eslint sozlamasi bor.
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "scripts/**", "mobile/**"] },
  ...nextCoreWebVitals,
];

export default eslintConfig;
