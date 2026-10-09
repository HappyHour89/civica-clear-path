import type Anthropic from "@anthropic-ai/sdk";
import { CivicaError } from "./claude";

// Vercel rejects request bodies over 4.5 MB, so stay safely under it.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
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
  if (file.size > MAX_UPLOAD_BYTES) throw new CivicaError("Files must be 4 MB or smaller.", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectBinaryType(bytes);
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
