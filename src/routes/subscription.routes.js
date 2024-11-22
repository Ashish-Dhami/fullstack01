import { Router } from "express";
import { isLoggedIn } from "../middlewares/auth.middleware.js";
import {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
} from "../controllers/subscription.controller.js";

//declaration
const router = Router();

//middlewares
router.use(isLoggedIn);

//actual routing
router.route("/:channelId/toggleSub").post(toggleSubscription);
router.route("/:channelId/subscribers").get(getUserChannelSubscribers);
router.route("/:subscriberId/subscribedTo").get(getSubscribedChannels);

export default router;
