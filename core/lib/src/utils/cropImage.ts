/**
 * Image Cropping Utilities
 *
 * Provides functions for cropping and processing images in the browser.
 */

/**
 * Creates a cropped image from a canvas area
 * @param imageSrc - Source image URL
 * @param pixelCrop - Crop area in pixels
 * @param rotation - Rotation angle (default 0)
 * @returns Promise that resolves to a Blob of the cropped image
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  // Set canvas size to match the bounding box of the rotated image
  canvas.width = safeArea;
  canvas.height = safeArea;

  // Translate canvas context to center
  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);

  // Draw rotated image
  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5,
  );

  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  // Set canvas size to final desired crop size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Paste generated rotate image with correct offset
  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y),
  );

  // Return as blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, "image/jpeg");
  });
}

/**
 * Creates an image element from a source URL
 * @param url - Image source URL
 * @returns Promise that resolves to HTMLImageElement
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

/**
 * Converts a File to base64 data URL
 * @param file - File to convert
 * @returns Promise that resolves to base64 data URL
 */
export function readFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener(
      "load",
      () => resolve(reader.result as string),
      false,
    );
    reader.readAsDataURL(file);
  });
}
