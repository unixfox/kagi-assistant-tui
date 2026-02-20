type SharpFactory = typeof import("sharp");

let sharpFactoryPromise: Promise<SharpFactory | null> | null = null;

const loadSharp = async (): Promise<SharpFactory | null> => {
  if (!sharpFactoryPromise) {
    sharpFactoryPromise = import("sharp")
      .then((mod) => mod.default ?? mod)
      .catch((error) => {
        const message = [
          "The optional 'sharp' dependency could not be loaded.",
          "Refer to https://sharp.pixelplumbing.com/install#cross-platform",
          "or reinstall with: bun install --include=optional sharp",
          error instanceof Error ? error.message : String(error),
        ].join("\n");
        console.warn(message);
        return null;
      }) as Promise<SharpFactory | null>;
  }
  return sharpFactoryPromise;
};

export const createThumbnailFromImage = async (
  srcPath: string,
  destPath: string,
) => {
  const sharpFactory = await loadSharp();
  if (!sharpFactory) {
    // Fallback: simply copy the file to avoid hard failures on platforms
    // where native modules are unavailable (e.g., bun --compile bundles).
    await Bun.write(destPath, await Bun.file(srcPath).arrayBuffer());
    return;
  }

  await sharpFactory(srcPath)
    .resize(84, 84, {
      fit: "cover",
      position: "center",
    })
    .webp({ quality: 25 })
    .toFile(destPath);
};
