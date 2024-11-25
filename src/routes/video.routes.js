import { Router } from "express";
import { isLoggedIn } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideo,
} from "../controllers/video.controller.js";

const router = Router();
router.use(isLoggedIn);
router.route("/all").get(getAllVideos);
router
  .route("/publish")
  .post(
    upload.fields([{ name: "video" }, { name: "thumbnail" }]),
    publishAVideo
  );
router
  .route("/:videoId")
  .get(getVideoById)
  .patch(upload.single("thumbnail"), updateVideo)
  .delete(deleteVideo);
router.route("/togglePublish/:videoId").patch(togglePublishStatus);

export default router;
