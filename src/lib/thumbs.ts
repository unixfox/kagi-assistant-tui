import sharp from "sharp";

export const createThumbnailFromImage = async (srcPath: str, destPath: str) => {
  await sharp(srcPath)
    .resize(84, 84, {
      fit: "cover",
      position: "center",
    })
    .webp({ quality: 25 })
    .toFile(destPath);
};
