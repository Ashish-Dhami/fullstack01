import { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.models.js";
import { Video } from "../models/video.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  if (!(videoId && isValidObjectId(videoId.trim())))
    throw new ApiError(400, "video ID is invalid");
  var video = await Video.findOne({ _id: videoId });
  if (!video)
    throw new ApiError(400, "video doesn't exists or has been deleted");
  const comments = await Comment.aggregate([
    {
      $match: {
        video: video?._id,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              username: 1,
              email: 1,
              avatar: 1,
            },
          },
        ],
        as: "owner",
      },
    },
    {
      $project: {
        comment: "$content",
        commentedBy: {
          $first: "$owner",
        },
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]).paginateExec({ sort: { updatedAt: -1 }, page, limit });
  if (!comments)
    throw new ApiError(500, "error occurred while fetching video comments");
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        `${!comments.docs?.length ? "this video has no comments" : "comments fetched successfully"}`,
        comments
      )
    );
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  if (!(videoId && isValidObjectId(videoId.trim())))
    throw new ApiError(400, "video ID is invalid");
  const { content } = req.body;
  if (!content || !content?.trim().length)
    throw new ApiError(400, "comment cannot be empty");
  var video = await Video.findOne({ _id: videoId });
  if (!video)
    throw new ApiError(400, "video doesn't exists or has been deleted");
  const newComment = await Comment.create({
    content,
    owner: req.user?._id,
    video: video._id,
  });
  if (!newComment)
    throw new ApiError(500, "error occurred while adding your comment");
  return res
    .status(201)
    .json(new ApiResponse(201, "comment added successfully", newComment));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { newContent } = req.body;
  if (!newContent || !newContent?.trim().length)
    throw new ApiError(400, "new comment cannot be empty");
  const updatedComment = await Comment.findByIdAndUpdate(
    req.comment?._id,
    {
      content: newContent,
    },
    { new: true }
  );
  if (updatedComment?.content?.trim() !== newContent.trim())
    throw new ApiError(500, "couldn't update the comment. Try again!!");
  return res
    .status(201)
    .json(new ApiResponse(201, "comment updated successfully", updatedComment));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const deletionResult = await Comment.deleteOne({ _id: req.comment?._id });
  if (deletionResult?.deletedCount === 0 || !deletionResult?.acknowledged)
    throw new ApiError(500, "couldn't delete the comment. Try again!!");
  return res
    .status(200)
    .json(new ApiResponse(200, "comment deleted successfully"));
});

export { addComment, deleteComment, getVideoComments, updateComment };
