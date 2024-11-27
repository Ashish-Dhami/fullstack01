import { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";
import { Tweet } from "../models/tweet.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
  if (!(videoId && isValidObjectId(videoId.trim())))
    throw new ApiError(400, "video ID is invalid");
  const video = await Video.findOne({ _id: videoId, isPublished: true });
  if (!video)
    throw new ApiError(400, "video doesn't exists or has been unpublished");
  const existingLike = await Like.findOne({
    likedBy: req.user?._id,
    video: video._id,
  });
  if (!existingLike) {
    const newLike = await Like.create({
      likedBy: req.user?._id,
      video: video._id,
    });
    if (!newLike)
      throw new ApiError(500, "couldn't like the video. Try again!!");
    return res
      .status(200)
      .json(
        new ApiResponse(200, "user has liked the video successfully", newLike)
      );
  } else {
    const deletionResult = await Like.deleteOne({ _id: existingLike._id });
    if (deletionResult.deletedCount === 0 || !deletionResult.acknowledged)
      throw new ApiError(500, "couldn't unlike the video. Try again!!");
    return res
      .status(200)
      .json(new ApiResponse(200, "user has unliked the video successfully"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  if (!(commentId && isValidObjectId(commentId.trim())))
    throw new ApiError(400, "comment ID is invalid");
  const comment = await Comment.findOne({ _id: commentId });
  if (!comment)
    throw new ApiError(400, "comment doesn't exists or has been deleted");
  const existingLike = await Like.findOne({
    likedBy: req.user?._id,
    comment: comment._id,
  });
  if (!existingLike) {
    const newLike = await Like.create({
      likedBy: req.user?._id,
      comment: comment._id,
    });
    if (!newLike)
      throw new ApiError(500, "couldn't like the comment. Try again!!");
    return res
      .status(200)
      .json(
        new ApiResponse(200, "user has liked the comment successfully", newLike)
      );
  } else {
    const deletionResult = await Like.deleteOne({ _id: existingLike._id });
    if (deletionResult.deletedCount === 0 || !deletionResult.acknowledged)
      throw new ApiError(500, "couldn't unlike the comment. Try again!!");
    return res
      .status(200)
      .json(new ApiResponse(200, "user has unliked the comment successfully"));
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  if (!(tweetId && isValidObjectId(tweetId.trim())))
    throw new ApiError(400, "tweet ID is invalid");
  const tweet = await Tweet.findOne({ _id: tweetId });
  if (!tweet)
    throw new ApiError(400, "tweet doesn't exists or has been deleted");
  const existingLike = await Like.findOne({
    likedBy: req.user?._id,
    tweet: tweet._id,
  });
  if (!existingLike) {
    const newLike = await Like.create({
      likedBy: req.user?._id,
      tweet: tweet._id,
    });
    if (!newLike)
      throw new ApiError(500, "couldn't like the tweet. Try again!!");
    return res
      .status(200)
      .json(
        new ApiResponse(200, "user has liked the tweet successfully", newLike)
      );
  } else {
    const deletionResult = await Like.deleteOne({ _id: existingLike._id });
    if (deletionResult.deletedCount === 0 || !deletionResult.acknowledged)
      throw new ApiError(500, "couldn't unlike the tweet. Try again!!");
    return res
      .status(200)
      .json(new ApiResponse(200, "user has unliked the tweet successfully"));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const likedVideos = await Like.aggregate([
    {
      $match: {
        $and: [{ likedBy: req.user?._id }, { video: { $exists: true } }],
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        pipeline: [
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
            $set: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
        as: "video",
      },
    },
    {
      $set: {
        video: {
          $first: "$video",
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        video: 1,
        likedOn: "$createdAt",
      },
    },
  ]);
  if (!likedVideos) throw new ApiError(500, "couldn't fetch liked videos");
  return res
    .status(200)
    .json(
      new ApiResponse(200, "liked videos fetched successfully", likedVideos)
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
