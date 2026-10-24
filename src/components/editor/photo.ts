export const fileToPhoto = async (file: File, max = 480): Promise<string> => {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = new OffscreenCanvas(
      Math.round(img.width * scale),
      Math.round(img.height * scale)
    );
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await canvas
      .convertToBlob({ type: "image/jpeg", quality: 0.86 })
      .catch(() => {
        throw new Error("Couldn't encode the photo");
      });
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
};
