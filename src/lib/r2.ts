/**
 * Photo storage helpers — backed by Cloudflare R2.
 *
 * Upload flow:
 *   1. Client calls the Supabase Edge Function `r2-presign` to get a presigned PUT URL.
 *   2. Client uploads directly to R2 via the presigned URL (with XHR progress).
 *   3. The storage key is saved in `submission_photos.storage_key`.
 *
 * Read flow:
 *   `getPhotoUrl(key)` resolves a key to the R2 public bucket URL.
 */

const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || '';

if (!R2_PUBLIC_URL) {
  console.warn('Missing VITE_R2_PUBLIC_URL environment variable. Image URLs will not work.');
}

/**
 * Return the public URL for a storage key.
 * If the key is already a full URL, pass it through.
 */
export function getPhotoUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${R2_PUBLIC_URL}/${path}`;
}

export function getThumbnailUrl(path: string, _width = 400): string {
  return getPhotoUrl(path);
}

/**
 * Ask the Edge Function for a presigned PUT URL for R2.
 */
async function getPresignedUploadUrl(
  filename: string,
  contentType: string,
): Promise<{ uploadUrl: string; key: string }> {
  const { supabase } = await import('./supabase');

  const { data, error } = await supabase.functions.invoke('r2-presign', {
    body: { filename, contentType },
  });

  if (error) throw new Error(`Failed to get upload URL: ${error.message}`);
  if (!data?.uploadUrl || !data?.key) throw new Error('Invalid presign response');
  return data as { uploadUrl: string; key: string };
}

/**
 * Upload a file to R2 via a presigned URL.
 * Reports progress through the optional callback.
 */
export async function uploadPhoto(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ key: string; url: string }> {
  const { uploadUrl, key } = await getPresignedUploadUrl(file.name, file.type);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ key, url: getPhotoUrl(key) });
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed — network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

// Legacy alias
export const uploadToR2 = uploadPhoto;

