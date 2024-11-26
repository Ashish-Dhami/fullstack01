import { Router } from "express";
import { isLoggedIn } from "../middlewares/auth.middleware.js";
import { isCommentOwner } from "../middlewares/ownerCheck.middleware.js";
import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller.js";

const router = Router();

router.route("/:videoId").post(isLoggedIn, addComment).get(getVideoComments);
router
  .route("/:commentId")
  .patch(isLoggedIn, isCommentOwner, updateComment)
  .delete(isLoggedIn, isCommentOwner, deleteComment);

export default router;
