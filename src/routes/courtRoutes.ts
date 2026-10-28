import { Router } from "express";
import { authenticate, requireAdmin } from "../middlewares/auth";
import { listCourts, createCourt, updateCourt } from "../controllers/courtController";

const router = Router();
router.get("/", listCourts);
router.post("/", authenticate, requireAdmin, createCourt);
router.put("/:id", authenticate, requireAdmin, updateCourt);

export default router;