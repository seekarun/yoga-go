/**
 * Shared utility for removing image backgrounds using @imgly/background-removal.
 * Dynamically imports the WASM module so the heavy dependency is only loaded on demand.
 */
export async function processRemoveBackground(
  imageUrl: string,
  debugLabel = "RemoveBG",
): Promise<string> {
  const { removeBackground } = await import("@imgly/background-removal");

  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error("Failed to fetch image");
  const imageBlob = await response.blob();

  const resultBlob = await removeBackground(imageBlob, {
    progress: (key: string, current: number, total: number) => {
      console.log(`[DBG][${debugLabel}] ${key}: ${current}/${total}`);
    },
  });

  // Upload the result to S3 via the existing upload endpoint
  const formData = new FormData();
  formData.append(
    "file",
    new File([resultBlob], "bg-removed.png", { type: "image/png" }),
  );

  const uploadResponse = await fetch(
    "/api/data/app/tenant/landing-page/upload",
    { method: "POST", body: formData },
  );
  if (!uploadResponse.ok) throw new Error("Failed to upload processed image");

  const uploadData = await uploadResponse.json();
  return uploadData.data.url as string;
}
