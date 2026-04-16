/**
 * Tipos para la integración con Cuenca API
 * Documentación: https://docs.cuenca.com
 * Sandbox: https://sandbox.cuenca.com
 */

// ── Eventos de webhook que Cuenca envía ──────────────────────────────────────

export type CuencaWebhookEventType =
  | "transaction.deposit.completed"   // SPEI recibido → mintear MEXCOIN
  | "transaction.deposit.failed"
  | "card.payment.completed"          // Pago con tarjeta → quemar MEXCOIN
  | "card.payment.reversed"
  | "transaction.withdrawal.completed"
  | "transaction.withdrawal.failed";

export interface CuencaWebhookEvent {
  id:         string;                  // ID único del evento (para idempotencia)
  type:       CuencaWebhookEventType;
  created_at: string;                  // ISO 8601
  data:       CuencaDepositData | CuencaCardPaymentData | CuencaWithdrawalData;
}

// ── Depósito SPEI ─────────────────────────────────────────────────────────────

export interface CuencaDepositData {
  transaction_id:  string;
  user_id:         string;             // ID del usuario en Cuenca
  amount:          number;             // En centavos MXN (ej. 10000 = $100.00 MXN)
  currency:        "MXN";
  clabe:           string;             // CLABE destino del usuario
  sender_name:     string;
  sender_clabe:    string;
  reference:       string;
  status:          "completed" | "failed";
  completed_at:    string;
}

// ── Pago con tarjeta ──────────────────────────────────────────────────────────

export interface CuencaCardPaymentData {
  payment_id:      string;
  user_id:         string;
  card_id:         string;
  amount:          number;             // En centavos MXN
  currency:        "MXN";
  merchant_name:   string;
  merchant_id:     string;
  status:          "completed" | "reversed";
  completed_at:    string;
}

// ── Retiro SPEI ───────────────────────────────────────────────────────────────

export interface CuencaWithdrawalData {
  withdrawal_id:   string;
  user_id:         string;
  amount:          number;             // En centavos MXN
  currency:        "MXN";
  destination_clabe: string;
  status:          "completed" | "failed";
  completed_at:    string;
}

// ── Request del cliente a LEN ─────────────────────────────────────────────────

export interface TransferRequest {
  from_address: string;               // Wallet Celo del remitente
  to_address:   string;               // Wallet Celo del destinatario
  amount_mxn:   string;               // Ej. "100.00"
  token:        string;               // signature del frontend
}

export interface WithdrawRequest {
  user_id:           string;
  amount_mxn:        string;          // Ej. "100.00"
  destination_clabe: string;
  wallet_address:    string;          // Wallet Celo del usuario
}

// ── Respuestas LEN API ────────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  ok:   true;
  data: T;
}

export interface ApiError {
  ok:      false;
  error:   string;
  code:    string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;
