import type { Dictionary } from "./i18n";
import { DIRECT_UPLOAD_BYTES, MAX_IMAGE_BYTES, MAX_UPLOAD_BYTES } from "./uploadLimits";

// Adds a file to a form in the browser. Files up to 4 MB travel inside the
// request; larger ones (up to 20 MB) go straight to Civica's private storage
// first and the form carries only their path. Large photos are shrunk so the
// AI can read them.
// directLimit: how much may travel inside the request (lower when a form
// carries two files, so together they stay under Vercel's limit).
export async function attachFile(form: FormData, field: string, file: File, t: Dictionary, directLimit = DIRECT_UPLOAD_BYTES) {
  const ready = await shrinkImage(file);
  if (ready.size > MAX_UPLOAD_BYTES) throw new Error(t.errorTooLarge);
  if (ready.size <= directLimit) {
    form.set(field, ready, file.name);
    return;
  }
  const { upload } = await import("@vercel/blob/client");
  const id = crypto.randomUUID().replaceAll("-", "");
  try {
    const blob = await upload(`uploads/${id}.bin`, ready, {
      access: "private",
      handleUploadUrl: "/api/upload",
      contentType: "application/octet-stream",
    });
    form.set(`${field}Ref`, blob.pathname);
    form.set(`${field}Name`, file.name.slice(0, 200));
  } catch {
    throw new Error(t.uploadFailed);
  }
}

const SHRINKABLE = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIDE = 2400;

async function shrinkImage(file: File): Promise<Blob> {
  if (!SHRINKABLE.has(file.type) || file.size <= MAX_IMAGE_BYTES * 0.8) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    for (const quality of [0.85, 0.7, 0.55]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= MAX_IMAGE_BYTES * 0.8) return blob;
    }
  } catch {
    // Unreadable in this browser: send it as it is and let the server decide.
  }
  return file;
}
