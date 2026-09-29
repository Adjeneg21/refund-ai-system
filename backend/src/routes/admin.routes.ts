import { Router } from "express";
import {
  handleListRequests,
  handleResolveRequest,
  handleClearRequests,
} from "../controllers/adminController.js";
import { requireAdminToken } from "../security/adminAuth.js";

export const adminRouter = Router();

adminRouter.use(requireAdminToken);

adminRouter.get("/requests", handleListRequests);
adminRouter.post("/requests/:id/resolve", handleResolveRequest);
adminRouter.delete("/requests", handleClearRequests);
