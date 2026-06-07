export type PaymentRecordStatus =
  | "checkout_created"
  | "paid"
  | "failed"
  | "refunded";

export interface PaymentRecord {
  id: string;
  workspaceId: string;
  opportunityId: string;
  campaignId?: string;
  provider: "stripe";
  checkoutSessionId?: string;
  paymentIntentId?: string;
  amount: number;
  currency: string;
  status: PaymentRecordStatus;
  createdAt: string;
  updatedAt: string;
}
