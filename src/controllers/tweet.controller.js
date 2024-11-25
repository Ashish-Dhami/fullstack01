import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.body;
  if (!content.toString().trim().length)
    throw new ApiError(400, "tweet cannot be empty");
  const newTweet = await Tweet.create({
    content,
    owner: req.user?._id,
  });
  if (!newTweet) throw new ApiError(500, "new tweet cannot be created");
  return res
    .status(201)
    .json(new ApiResponse(201, "tweet created successfully", newTweet));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  if (!req.params?.userId?.trim())
    throw new ApiError(400, "userId cannot be empty");
  const myTweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.params.userId.trim()),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              _id: 0,
              username: 1,
              email: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $set: {
        owner: {
          $first: "$owner",
        },
      },
    },
  ]);
  if (!myTweets.length) throw new ApiError(500, "could not fetch tweets");
  return res
    .status(200)
    .json(new ApiResponse(200, "tweets fetched successfully", myTweets));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const tweet = await Tweet.findById(req.params?.tweetId);
  if (!tweet) throw new ApiError(400, "cannot find tweet");
  if (!tweet?.owner.equals(req.user?._id))
    throw new ApiError(400, "current user is not the owner of this tweet");
  const { newContent } = req.body;
  if (!newContent.trim().length)
    throw new ApiError(400, "tweet cannot be empty");
  tweet.content = newContent.trim();
  const updatedTweet = await tweet.save();
  if (!updatedTweet) throw new ApiError(500, "tweet cannot be updated");
  return res
    .status(201)
    .json(new ApiResponse(201, "tweet updated successfully", updatedTweet));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const tweet = await Tweet.findById(req.params?.tweetId);
  if (!tweet) throw new ApiError(400, "cannot find tweet");
  if (!tweet?.owner.equals(req.user?._id))
    throw new ApiError(400, "current user is not the owner of this tweet");
  const result = await Tweet.deleteOne({ _id: tweet?._id });
  if (result.deletedCount === 0 || !result.acknowledged)
    throw new ApiError(500, "tweet cannot be deleted");
  return res
    .status(200)
    .json(new ApiResponse(200, "tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
