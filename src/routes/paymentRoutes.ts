import { Router } from "express";
import { handleMidtransWebhook, simulatePaymentSuccess } from "../controllers/paymentController";

const router = Router();

// Webhook resmi dari Midtrans (publik)
router.post("/webhook", handleMidtransWebhook);

// Endpoint simulasi bayar instan untuk portofolio / testing
router.post("/simulate/:orderId", simulatePaymentSuccess);

export default router;

