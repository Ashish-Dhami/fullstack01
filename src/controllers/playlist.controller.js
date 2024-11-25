import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";

const getPlaylistDetails = async (playlistId) => {
  //write reusable code here
  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: playlistId,
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
        createdBy: {
          $first: "$owner",
        },
      },
    },
    {
      $unset: "owner",
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        pipeline: [
          {
            $match: {
              isPublished: true, //in case, if video owner unpublished the video after adding it to playlist
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
        ],
        as: "videos",
      },
    },
    {
      $set: {
        videos: {
          $reverseArray: "$videos", //to display newly added videos at the top
        },
      },
    },
  ]);
  return !playlist.length ? null : playlist[0];
};

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  //TODO: create playlist
  if (
    [name, description].some((field) => {
      return !(field && field.trim().length);
    })
  )
    throw new ApiError(400, "all fields are required");

  const newPlaylist = await Playlist.create({
    name: name.trim(),
    description: description.trim(),
    owner: req.user?._id,
  });
  if (!newPlaylist) throw new ApiError(500, "new playlist cannot be created");
  return res
    .status(201)
    .json(new ApiResponse(201, "playlist created successfully", newPlaylist));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists
  if (!userId || !isValidObjectId(userId.trim())) {
    throw new ApiError(400, "userID is invalid");
  }
  const userPlaylists = await Playlist.find({ owner: userId });
  const detailedUserPlaylists = [];
  await Promise.all(
    userPlaylists?.map(async (playlist) => {
      detailedUserPlaylists.push(await getPlaylistDetails(playlist._id));
    })
  );
  if (!detailedUserPlaylists)
    throw new ApiError(500, "error fetching user playlists");
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        `${!detailedUserPlaylists.length ? "user hasn't created any playlists" : "playlists fetched successfully"}`,
        detailedUserPlaylists
      )
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id
  if (!playlistId || !isValidObjectId(playlistId.trim())) {
    throw new ApiError(400, "playlistID is invalid");
  }
  const playlist = await getPlaylistDetails(
    mongoose.Types.ObjectId.createFromHexString(playlistId.trim())
  );
  if (!playlist) throw new ApiError(500, "error fetching playlist");
  return res
    .status(200)
    .json(new ApiResponse(200, "playlist fetched successfully", playlist));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  //check if ids are valid
  if (!playlistId || !isValidObjectId(playlistId.trim())) {
    throw new ApiError(400, "playlistID is invalid");
  }
  if (!videoId || !isValidObjectId(videoId.trim())) {
    throw new ApiError(400, "videoID is invalid");
  }
  //check if playlist exists
  const playlist = await Playlist.findOne({ _id: playlistId });
  if (!playlist) throw new ApiError(400, "playlist doesn't exists");
  //check if video exists && is published
  const videoToAdd = await Video.findOne({ _id: videoId });
  if (!videoToAdd) throw new ApiError(400, "video doesn't exists");
  if (!videoToAdd?.isPublished)
    throw new ApiError(400, "cannot add an unpublished video to playlist");
  //check if current user is the playlist owner
  if (!playlist.owner.equals(req.user?._id))
    throw new ApiError(400, "current user is not the owner of this playlist");
  //check if video already exists
  if (
    playlist.videos.some((existingVideoId) => {
      return existingVideoId.equals(videoToAdd?._id);
    })
  )
    throw new ApiError(400, "this video is already added to playlist");
  //push videoid and Playlist.updateOne($push:[])
  playlist.videos.push(videoToAdd?._id);
  const updatedPlaylist = await playlist.save();
  if (updatedPlaylist !== playlist)
    throw new ApiError(500, "server error while adding video to playlist");
  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        "video added to playlist successfully",
        updatedPlaylist
      )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
  if (!playlistId || !isValidObjectId(playlistId.trim())) {
    throw new ApiError(400, "playlistID is invalid");
  }
  if (!videoId || !isValidObjectId(videoId.trim())) {
    throw new ApiError(400, "videoID is invalid");
  }
  //check if playlist exists
  var playlist = await Playlist.findOne({ _id: playlistId });
  if (!playlist) throw new ApiError(400, "playlist doesn't exists");
  //check if video exists
  const videoToRemove = await Video.findOne({ _id: videoId });
  if (!videoToRemove) throw new ApiError(400, "video doesn't exists");
  //check if current user is the playlist owner
  if (!playlist.owner.equals(req.user?._id))
    throw new ApiError(400, "current user is not the owner of this playlist");
  //check if video already removed
  if (
    playlist.videos.every((existingVideoId) => {
      return !existingVideoId.equals(videoToRemove?._id);
    })
  )
    throw new ApiError(400, "this video is already removed from playlist");
  //remove videoid
  playlist.videos = playlist.videos.filter(
    (videoId) => !videoId.equals(videoToRemove?._id)
  );
  const updatedPlaylist = await playlist.save();
  if (updatedPlaylist !== playlist)
    throw new ApiError(500, "server error while removing video from playlist");
  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        "video removed from playlist successfully",
        updatedPlaylist
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
  if (!playlistId || !isValidObjectId(playlistId.trim())) {
    throw new ApiError(400, "playlistID is invalid");
  }
  var playlistToDelete = await Playlist.findOne({ _id: playlistId });
  if (!playlistToDelete) throw new ApiError(400, "playlist doesn't exists");
  //check if current user is the playlist owner
  if (!playlistToDelete.owner.equals(req.user?._id))
    throw new ApiError(400, "current user is not the owner of this playlist");
  //delete playlist
  const deletionResult = await Playlist.deleteOne({
    _id: playlistToDelete?._id,
  });
  if (deletionResult.deletedCount === 0 || !deletionResult.acknowledged)
    throw new ApiError(500, "Playlist cannot be deleted. Please try again !!");
  return res
    .status(200)
    .json(new ApiResponse(200, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
  if (!playlistId || !isValidObjectId(playlistId.trim())) {
    throw new ApiError(400, "playlistID is invalid");
  }
  var playlistToUpdate = await Playlist.findOne({ _id: playlistId });
  if (!playlistToUpdate) throw new ApiError(400, "playlist doesn't exists");
  //check if current user is the playlist owner
  if (!playlistToUpdate.owner.equals(req.user?._id))
    throw new ApiError(400, "current user is not the owner of this playlist");
  //empty check
  if ([name, description].every((field) => !field || !field?.trim().length))
    throw new ApiError(400, "atleast one field is required for updation");
  //update playlist
  if (name && name.trim().length) playlistToUpdate.name = name;
  if (description && description.trim().length)
    playlistToUpdate.description = description;
  const updatedPlaylist = await playlistToUpdate.save({
    validateBeforeSave: false,
  });
  if (updatedPlaylist !== playlistToUpdate)
    throw new ApiError(500, "error while updating playlist");
  return res
    .status(201)
    .json(
      new ApiResponse(201, "playlist updated successfully", updatedPlaylist)
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
