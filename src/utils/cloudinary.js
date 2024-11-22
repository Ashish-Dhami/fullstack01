import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { extractPublicId } from "cloudinary-build-url";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
export const upload = async (filePath) => {
  try {
    if (!filePath) return null;
    const uploadResult = await cloudinary.uploader.upload(filePath);
    //console.log(`cloudinary => ${{... uploadResult }}`)
    //empty the temp folder synchronously
    fs.unlinkSync(filePath);
    return uploadResult;
  } catch (err) {
    fs.unlinkSync(filePath);
    return null;
  }
};

export const deleteFromUrl = async (publicUrl) => {
  try {
    const publicId = extractPublicId(publicUrl);
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (err) {
    throw new ApiError(500, "error while deleting file from cloudinary");
  }
};
