import { Router } from "express";
import {
  cancelAccountDeletion,
  deletePaymentMethod,
  requestAccountDeletion,
} from "../controllers/userController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/requireAuth";

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.delete("/payment-methods/:id", asyncHandler(deletePaymentMethod));
userRouter.post("/request-deletion", asyncHandler(requestAccountDeletion));
userRouter.post("/cancel-deletion", asyncHandler(cancelAccountDeletion));
