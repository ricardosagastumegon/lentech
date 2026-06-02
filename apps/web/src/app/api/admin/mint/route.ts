/**
 * POST /api/admin/mint
 *
 * Endpoint para mint manual desde el panel admin.
 * Se usa cuando llega un depósito a la cuenta bancaria de LEN (Banrural / BAC / etc.)
 * y el admin lo registra manualmente para mintear el token correspondiente.
 *
 * Auth: Bearer LEN_ADMIN_API_KEY
 *
 * Body:
 *   {
 *     country:        "MX" | "GT" | "HN",
 *     wallet:         "0x..." (address del receptor),
 *     gross_amount:   "5000.00" (monto bruto depositado en moneda local),
 *     bank_reference: "Banrural-tx-123" (id del depósito bancario),
 *     notes?:         "comentario opcional"
 *   }
 *
 * Flujo:
 *   1. Verifica auth admin
 *   2. Lee regla de comisión deposit_<country>
 *   3. Calcula: net_amount = gross - fee
 *   4. Mintea NET a wallet del usuario
 *   5. Mintea FEE distribuido a wallets de beneficiarios
 *   6. Registra todo en len_transactions y len_admin_mints
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { mintToken, getTokenForCountry, type TokenSymbol } from "@/lib/celo-admin";
import { getCommissionRule, calculateCommission, type CommissionCountry } from "@/lib/commission-config";
import { getAdminDb } from "@/lib/firebase-admin";
import type { Address } from "viem";

interface MintRequest {
  country:        "MX" | "GT" | "HN";
  wallet:         string;
  gross_amount:   string;     // string para evitar floating point issues
  bank_reference: string;
  notes?:         string;
}

interface ApiResponse {
  ok:    boolean;
  data?: unknown;
  error?: string;
  code?:  string;
}

const VALID_COUNTRIES: CommissionCountry[] = ["MX", "GT", "HN"];

function isValidAddress(addr: string): addr is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  if (!verifyAdminAuth(req)) {
    return NextResponse.json(
      { ok: false, error: "No autorizado", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  // ── 2. Parsear y validar body ────────────────────────────────────────────
  let body: MintRequest;
  try {
    body = await req.json() as MintRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body inválido", code: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const { country, wallet, gross_amount, bank_reference, notes } = body;

  if (!country || !wallet || !gross_amount || !bank_reference) {
    return NextResponse.json(
      { ok: false, error: "Campos requeridos: country, wallet, gross_amount, bank_reference", code: "MISSING_FIELDS" },
      { status: 400 },
    );
  }

  if (!VALID_COUNTRIES.includes(country)) {
    return NextResponse.json(
      { ok: false, error: `País no soportado: ${country}`, code: "INVALID_COUNTRY" },
      { status: 400 },
    );
  }

  if (!isValidAddress(wallet)) {
    return NextResponse.json(
      { ok: false, error: "Wallet inválida (formato 0x + 40 hex)", code: "INVALID_WALLET" },
      { status: 400 },
    );
  }

  const grossNum = parseFloat(gross_amount);
  if (isNaN(grossNum) || grossNum <= 0) {
    return NextResponse.json(
      { ok: false, error: "gross_amount inválido", code: "INVALID_AMOUNT" },
      { status: 400 },
    );
  }

  // ── 3. Calcular comisión + splits ────────────────────────────────────────
  const rule = await getCommissionRule("deposit", country);
  const calc = calculateCommission(rule, grossNum);

  if (calc.net_amount <= 0) {
    return NextResponse.json(
      { ok: false, error: "Monto neto debe ser > 0 después de comisión", code: "AMOUNT_TOO_LOW" },
      { status: 422 },
    );
  }

  // ── 4. Idempotencia: evitar mint duplicado con misma bank_reference ──────
  const db          = getAdminDb();
  const mintRefId   = `manual-${country}-${bank_reference}`;
  const mintDocRef  = db.collection("len_admin_mints").doc(mintRefId);
  const existing    = await mintDocRef.get();
  if (existing.exists) {
    return NextResponse.json({
      ok:    false,
      error: `Ya se procesó un mint con referencia "${bank_reference}" en ${country}. Ver tx: ${existing.data()?.user_tx_hash}`,
      code:  "DUPLICATE_REFERENCE",
    }, { status: 409 });
  }

  const token: TokenSymbol = getTokenForCountry(country);
  const txRef              = `MANUAL:${country}:${bank_reference}`;

  // ── 5. Mintear NET al usuario ────────────────────────────────────────────
  let userTxHash: string;
  try {
    userTxHash = await mintToken(token, wallet as Address, calc.net_amount.toFixed(2), txRef);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error(`[admin/mint] Error minteando ${token} a ${wallet}:`, message);
    return NextResponse.json(
      { ok: false, error: `Error en blockchain: ${message}`, code: "MINT_USER_FAILED" },
      { status: 500 },
    );
  }

  // ── 6. Mintear FEE a beneficiarios (splits) ──────────────────────────────
  const splitResults: Array<{ recipient_id: string; wallet: string; amount: number; tx_hash: string | null; error?: string }> = [];

  for (const split of calc.split_breakdown) {
    if (!split.wallet_celo || !isValidAddress(split.wallet_celo)) {
      // Sin wallet configurada → skip pero log
      splitResults.push({
        recipient_id: split.recipient_id,
        wallet:       split.wallet_celo,
        amount:       split.amount,
        tx_hash:      null,
        error:        "Wallet no configurada o inválida",
      });
      continue;
    }
    if (split.amount <= 0) continue;

    try {
      const feeTxHash = await mintToken(
        token,
        split.wallet_celo as Address,
        split.amount.toFixed(2),
        `${txRef}:FEE:${split.recipient_id}`,
      );
      splitResults.push({
        recipient_id: split.recipient_id,
        wallet:       split.wallet_celo,
        amount:       split.amount,
        tx_hash:      feeTxHash,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      console.error(`[admin/mint] Error minteando fee a ${split.recipient_id}:`, message);
      splitResults.push({
        recipient_id: split.recipient_id,
        wallet:       split.wallet_celo,
        amount:       split.amount,
        tx_hash:      null,
        error:        message,
      });
    }
  }

  // ── 7. Registrar en Firestore (idempotency + audit + transaction log) ────
  await Promise.all([
    mintDocRef.set({
      mint_id:        mintRefId,
      type:           "manual_deposit",
      country,
      token,
      user_wallet:    wallet,
      gross_amount:   calc.gross_amount.toFixed(2),
      fee_amount:     calc.fee_amount.toFixed(2),
      net_amount:     calc.net_amount.toFixed(2),
      fee_percent:    calc.fee_percent_used,
      bank_reference,
      notes:          notes ?? null,
      user_tx_hash:   userTxHash,
      split_results:  splitResults,
      created_at:     new Date(),
    }),
    db.collection("len_transactions").doc(userTxHash).set({
      type:           "deposit_manual",
      source:         "admin_panel",
      country,
      token,
      user_wallet:    wallet,
      gross_amount:   calc.gross_amount.toFixed(2),
      fee_amount:     calc.fee_amount.toFixed(2),
      net_amount:     calc.net_amount.toFixed(2),
      bank_reference,
      celo_tx_hash:   userTxHash,
      mint_id:        mintRefId,
      status:         "completed",
      created_at:     new Date(),
    }),
  ]);

  console.log(
    `[admin/mint] ✓ ${country} ${calc.gross_amount} → ${calc.net_amount} ${token} ` +
    `a ${wallet} | ref: ${bank_reference} | tx: ${userTxHash}`,
  );

  return NextResponse.json({
    ok: true,
    data: {
      mint_id:       mintRefId,
      country,
      token,
      user_wallet:   wallet,
      gross_amount:  calc.gross_amount.toFixed(2),
      fee_amount:    calc.fee_amount.toFixed(2),
      net_amount:    calc.net_amount.toFixed(2),
      fee_percent:   calc.fee_percent_used,
      user_tx_hash:  userTxHash,
      splits:        splitResults,
    },
  });
}
