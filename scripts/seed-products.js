// Namuna santexnika mahsulotlarini Firestore'ga yozadi (bir martalik seed).
// Ishga tushirish: node scripts/seed-products.js
// Ma'lumotlar admin paneldan (/admin/katalog) o'chirilishi/tahrirlanishi mumkin.

const fs = require("fs");
const path = require("path");

const envContent = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx);
  let value = trimmed.slice(idx + 1);
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  process.env[key] = value;
}

const admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

const db = admin.firestore();

const PRODUCTS = [
  { name: "Polipropilen quvur PN20 20mm", category: "pipes", brand: "Kalde", country: "Turkiya", material: "polypropylene", price: 18000, stock: 500, dims: { diameterMm: 20, lengthMm: 4000 } },
  { name: "Polipropilen quvur PN20 25mm", category: "pipes", brand: "Kalde", country: "Turkiya", material: "polypropylene", price: 26000, stock: 420, dims: { diameterMm: 25, lengthMm: 4000 } },
  { name: "Metalplastik quvur 16mm", category: "pipes", brand: "Valtec", country: "Italiya", material: "metal-plastic", price: 14500, stock: 800, dims: { diameterMm: 16 } },
  { name: "Mufta 20mm ichki rezbali 1/2", category: "fittings", brand: "Kalde", country: "Turkiya", material: "polypropylene", price: 6500, stock: 1200, dims: { diameterMm: 20 } },
  { name: "Burchak 90° 25mm", category: "fittings", brand: "STOUT", country: "Rossiya", material: "polypropylene", price: 4800, stock: 950, dims: { diameterMm: 25 } },
  { name: "Sharli kran 1/2 latun", category: "faucets", brand: "Icma", country: "Italiya", material: "brass", price: 45000, discount: 39000, stock: 300, dims: { diameterMm: 15, weightKg: 0.28 } },
  { name: "Oshxona krani yuqori quvurli", category: "faucets", brand: "Ferro", country: "Polsha", material: "brass", price: 320000, stock: 45, dims: { weightKg: 1.6 } },
  { name: "Dush tizimi tropik yomg'ir 25cm", category: "shower-systems", brand: "Ferro", country: "Polsha", material: "steel", price: 980000, discount: 850000, stock: 18, dims: { weightKg: 3.4 } },
  { name: "Gaz qozoni 24 kVt ikki konturli", category: "boilers", brand: "Rehau", country: "Germaniya", material: "steel", price: 6500000, stock: 8, dims: { weightKg: 31 } },
  { name: "Alyumin radiator 10 seksiya", category: "radiators", brand: "STOUT", country: "Rossiya", material: "steel", price: 720000, stock: 60, dims: { weightKg: 12 } },
  { name: "Sirkulyatsion nasos 25/60", category: "pumps", brand: "Valtec", country: "Italiya", material: "cast-iron", price: 540000, stock: 35, dims: { weightKg: 2.4 } },
  { name: "PVX kanalizatsiya quvuri 110mm", category: "pipes", brand: "Valtec", country: "O'zbekiston", material: "pvc", price: 32000, stock: 260, dims: { diameterMm: 110, lengthMm: 2000 } },
];

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-") || "mahsulot";
}

(async () => {
  const batch = db.batch();
  const now = Date.now();

  for (const p of PRODUCTS) {
    const ref = db.collection("products").doc();
    batch.set(ref, {
      id: ref.id,
      slug: `${slugify(p.name)}-${ref.id.slice(0, 6)}`,
      name: p.name,
      nameSearchIndex: p.name.toLowerCase(),
      description: `${p.name} — ${p.brand} brendi, ${p.country}da ishlab chiqarilgan sifatli santexnika mahsuloti.`,
      category: p.category,
      brand: p.brand,
      manufacturerCountry: p.country,
      material: p.material,
      dimensions: p.dims,
      price: p.price,
      discountPrice: p.discount ?? null,
      currency: "UZS",
      stock: p.stock,
      images: [],
      thumbnailUrl: "",
      isActive: true,
      salesCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
  console.log(`OK - ${PRODUCTS.length} ta mahsulot yozildi.`);

  const snap = await db.collection("products").get();
  console.log(`Firestore'dagi jami mahsulotlar: ${snap.size}`);
  process.exit(0);
})();
