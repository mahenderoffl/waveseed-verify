// ─── compress.js — Client-side file compression before upload ─────────────────
// Images are compressed via Canvas API (no libraries needed).
// PDFs cannot be compressed client-side — we just validate size.

const TARGET_SIZES = {
  photo:      100 * 1024,   // 100 KB
  govt_id:    300 * 1024,   // 300 KB
  college_id: 200 * 1024,   // 200 KB
  marksheet:  400 * 1024,   // 400 KB
  bank:       300 * 1024,   // 300 KB
  pan:        200 * 1024,   // 200 KB
  degree:     400 * 1024,   // 400 KB
  experience: 400 * 1024,   // 400 KB
};

const HARD_MAX = 1.5 * 1024 * 1024; // 1.5 MB absolute max

/**
 * Compress a File object before upload.
 * Returns a new File/Blob with the compressed data.
 * For PDFs just validates size. For images uses canvas.
 *
 * @param {File} file
 * @param {string} docType  — one of the keys in TARGET_SIZES
 * @param {(pct:number)=>void} [onProgress]  — called with 0-100 progress
 * @returns {Promise<{blob: Blob, mimeType: string, sizeBytes: number}>}
 */
export async function compressFile(file, docType, onProgress) {
  const targetBytes = TARGET_SIZES[docType] ?? 400 * 1024;
  onProgress?.(10);

  // ── PDF: validate only ────────────────────────────────────────────────────
  if (file.type === 'application/pdf') {
    if (file.size > HARD_MAX) {
      throw new Error(
        `PDF is too large (${fmtKB(file.size)}). Please re-scan at a lower DPI or compress the PDF, then try again. Max allowed: 1.5 MB.`
      );
    }
    onProgress?.(100);
    return { blob: file, mimeType: 'application/pdf', sizeBytes: file.size };
  }

  // ── Image: compress with Canvas ───────────────────────────────────────────
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Unsupported file type. Use JPG, PNG, WebP, or PDF.');
  }

  onProgress?.(20);
  const bitmap = await createImageBitmap(file);
  onProgress?.(40);

  // Scale down if the image is very large (max 2000px on longest side)
  let { width, height } = bitmap;
  const MAX_DIM = 2000;
  if (width > MAX_DIM || height > MAX_DIM) {
    const ratio = MAX_DIM / Math.max(width, height);
    width  = Math.round(width  * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx2d = canvas.getContext('2d');
  ctx2d.drawImage(bitmap, 0, 0, width, height);
  onProgress?.(60);

  // Try decreasing JPEG quality until we hit target or quality floor (0.4)
  let quality = 0.85;
  let blob = null;
  while (quality >= 0.40) {
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    if (blob.size <= targetBytes) break;
    quality -= 0.08;
  }

  // If still above hard max, refuse
  if (blob.size > HARD_MAX) {
    throw new Error(
      `Image could not be compressed to the required size. Got ${fmtKB(blob.size)}, max is 1.5 MB. Please resize the image manually.`
    );
  }

  onProgress?.(100);
  return { blob, mimeType: 'image/jpeg', sizeBytes: blob.size };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => b ? resolve(b) : reject(new Error('Canvas toBlob failed')),
      type,
      quality
    );
  });
}

export function fmtKB(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
