/**
 * Client-side image compression and validation utility.
 * Optimizes image quality and reduces dimensions before uploading to Firebase Storage.
 */

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Validates a file for safe image types and reasonable size.
 */
export function validateImageFile(file: File): ImageValidationResult {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: "Invalid file type. Only JPEG, PNG, and WebP images are supported."
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: "Image is too large. Max allowed size is 5 MB."
    };
  }

  return { isValid: true };
}

/**
 * Compresses and resizes an image file to reduce bandwidth and storage usage.
 * Resizes large images so max dimension is 1200px, converting to JPEG with 0.8 quality.
 */
export function optimizeImageFile(file: File, maxDimension: number = 1200, quality: number = 0.8): Promise<File> {
  return new Promise((resolve) => {
    // If browser doesn't support FileReader or Canvas, fallback to original file
    if (typeof window === 'undefined' || !window.FileReader || !window.HTMLCanvasElement) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Resize calculation preserving aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // fallback
          return;
        }

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas back to Blob, then File
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // Convert to File
          const optimizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: 'image/jpeg',
            lastModified: Date.now()
          });

          // Only return compressed file if it's actually smaller than the original
          if (optimizedFile.size < file.size) {
            resolve(optimizedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      };

      img.onerror = () => {
        resolve(file);
      };
    };

    reader.onerror = () => {
      resolve(file);
    };
  });
}
