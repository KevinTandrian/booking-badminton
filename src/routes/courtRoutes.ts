import { Router } from "express";
import { authenticate, requireAdmin } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { createCourtSchema, updateCourtSchema } from "../schemas";
import { listCourts, createCourt, updateCourt } from "../controllers/courtController";
import { getSchedule } from "../controllers/bookingController";

const router = Router();
router.get("/", listCourts);
router.get("/:id/schedule", getSchedule);
router.post("/", authenticate, requireAdmin, validate(createCourtSchema), createCourt);
router.put("/:id", authenticate, requireAdmin, validate(updateCourtSchema), updateCourt);

export default router;