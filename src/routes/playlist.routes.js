import { Router } from "express";
import { isLoggedIn } from "../middlewares/auth.middleware.js";
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getUserPlaylists,
  removeVideoFromPlaylist,
  updatePlaylist,
} from "../controllers/playlist.controller.js";

const router = Router();
router.use(isLoggedIn);

router.route("/create").post(createPlaylist);
router.route("/user/:userId").get(getUserPlaylists);
router
  .route("/:playlistId")
  .get(getPlaylistById)
  .delete(deletePlaylist)
  .patch(updatePlaylist);
router.route("/add/:videoId/:playlistId").patch(addVideoToPlaylist);
router.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist);

export default router;
