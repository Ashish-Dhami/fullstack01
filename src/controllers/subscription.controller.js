import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const subscriberId = req.user?._id;
  if (!channelId.trim()) throw new ApiError(400, "channelId cannot be empty");
  if (!subscriberId) throw new ApiError(400, "subscriberId cannot be empty");
  // TODO: toggle subscription
  const existingSubscription = await Subscription.findOne({
    channel: mongoose.Types.ObjectId.createFromHexString(channelId),
    subscriber: subscriberId,
  });
  //if user is already unsubscribed
  if (!existingSubscription) {
    const newSubscription = await Subscription.create({
      channel: mongoose.Types.ObjectId.createFromHexString(channelId),
      subscriber: subscriberId,
    });
    if (!newSubscription)
      throw new ApiError(500, "error occurred while subscribing");
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "user subscribed to this channel successfully",
          newSubscription
        )
      );
  }
  //if user is already subscribed
  else {
    const unsubscribeResult = await Subscription.deleteOne({
      _id: existingSubscription._id,
    });
    if (unsubscribeResult.deletedCount === 0 || !unsubscribeResult.acknowledged)
      throw new ApiError(500, "error occurred while unsubscribing");
    return res
      .status(200)
      .json(
        new ApiResponse(200, "user unsubscribed this channel successfully")
      );
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId.trim()) throw new ApiError(400, "channel id cannot be empty");
  const subscribersList = await Subscription.aggregate([
    {
      $match: {
        channel: mongoose.Types.ObjectId.createFromHexString(channelId.trim()),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber_details",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        _id: 0,
        subscriber: {
          $first: "$subscriber_details",
        },
      },
    },
  ]);
  if (!subscribersList)
    throw new ApiError(500, "couldn't fetch subscribers list");
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        `fetched ${!subscribersList.length ? "empty" : ""} subscribers list successfully`,
        subscribersList
      )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  if (!subscriberId.trim())
    throw new ApiError(400, "subscriber id cannot be empty");
  const channelsList = await Subscription.aggregate([
    {
      $match: {
        subscriber: mongoose.Types.ObjectId.createFromHexString(
          subscriberId.trim()
        ),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
        pipeline: [
          {
            $project: {
              _id: 0,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        _id: 0,
        channel: {
          $first: "$channel",
        },
      },
    },
  ]);
  if (!channelsList)
    throw new ApiError(500, "couldn't fetch subscribed channels list");
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        `fetched ${!channelsList.length ? "empty" : ""} channels list successfully`,
        channelsList
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
