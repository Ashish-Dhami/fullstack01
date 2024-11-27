import { Router } from "express";
import { isLoggedIn } from "../middlewares/auth.middleware.js";
import {
  getChannelStats,
  getChannelVideos,
} from "../controllers/dashboard.controller.js";

const router = Router();

router.use(isLoggedIn);

router.route("/").get(getChannelStats);
router.route("/videos").get(getChannelVideos);

export default router;
