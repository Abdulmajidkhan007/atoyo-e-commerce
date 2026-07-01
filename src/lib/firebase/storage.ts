import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getFirebaseStorage } from "./client";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadProductImage(productId: string, file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Faqat JPEG, PNG yoki WebP formatidagi rasmlar qabul qilinadi.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Rasm hajmi 5MB dan oshmasligi kerak.");
  }

  const fileName = `${crypto.randomUUID()}-${file.name}`;
  const storageRef = ref(getFirebaseStorage(), `products/${productId}/${fileName}`);
  const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(snapshot.ref);
}

export async function deleteProductImage(imageUrl: string): Promise<void> {
  const storageRef = ref(getFirebaseStorage(), imageUrl);
  await deleteObject(storageRef);
}
