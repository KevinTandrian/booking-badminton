import { Router } from "express";
import { authenticate, requireAdmin } from "../middlewares/auth";
import { listCourts, createCourt, updateCourt } from "../controllers/courtController";
import { getSchedule } from "../controllers/bookingController";

const router = Router();
router.get("/", listCourts);
router.post("/", authenticate, requireAdmin, createCourt);
router.put("/:id", authenticate, requireAdmin, updateCourt);
router.get("/:id/schedule", getSchedule);

export default router;
