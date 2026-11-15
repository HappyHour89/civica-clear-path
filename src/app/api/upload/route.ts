import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { CivicaError } from "@/lib/claude";
import { enforceRateLimit, errorResponse } from "@/lib/http";
import { MAX_UPLOAD_BYTES, UPLOAD_PATH } from "@/lib/uploadLimits";

// Gives the browser a short-lived permit to send one large file (over 4 MB,
// up to 20 MB) straight to Civica's private storage. The permit allows only
// that size and a path under uploads/, expires in 10 minutes, and the file is
// deleted as soon as the explain request has read it. The server still checks
// the file's real type from its bytes when it reads it.
export async function POST(request: Request) {
  try {
    enforceRateLimit(request, "upload", 12, 10 * 60 * 1000);
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new CivicaError("Large uploads aren't available right now.", 503);
    let body: HandleUploadBody;
    try {
      body = (await request.json()) as HandleUploadBody;
    } catch {
      throw new CivicaError("Invalid upload request.", 400);
    }
    // Only permits are issued here; Civica asks for no completion callback.
    if (body?.type !== "blob.generate-client-token") throw new CivicaError("Invalid upload request.", 400);
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!UPLOAD_PATH.test(pathname)) throw new CivicaError("Invalid upload name.", 400);
        return {
          allowedContentTypes: ["application/octet-stream"],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          validUntil: Date.now() + 10 * 60 * 1000,
          addRandomSuffix: true,
          allowOverwrite: false,
        };
      },
    });
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
