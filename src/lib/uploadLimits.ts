// Upload limits shared by the browser and the server.

// The largest file Civica reads.
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
// Vercel rejects request bodies over 4.5 MB, so files larger than this go
// straight from the browser to private storage instead (see /api/upload).
export const DIRECT_UPLOAD_BYTES = 4 * 1024 * 1024;
// The AI accepts images up to 5 MB; the browser shrinks larger photos first.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Where large uploads are kept until they are read (then deleted at once).
export const UPLOAD_PATH = /^uploads\/[A-Za-z0-9_-]{1,80}\.bin$/;
