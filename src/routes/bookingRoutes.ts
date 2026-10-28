import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { createBooking, listMyBookings, cancelBooking } from "../controllers/bookingController";

const router = Router();
router.post("/", authenticate, createBooking);
router.get("/me", authenticate, listMyBookings);
router.patch("/:id/cancel", authenticate, cancelBooking);

export default router;