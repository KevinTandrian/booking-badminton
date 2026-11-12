import crypto from "crypto";

export interface MidtransTransactionParams {
    orderId: string;
    grossAmount: number;
    customerName: string;
    customerEmail: string;
    itemName: string;
}

export interface SnapTransactionResult {
    token: string;
    redirectUrl: string;
    isSimulated: boolean;
}

export class MidtransService {
    private static serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    private static isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

    private static get snapUrl(): string {
        return this.isProduction
            ? "https://app.midtrans.com/snap/v1/transactions"
            : "https://app.sandbox.midtrans.com/snap/v1/transactions";
    }

    /**
     * Membuat Snap Transaction Token dari Midtrans
     */
    static async createTransaction(params: MidtransTransactionParams): Promise<SnapTransactionResult> {
        // Jika server key belum diisi, gunakan mode simulasi sandbox otomatis untuk portofolio
        if (!this.serverKey || this.serverKey.trim() === "" || this.serverKey.includes("isi_server_key")) {
            console.log(`[Midtrans Simulator] Server Key tidak ditemukan. Menggunakan mode simulasi untuk order: ${params.orderId}`);
            return {
                token: `simulated-snap-${params.orderId}-${Date.now()}`,
                redirectUrl: `https://app.sandbox.midtrans.com/snap/v2/vtweb/simulated`,
                isSimulated: true,
            };
        }

        const authHeader = Buffer.from(`${this.serverKey}:`).toString("base64");

        const payload = {
            transaction_details: {
                order_id: params.orderId,
                gross_amount: Math.round(params.grossAmount),
            },
            customer_details: {
                first_name: params.customerName,
                email: params.customerEmail,
            },
            item_details: [
                {
                    id: params.orderId,
                    price: Math.round(params.grossAmount),
                    quantity: 1,
                    name: params.itemName.slice(0, 50),
                },
            ],
            callbacks: {
                finish: `${process.env.FRONTEND_URL ?? "http://localhost:5173"}/?payment_finish=1`,
            },
        };

        const response = await fetch(this.snapUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Basic ${authHeader}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`Gagal membuat transaksi Midtrans: ${JSON.stringify(errData)}`);
        }

        const data = (await response.json()) as { token: string; redirect_url: string };
        return {
            token: data.token,
            redirectUrl: data.redirect_url,
            isSimulated: false,
        };
    }

    /**
     * Memvalidasi signature webhook dari Midtrans
     * Format Midtrans: SHA512(order_id + status_code + gross_amount + ServerKey)
     */
    static verifySignature(orderId: string, statusCode: string, grossAmount: string, signatureKey: string): boolean {
        if (!this.serverKey) return true; // jika mode simulasi

        const input = `${orderId}${statusCode}${grossAmount}${this.serverKey}`;
        const hash = crypto.createHash("sha512").update(input).digest("hex");
        return hash === signatureKey;
    }
}

