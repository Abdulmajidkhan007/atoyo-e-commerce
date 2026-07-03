// Mavjud foydalanuvchini admin qiladi.
// AVVAL saytga o'sha email bilan kamida bir marta kirgan bo'lishi shart
// (Google yoki Email/Parol orqali) - shunda Firestore `users` hujjati
// yaratilgan bo'ladi.
//
// Ishga tushirish: node scripts/make-admin.js sizning@email.com

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

const email = process.argv[2];
if (!email) {
  console.error("Foydalanish: node scripts/make-admin.js sizning@email.com");
  process.exit(1);
}

(async () => {
  const user = await admin.auth().getUserByEmail(email).catch(() => null);
  if (!user) {
    console.error(`Xato: "${email}" bilan foydalanuvchi topilmadi. Avval saytga shu email bilan kiring.`);
    process.exit(1);
  }

  await admin.firestore().collection("users").doc(user.uid).set({ role: "admin" }, { merge: true });
  console.log(`OK - ${email} (uid: ${user.uid}) endi admin. /admin sahifasiga kira oladi.`);
  process.exit(0);
})();
