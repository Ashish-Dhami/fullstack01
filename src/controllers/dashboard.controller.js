import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const channelStats = await User.aggregate([
    {
      $match: {
        _id: req.user?._id,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        pipeline: [
          {
            $lookup: {
              from: "likes",
              localField: "_id",
              foreignField: "video",
              as: "likes",
            },
          },
          {
            $set: {
              likes: {
                $size: "$likes",
              },
            },
          },
        ],
        as: "videoStats",
      },
    },
    {
      $lookup: {
        from: "tweets",
        localField: "_id",
        foreignField: "owner",
        pipeline: [
          {
            $lookup: {
              from: "likes",
              localField: "_id",
              foreignField: "tweet",
              as: "likes",
            },
          },
          {
            $set: {
              likes: {
                $size: "$likes",
              },
            },
          },
        ],
        as: "tweetStats",
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "owner",
        pipeline: [
          {
            $lookup: {
              from: "likes",
              localField: "_id",
              foreignField: "comment",
              as: "likes",
            },
          },
          {
            $set: {
              likes: {
                $size: "$likes",
              },
            },
          },
        ],
        as: "commentStats",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $project: {
        username: 1,
        email: 1,
        avatar: 1,
        totalSubscribers: {
          $size: "$subscribers",
        },
        totalVideos: {
          $size: "$videoStats",
        },
        totalVideoViews: {
          $sum: "$videoStats.views",
        },
        totalLikes: {
          $sum: [
            { $sum: "$videoStats.likes" },
            { $sum: "$tweetStats.likes" },
            { $sum: "$commentStats.likes" },
          ],
        },
      },
    },
  ]);
  if (!channelStats || !channelStats.length)
    throw new ApiError(500, "error fetching channel statistics. Try again !!");
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "successfully fetched user channel statistics",
        channelStats[0]
      )
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const channelVideos = await Video.find({ owner: req.user?._id }).select(
    "-owner"
  );
  if (!channelVideos)
    throw new ApiError(500, "error fetching channel videos. Try again !!");
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        `${!channelVideos.length ? "user hasn't uploaded any videos" : "successfully fetched videos uploaded by user"}`,
        channelVideos
      )
    );
});

export { getChannelStats, getChannelVideos };
