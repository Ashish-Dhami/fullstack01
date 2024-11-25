import { User } from "../models/user.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromUrl, upload } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  if (!userId) return { accessToken: null, refreshToken: null };
  const user = await User.findById(userId);
  const accessToken = await user.generateAccessToken();
  const refreshToken = await user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
};

const registerUser = asyncHandler(async (req, res) => {
  //take react hook form data from req.body
  const { username, email, password } = req.body;
  //validate if fields are not empty
  if (
    [username, email, password].some((field) => {
      return field === undefined || field === null || field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "all fields are required");
  }
  //check if user already exists
  const userCheck = await User.findOne({ $or: [{ username }, { email }] });
  if (userCheck) {
    throw new ApiError(401, "user already exists");
  }
  //upload req.files cloudinary
  const avatarLocalPath = req.files?.avatar[0]?.path;
  if (!avatarLocalPath)
    throw new ApiError(500, "couldn't find avatar path on disk");
  const uploadedAvatar = await upload(avatarLocalPath);
  if (!uploadedAvatar)
    throw new ApiError(400, "couldn't save avatar file to cloudinary");
  //if not exists, create a user
  const user = await User.create({
    username,
    email,
    password,
    avatar: uploadedAvatar?.url,
  });

  const newUser = await User.findById(user?._id).select("-password");

  if (!newUser) {
    throw new ApiError(501, "error occurred while registering");
  }
  return res
    .status(201)
    .json(new ApiResponse(200, "user registered successfully", newUser));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) throw new ApiError(400, "user not found");
  const userVerified = await user.verifyPassword(password);
  if (!userVerified)
    return res.status(401).json(new ApiResponse(401, "invalid credentials"));
  //generate access and refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  if (!accessToken || !refreshToken)
    throw new ApiError(500, "error occurred while generating tokens");
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const options = { httpOnly: true, secure: true };
  return res
    .status(202)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(202, "user logged in successfully", {
        accessToken,
        refreshToken,
        user: loggedInUser,
      })
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //delete refresh token from user's document
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: "" },
    },
    { new: true }
  );

  //invalidate from jwt also
  const options = { httpOnly: true, secure: true };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "user logged out successfully!"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  if (!req.cookies.refreshToken)
    throw new ApiError(401, "Unauthorized request");
  try {
    //take refresh token from client
    const decodedToken = await jwt.verify(
      req.cookies?.refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    //jwt.verify it => if false then logout/login again
    //fetch the payload(userId) from decoded token
    const user = await User.findById(decodedToken.id);
    if (!user) throw new ApiError(401, "Refresh token invalid");
    if (req.cookies?.refreshToken !== user.refreshToken)
      throw new ApiError(401, "refresh token expired");
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );
    //generate new access token
    const options = { httpOnly: true, secure: true };
    return res
      .status(201)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(201, "new access-refresh token generated", {
          accessToken,
          refreshToken,
        })
      );
  } catch (err) {
    throw new ApiError(401, err.message || "Refresh token invalid");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { currPassword, newPassword } = req.body;
  const loggedInUser = await User.findById(req.user?._id);
  if (!(await loggedInUser.verifyPassword(currPassword)))
    throw new ApiError(401, "current password is incorrect");
  loggedInUser.password = newPassword;
  await loggedInUser.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, "password changed succesfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  console.log(req.user._id);
  return res.status(200).json(
    new ApiResponse(200, "current user details fetched successfully", {
      currentUser: req.user,
    })
  );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { email: newEmail } = req.body;
  if (!newEmail) throw new ApiError(400, "new email not supplied");
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { email: newEmail },
    },
    { new: true }
  ).select("-password -refreshToken");
  return res
    .status(201)
    .json(new ApiResponse(201, "account details updated successfully!", user));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const newAvatarLocalPath = req.file?.path;
  if (!newAvatarLocalPath)
    throw new ApiError(400, "error saving avatar to disk");
  //delete old
  await deleteFromUrl(req.user?.avatar);
  const uploadedAvatar = await upload(newAvatarLocalPath);
  if (!uploadedAvatar.url)
    throw new ApiError(400, "error saving avatar to cloudinary");
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { avatar: uploadedAvatar.url },
    },
    { new: true }
  ).select("-password -refreshToken");
  return res.status(201).json(
    new ApiResponse(201, "avatar updated successfully!", {
      user: updatedUser,
    })
  );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  //req.user //req.params
  //get -> user's subscribers(from "Subscription"), subscribedTo(from "Subscription"), isSubscribed(check req.user in "subscribers")
  //along with other details(username,avatar,email from "User")
  if (!req.params?.username) throw new ApiError(400, "username is missing");
  // const searchedUser = await User.findOne({ username: req.params?.username })
  // if(!searchedUser) throw new ApiError(404,"user not found")
  //aggregation pipelines starts from here
  const channel = await User.aggregate([
    {
      $match: { username: req.params?.username },
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
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $project: {
        _id: 0,
        username: 1,
        avatar: 1,
        email: 1,
        subscribers: {
          $size: "$subscribers",
        },
        subscribedTo: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
  ]);
  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, "channel details fetched successfully", channel[0])
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: req.user?._id,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    avatar: 1,
                    email: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: { $first: "$owner" },
            },
          },
        ],
      },
    },
  ]);
  console.log(`user -> ${JSON.stringify(user)}`);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Watch history fetched successfully",
        user[0].watchHistory
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  getUserChannelProfile,
  getWatchHistory,
};
