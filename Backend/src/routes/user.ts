import { Router } from "express";
import {
  cancelAccountDeletion,
  deletePaymentMethod,
  requestAccountDeletion,
} from "../controllers/userController";
import { asyncHandler } from "../middleware/asyncHandler";

export const userRouter = Router();

userRouter.delete("/payment-methods/:id", asyncHandler(deletePaymentMethod));
userRouter.post("/request-deletion", asyncHandler(requestAccountDeletion));
userRouter.post("/cancel-deletion", asyncHandler(cancelAccountDeletion));
