import { jwtVerify, createRemoteJWKSet } from "jose";

/**
 * Firebase ID tokenlarini imzolash uchun ishlatiladigan xizmat hisobi
 * ("securetoken@system.gserviceaccount.com") ochiq kalitlari - standart
 * JWKS formatida, Firebase tomonidan Edge/no-SDK tekshiruv uchun rasman
 * hujjatlashtirilgan manzil:
 * https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 */
const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const jwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));

export interface EdgeVerifiedToken {
  uid: string;
}

/**
 * Edge runtime'da (Node.js Admin SDK'siz) Firebase ID tokenining
 * imzosi, muddati, `iss` va `aud` maydonlarini kriptografik tarzda
 * tekshiradi. Bu FAQAT tokenning HAQIQIYLIGINI tasdiqlaydi - foydalanuvchi
 * rolini (Firestore) TEKSHIRMAYDI, chunki Firestore'ga ishonchli
 * so'rov yuborish Edge runtime'da Admin SDK talab qiladi. Rol tekshiruvi
 * har doim Node.js runtime'da ishlaydigan Server Component/Route
 * Handler'da (`lib/firebase/session.ts`) amalga oshiriladi.
 */
export async function verifyFirebaseIdTokenAtEdge(
  idToken: string,
  projectId: string
): Promise<EdgeVerifiedToken | null> {
  try {
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    if (typeof payload.sub !== "string" || !payload.sub) return null;

    return { uid: payload.sub };
  } catch {
    return null;
  }
}
