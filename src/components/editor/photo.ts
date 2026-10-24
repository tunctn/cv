/**
 * Downscales an image file to a JPEG, stores it (R2, by content hash) and
 * returns the URL the CV keeps as its photo.
 */
export async function fileToPhoto(file: File, max = 480): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.86)
    );
    if (!blob) {
      throw new Error("Couldn't encode the photo");
    }
    const res = await fetch("/api/photo", {
      method: "POST",
      headers: { "content-type": "image/jpeg" },
      body: blob,
    });
    if (!res.ok) {
      throw new Error(`Photo upload failed: ${res.status}`);
    }
    return ((await res.json()) as { url: string }).url;
  } finally {
    URL.revokeObjectURL(url);
  }
}
