import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { extractPublicId } from "cloudinary-build-url";
import ApiError from "./ApiError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
export const upload = async (filePath) => {
  try {
    if (!filePath) return null;
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
    });
    //console.log(`cloudinary => ${{... uploadResult }}`)
    //empty the temp folder synchronously
    fs.unlinkSync(filePath);
    return uploadResult;
  } catch (err) {
    fs.unlinkSync(filePath);
    return null;
  }
};

export const deleteFromUrl = async (publicUrl, resource_type = "image") => {
  try {
    const publicId = extractPublicId(publicUrl);
    await cloudinary.uploader.destroy(publicId, {
      resource_type,
      invalidate: true,
    });
  } catch (err) {
    throw new ApiError(
      500,
      err.message || "error while deleting file from cloudinary"
    );
  }
};
