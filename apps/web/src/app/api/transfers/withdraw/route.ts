/**
 * POST /api/transfers/withdraw
 *
 * El usuario convierte MEXCOIN a MXN y lo recibe en su banco vía SPEI.
 *
 * Flujo con Pomelo (modelo balance-authorizer):
 *   ① LEN verifica saldo MEXCOIN en Celo
 *   ② LEN quema MEXCOIN en Celo
 *   ③ Si burn exitoso → LEN ordena SPEI saliente vía API Pomelo (o STP)
 *   ④ Si burn falla   → no se toca nada (el saldo no cambió)
 *   ⑤ Si SPEI falla   → requiere intervención manual (MEXCOIN ya quemado)
 *
 * Nota: Con Pomelo como balance-authorizer, LEN controla el saldo MEXCOIN.
 * El SPEI saliente se orquesta vía Pomelo Transfers o un proveedor STP separado.
 * Por ahora registramos la intención y marcamos como "pending_spei" hasta confirmar.
 */

import { NextRequest, NextResponse } from "next/server";
import { burnMexcoin, getMexcoinBalanceServer } from "@/lib/celo-admin";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/auth";
import type { WithdrawRequest, ApiResponse } from "@/types/pomelo";
import type { Address } from "viem";

const WITHDRAWAL_FEE_PERCENT = 0.003;
const MIN_WITHDRAWAL_MXN = 50;
const MAX_WITHDRAWAL_MXN = 50_000;

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  // ── 1. Autenticación ───────────────────────────────────────────────────────
  const userId = await verifyAuth(req);
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Token de autenticación requerido", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // ── 2. Parsear y validar ───────────────────────────────────────────────────
  let body: WithdrawRequest;
  try {
    body = await req.json() as WithdrawRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body inválido", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const { amount_mxn, destination_clabe, wallet_address } = body;

  if (!amount_mxn || !destination_clabe || !wallet_address) {
    return NextResponse.json(
      { ok: false, error: "amount_mxn, destination_clabe y wallet_address son requeridos", code: "MISSING_FIELDS" },
      { status: 400 }
    );
  }

  if (!/^\d{18}$/.test(destination_clabe)) {
    return NextResponse.json(
      { ok: false, error: "CLABE inválida. Debe tener 18 dígitos", code: "INVALID_CLABE" },
      { status: 400 }
    );
  }

  const amountNum = parseFloat(amount_mxn);
  if (isNaN(amountNum) || amountNum < MIN_WITHDRAWAL_MXN) {
    return NextResponse.json(
      { ok: false, error: `Monto mínimo de retiro: $${MIN_WITHDRAWAL_MXN} MXN`, code: "BELOW_MINIMUM" },
      { status: 422 }
    );
  }

  if (amountNum > MAX_WITHDRAWAL_MXN) {
    return NextResponse.json(
      { ok: false, error: `Monto máximo de retiro: $${MAX_WITHDRAWAL_MXN.toLocaleString()} MXN`, code: "ABOVE_MAXIMUM" },
      { status: 422 }
    );
  }

  // ── 3. Calcular comisión ───────────────────────────────────────────────────
  const fee           = parseFloat((amountNum * WITHDRAWAL_FEE_PERCENT).toFixed(2));
  const amountAfterFee = parseFloat((amountNum - fee).toFixed(2));
  const withdrawalRef  = `WD-${userId}-${Date.now()}`;

  // ── 4. Verificar saldo MEXCOIN ─────────────────────────────────────────────
  let balance: string;
  try {
    balance = await getMexcoinBalanceServer(wallet_address as Address);
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo verificar el saldo", code: "BALANCE_CHECK_FAILED" },
      { status: 500 }
    );
  }

  if (parseFloat(balance) < amountNum) {
    return NextResponse.json(
      { ok: false, error: `Saldo insuficiente. Disponible: ${balance} MEXCOIN`, code: "INSUFFICIENT_BALANCE" },
      { status: 422 }
    );
  }

  // ── 5. Quemar MEXCOIN en Celo ──────────────────────────────────────────────
  let txHash: string;
  try {
    txHash = await burnMexcoin(
      wallet_address as Address,
      amountNum.toFixed(2),
      `WITHDRAW:${withdrawalRef}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error(`[withdraw] Error quemando MEXCOIN:`, message);
    return NextResponse.json(
      { ok: false, error: `Error en blockchain: ${message}`, code: "BURN_FAILED" },
      { status: 500 }
    );
  }

  // ── 6. Registrar retiro pendiente de SPEI ─────────────────────────────────
  // MEXCOIN quemado. El SPEI saliente se procesa de forma asíncrona
  // (Pomelo Transfers API o STP directo). El status cambia a "spei_sent"
  // cuando el proveedor confirma la transferencia.
  const db = getAdminDb();
  await db.collection("len_transactions").doc(txHash).set({
    type:                 "withdrawal",
    user_id:              userId,
    wallet_address,
    amount_mxn:           amountNum.toFixed(2),
    fee_mxn:              fee.toFixed(2),
    amount_after_fee_mxn: amountAfterFee.toFixed(2),
    mexcoin_burned:       amountNum.toFixed(2),
    destination_clabe,
    celo_tx_hash:         txHash,
    reference:            withdrawalRef,
    spei_status:          "pending",
    status:               "processing",
    created_at:           new Date(),
  });

  // TODO: encolar trabajo para enviar SPEI vía Pomelo/STP
  // await queueSpeiTransfer({ txHash, userId, amountAfterFee, destination_clabe, withdrawalRef });

  console.log(
    `[withdraw] ✓ ${amountNum.toFixed(2)} MEXCOIN quemado | ` +
    `SPEI pendiente: ${amountAfterFee.toFixed(2)} MXN → CLABE: ${destination_clabe.slice(0, 6)}... | ` +
    `tx: ${txHash}`
  );

  return NextResponse.json({
    ok: true,
    data: {
      mexcoin_burned:       amountNum.toFixed(2),
      amount_mxn:           amountNum.toFixed(2),
      fee_mxn:              fee.toFixed(2),
      amount_received_mxn:  amountAfterFee.toFixed(2),
      destination_clabe:    `${destination_clabe.slice(0, 6)}...${destination_clabe.slice(-4)}`,
      celo_tx_hash:         txHash,
      spei_status:          "processing",
      reference:            withdrawalRef,
      message:              "MEXCOIN quemado. SPEI en procesamiento (1-2 días hábiles).",
    },
  });
}
