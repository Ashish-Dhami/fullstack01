import { Comment } from "../models/comment.models.js";
import ApiError from "../utils/ApiError.js";
import { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";

export const isCommentOwner = asyncHandler(async (req, _, next) => {
  const { commentId } = req.params;
  if (!(commentId && isValidObjectId(commentId.trim())))
    throw new ApiError(400, "comment ID is invalid");
  var comment = await Comment.findOne({ _id: commentId });
  if (!comment)
    throw new ApiError(400, "comment doesn't exists or has been deleted");
  if (!comment.owner.equals(req.user?._id))
    throw new ApiError(400, "current user is not the owner of this comment");
  req.comment = comment;
  next();
});
