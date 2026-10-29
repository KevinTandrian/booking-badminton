import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { createBookingSchema } from "../schemas";
import { createBooking, listMyBookings, cancelBooking } from "../controllers/bookingController";

const router = Router();
router.post("/", authenticate, validate(createBookingSchema), createBooking);
router.get("/me", authenticate, listMyBookings);
router.patch("/:id/cancel", authenticate, cancelBooking);

export default router;