import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
export const isLoggedIn = asyncHandler(async (req, _, next) => {
  const token =
    req.cookies?.accessToken || req.headers["Authorization"]?.split(" ")[1];
  if (!token) throw new ApiError(403, "unauthorized request");
  const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  const user = await User.findById(decodedToken?.id).select(
    "-password -refreshToken"
  );
  if (!user) throw new ApiError(403, "expired token");
  req.user = user;
  next();
});
