/**
 * Tipos para la integración con Pomelo API
 * Documentación: https://developers.pomelo.la
 *
 * Pomelo usa un modelo "balance authorizer":
 *   - Cuando el usuario paga con tarjeta LEN, Pomelo llama a LEN EN TIEMPO REAL
 *   - LEN debe aprobar o rechazar en < 5 segundos (o Pomelo auto-rechaza)
 *   - LEN controla el saldo (MEXCOIN), Pomelo controla la tarjeta física
 */

// ── OAuth 2.0 ─────────────────────────────────────────────────────────────────

export interface PomeloTokenResponse {
  access_token: string;
  scope:        string;
  expires_in:   number;   // segundos, típicamente 86400
  token_type:   "Bearer";
}

// ── Webhooks: headers de seguridad ───────────────────────────────────────────

export interface PomeloWebhookHeaders {
  "x-api-key":   string;   // identifica el par de credenciales
  "x-signature": string;   // HMAC-SHA256 de (timestamp + endpoint + body)
  "x-timestamp": string;   // Unix epoch en segundos
  "x-endpoint":  string;   // endpoint destino usado en la firma
}

// ── Autorización en tiempo real ───────────────────────────────────────────────
// Pomelo llama a POST /api/pomelo/authorize cuando el usuario paga con tarjeta.
// LEN debe responder con approve/reject + firma en < 5 segundos.

export type PomeloTransactionType =
  | "PURCHASE"           // Compra normal
  | "WITHDRAWAL"         // Retiro en cajero
  | "REFUND"             // Devolución (crédito al usuario)
  | "REVERSAL"           // Reversal de autorización
  | "BALANCE_INQUIRY";   // Consulta de saldo

export type PomeloTransactionStatus =
  | "APPROVED"
  | "REJECTED";

export type PomeloRejectionReason =
  | "INSUFFICIENT_FUNDS"
  | "INVALID_CARD"
  | "CARD_BLOCKED"
  | "SYSTEM_ERROR"
  | "LIMIT_EXCEEDED";

export interface PomeloTransactionRequest {
  transaction: {
    id:              string;      // ID único de la transacción Pomelo
    local_date_time: string;      // ISO 8601
    type:            PomeloTransactionType;
    origin:          "POMELO" | "MANUAL";
    source_type:     "CARD";
  };
  card: {
    id:          string;          // ID de la tarjeta en Pomelo
    product_type: "PREPAID" | "CREDIT" | "DEBIT";
    status:      string;
  };
  user: {
    id:    string;                // ID del usuario en Pomelo
    name:  string;
  };
  amount: {
    local:    number;             // Monto en centavos (moneda local del comercio)
    local_currency:  string;      // ISO 4217, ej. "MXN"
    settlements: number;          // Monto en centavos (moneda de liquidación)
    settlements_currency: string; // ISO 4217, ej. "MXN"
    transaction: number;          // Monto en centavos (moneda de la tx)
    transaction_currency: string; // ISO 4217
    fees: number;                 // Comisiones en centavos
  };
  merchant: {
    id:          string;
    mcc:         string;          // Merchant Category Code
    address:     string;
    name:        string;
    country:     string;          // ISO 3166-1 alpha-3
  };
  origin_country: string;
}

export interface PomeloTransactionResponse {
  status:  PomeloTransactionStatus;
  message: PomeloRejectionReason | null;
}

// ── Notificaciones post-autorización ─────────────────────────────────────────
// POST /transactions/v1/notifications — Pomelo llama a LEN después de resolver la tx.
// event_id "authorization-advice"          → transacción rechazada (informativo)
// event_id "approved-authorization-advice" → transacción aprobada → LEN quema MEXCOIN

export type PomeloNotificationEventId =
  | "authorization-advice"           // tx rechazada (por LEN, Pomelo o Mastercard)
  | "approved-authorization-advice"; // tx aprobada y confirmada → burn MEXCOIN

export interface PomeloTransactionNotification {
  event_id:        PomeloNotificationEventId;
  idempotency_key: string;           // usar como ID idempotente
  event_detail: {
    transaction: {
      id:       string;
      type:     PomeloTransactionType;
      status:   PomeloTransactionStatus;
    };
    card: {
      id:       string;
    };
    user: {
      id:       string;
    };
    amount: {
      local:             number;     // centavos moneda local
      local_currency:    string;     // "MXN"
      settlements:       number;
      fees:              number;
    };
    merchant: {
      name:     string;
      id:       string;
      country:  string;
    };
  };
}

// ── Ajustes (Adjustments) ─────────────────────────────────────────────────────
// POST /transactions/adjustments/{type} — Reversals, créditos/débitos forzados.
// No se pueden rechazar — siempre son efectivos.

export interface PomeloAdjustmentRequest {
  transaction: {
    id:              string;
    type:            PomeloTransactionType;
    origin:          string;
    point_type:      string;
    local_date_time: string;
  };
  merchant:    PomeloTransactionRequest["merchant"];
  card:        PomeloTransactionRequest["card"];
  user:        PomeloTransactionRequest["user"];
  amount:      PomeloTransactionRequest["amount"];
}

// ── Activities webhook ────────────────────────────────────────────────────────
// Pomelo llama a LEN cuando hay cambios en cuentas digitales (depósitos SPEI, etc.)

export type PomeloActivityEventType =
  | "ACTIVITY_CREATED"
  | "ACTIVITY_UPDATED"
  | "ACTIVITY_DELETED";

export interface PomeloActivityNotification {
  activity:        Record<string, unknown>;  // estructura varía por tipo
  datetime:        string;
  idempotency_key: string;
  type:            PomeloActivityEventType;
  version:         string;
}

// ── Requests del cliente a LEN ────────────────────────────────────────────────

export interface TransferRequest {
  from_address: string;
  to_address:   string;
  amount_mxn:   string;
  token:        string;
}

export interface WithdrawRequest {
  user_id:           string;
  amount_mxn:        string;
  destination_clabe: string;
  wallet_address:    string;
}

// ── Respuestas API LEN ────────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  ok:   true;
  data: T;
}

export interface ApiError {
  ok:    false;
  error: string;
  code:  string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;
