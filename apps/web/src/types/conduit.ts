/**
 * Conduit API types
 * Docs: https://docs.conduit.financial
 *
 * Conduit uses stablecoin rails (USDC/USDT) bridged with fiat in/out.
 * For LEN: USA cash-in/wire → USDC → mint MEXCOIN on Celo on the user side.
 */

// ── Currencies and assets ────────────────────────────────────────────────────

export type ConduitFiatCurrency = "USD" | "EUR" | "GBP" | "BRL" | "MXN" | "COP";
export type ConduitStablecoin   = "USDC" | "USDT" | "DAI";
export type ConduitNetwork      = "ethereum" | "polygon" | "celo" | "tron" | "solana" | "base";

// ── Account ──────────────────────────────────────────────────────────────────

export interface ConduitBalance {
  asset:   string;
  amount:  string;
  network: ConduitNetwork | null;
}

export interface ConduitAccount {
  id:        string;
  name:      string;
  balances:  ConduitBalance[];
  created_at: string;
}

// ── Quotes (FX + spread) ─────────────────────────────────────────────────────

export type ConduitPricingModel = "take_rate" | "fixed_spread";

export interface ConduitQuote {
  id:              string;
  source_asset:    string;
  destination_asset: string;
  source_amount:   string;
  destination_amount: string;
  effective_rate:  string;
  spread_bps:      number;
  pricing_model:   ConduitPricingModel;
  expires_at:      string;
}

// ── Payin / Deposit (cash-in USA) ────────────────────────────────────────────

export type ConduitPayinMethod =
  | "ach_credit"
  | "wire"
  | "swift"
  | "fedwire"
  | "cash_pickup";

export type ConduitTransferStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "rejected"
  | "refunded";

export interface ConduitPayin {
  id:              string;
  customer_id:     string;
  account_id:      string;
  method:          ConduitPayinMethod;
  source_amount:   string;
  source_currency: ConduitFiatCurrency;
  destination_amount: string;
  destination_asset:  ConduitStablecoin;
  status:          ConduitTransferStatus;
  reference:       string | null;
  sender_name?:    string;
  sender_account?: string;
  created_at:      string;
  completed_at?:   string;
}

// ── Payout (LATAM off-ramp) ──────────────────────────────────────────────────

export type ConduitPayoutMethod =
  | "spei"          // Mexico
  | "pix"           // Brasil
  | "ach"           // USA
  | "sepa"          // Europa
  | "wire";

export interface ConduitPayoutRequest {
  customer_id:        string;
  source_amount:      string;
  source_asset:       ConduitStablecoin;
  source_network:     ConduitNetwork;
  destination_currency: ConduitFiatCurrency;
  destination_method: ConduitPayoutMethod;
  beneficiary: {
    name:            string;
    account_number?: string;       // CLABE for SPEI, IBAN for SEPA, etc.
    bank_code?:      string;
    document_id?:    string;       // CURP/RFC for MX, CPF/CNPJ for BR
    email?:          string;
  };
  reference?: string;
}

export interface ConduitPayout {
  id:              string;
  customer_id:     string;
  source_amount:   string;
  source_asset:    ConduitStablecoin;
  destination_amount:   string;
  destination_currency: ConduitFiatCurrency;
  destination_method:   ConduitPayoutMethod;
  status:          ConduitTransferStatus;
  reference:       string | null;
  created_at:      string;
  completed_at?:   string;
}

// ── Webhook events ───────────────────────────────────────────────────────────
// Nombres confirmados desde el dashboard de Conduit (categoría.evento).

export type ConduitTransactionEvent =
  | "transaction.created"
  | "transaction.compliance_approved"
  | "transaction.compliance_rejected"
  | "transaction.completed"
  | "transaction.awaiting_funds"
  | "transaction.funds_received"
  | "transaction.cancelled"
  | "transaction.in_compliance_review"
  | "transaction.processing_withdrawal"
  | "transaction.withdrawal_processed"
  | "transaction.processing_settlement"
  | "transaction.settlement_processed"
  | "transaction.processing_payment"
  | "transaction.payment_processed";

export type ConduitCustomerEvent =
  | "customer.active"
  | "customer.in_compliance_review"
  | "customer.compliance_rejected"
  | "customer.created"
  | "customer.kyb_in_progress"
  | "customer.kyb_expired"
  | "customer.kyb_missing_information"
  | "customer.account_onboarding_pending";

export type ConduitEventName = ConduitTransactionEvent | ConduitCustomerEvent;

/**
 * Estructura confirmada del payload (docs.conduit.financial):
 *   {
 *     event:           "transaction.completed",
 *     version:         "1.0",
 *     event_timestamp: "2026-05-12T...",
 *     event_sequence:  123,           ← usar como idempotency key
 *     data: { ... }                   ← contenido del recurso (Transaction o Customer)
 *   }
 */
export interface ConduitWebhookEvent<T = unknown> {
  event:           ConduitEventName;
  version:         string;
  event_timestamp: string;
  event_sequence:  number;
  data:            T;
}

export type ConduitTransactionWebhook = ConduitWebhookEvent<ConduitPayin | ConduitPayout>;
export type ConduitCustomerWebhook    = ConduitWebhookEvent<{ id: string; status: string; [k: string]: unknown }>;

// ── API responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  ok:    boolean;
  data?: T;
  error?: string;
  code?:  string;
}
