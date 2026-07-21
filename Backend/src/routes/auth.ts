import { Router } from "express";
import { login, logout, me, register } from "../controllers/authController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/requireAuth";

export const authRouter = Router();

authRouter.post("/register", asyncHandler(register));
authRouter.post("/login", asyncHandler(login));
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, asyncHandler(me));
