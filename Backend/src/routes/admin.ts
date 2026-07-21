import { Router } from "express";
import {
  approvePattern,
  freezeUser,
  getInfraStatus,
  getKpis,
  listAuditLogs,
  listPatternsForModeration,
  listUsers,
  purgeUser,
  rejectPattern,
  restoreUser,
} from "../controllers/adminController";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAdmin, requireAuth } from "../middleware/requireAuth";

export const adminRouter = Router();

adminRouter.use(requireAuth, asyncHandler(requireAdmin));

adminRouter.get("/kpis", asyncHandler(getKpis));

adminRouter.get("/users", asyncHandler(listUsers));
adminRouter.post("/users/:id/freeze", asyncHandler(freezeUser));
adminRouter.post("/users/:id/restore", asyncHandler(restoreUser));
adminRouter.post("/users/:id/purge", asyncHandler(purgeUser));

adminRouter.get("/patterns", asyncHandler(listPatternsForModeration));
adminRouter.post("/patterns/:id/approve", asyncHandler(approvePattern));
adminRouter.post("/patterns/:id/reject", asyncHandler(rejectPattern));

adminRouter.get("/infra", asyncHandler(getInfraStatus));
adminRouter.get("/audit-logs", asyncHandler(listAuditLogs));
