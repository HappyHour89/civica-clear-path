import type Anthropic from "@anthropic-ai/sdk";
import { del, get } from "@vercel/blob";
import { CivicaError } from "./claude";
import { MAX_IMAGE_BYTES, MAX_UPLOAD_BYTES, UPLOAD_PATH } from "./uploadLimits";

export { MAX_UPLOAD_BYTES };
const MAX_TEXT_CHARS = 150_000;

type ImageType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

// Trust the file's actual bytes, not its name or the browser's claimed type.
function detectBinaryType(bytes: Uint8Array): "application/pdf" | ImageType | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}

export async function fileToContentBlock(file: File): Promise<Anthropic.Beta.BetaContentBlockParam> {
  if (file.size === 0) throw new CivicaError("The uploaded file is empty.", 400);
  if (file.size > MAX_UPLOAD_BYTES) throw new CivicaError("Files must be 20 MB or smaller.", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectBinaryType(bytes);
  // The AI reads images up to 5 MB; the page shrinks larger photos first.
  if (detected?.startsWith("image/") && bytes.length > MAX_IMAGE_BYTES) {
    throw new CivicaError("Images must be 5 MB or smaller. Try a smaller photo or a PDF.", 413);
  }
  const title = file.name.slice(0, 200) || "Uploaded file";

  if (detected === "application/pdf") {
    return {
      type: "document",
      title,
      source: { type: "base64", media_type: "application/pdf", data: Buffer.from(bytes).toString("base64") },
    };
  }
  if (detected) {
    return {
      type: "image",
      source: { type: "base64", media_type: detected, data: Buffer.from(bytes).toString("base64") },
    };
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new CivicaError("Unsupported file. Upload a PDF, an image, or a plain-text file.", 415);
  }
  if (text.length > MAX_TEXT_CHARS) {
    throw new CivicaError("That text file is too long. Upload a shorter excerpt (about 50 pages or less).", 413);
  }
  return {
    type: "document",
    title,
    source: { type: "text", media_type: "text/plain", data: text },
  };
}

// A form field holds either the file itself (up to 4 MB, inside the request)
// or, for larger files, `<field>Ref`: the path of a private upload the
// browser sent straight to storage (see /api/upload). Only paths under
// uploads/ are accepted, so a request can never read Civica's other files,
// and the upload is deleted as soon as it has been read.
export async function readUpload(form: FormData, field: string): Promise<File | null> {
  const file = form.get(field);
  if (file instanceof File && file.size > 0) return file;
  const ref = form.get(`${field}Ref`);
  if (typeof ref !== "string" || !ref) return null;
  if (!UPLOAD_PATH.test(ref)) throw new CivicaError("Invalid upload.", 400);
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new CivicaError("Large uploads aren't available right now.", 503);
  try {
    const result = await get(ref, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) throw new CivicaError("The upload expired. Please add the file again.", 410);
    const bytes = await readLimited(result.stream, MAX_UPLOAD_BYTES);
    const name = String(form.get(`${field}Name`) ?? "").slice(0, 200) || "Uploaded file";
    return new File([bytes], name);
  } finally {
    await del(ref).catch(() => undefined);
  }
}

async function readLimited(stream: ReadableStream<Uint8Array>, limit: number) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw new CivicaError("Files must be 20 MB or smaller.", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
