import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// eslint-config-next@16 endi FlatCompat kerak bo'lmaydigan tabiiy
// ("flat") ESLint konfiguratsiya massivini eksport qiladi.
const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...nextCoreWebVitals,
];

export default eslintConfig;
