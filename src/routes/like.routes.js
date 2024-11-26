import { Router } from "express";
import { isLoggedIn } from "../middlewares/auth.middleware.js";
import {
  getLikedVideos,
  toggleVideoLike,
  toggleCommentLike,
  toggleTweetLike,
} from "../controllers/like.controller.js";

const router = Router();

router.use(isLoggedIn);

router.route("/").get(getLikedVideos);
router.route("/v/:videoId").post(toggleVideoLike);
router.route("/c/:commentId").post(toggleCommentLike);
router.route("/t/:tweetId").post(toggleTweetLike);

export default router;
