import { Router } from "express";
import {
  handleListCustomers,
  handleListCustomerOrders,
  handleListCustomerRequests,
} from "../controllers/customerController.js";

export const customerRouter = Router();

customerRouter.get("/", handleListCustomers);
customerRouter.get("/:id/orders", handleListCustomerOrders);
customerRouter.get("/:id/refund-requests", handleListCustomerRequests);
