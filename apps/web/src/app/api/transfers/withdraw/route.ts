/**
 * POST /api/transfers/withdraw
 *
 * El usuario quiere convertir MEXCOIN de vuelta a MXN y recibirlo en su banco.
 *
 * Flujo (con manejo de errores y rollback):
 *   ① LEN verifica saldo MEXCOIN del usuario
 *   ② LEN bloquea fondos en Cuenca (hold) — previene double-spend
 *   ③ LEN quema MEXCOIN en Celo
 *   ④ Si burn exitoso → LEN ordena SPEI saliente a Cuenca
 *   ⑤ Si burn falla   → LEN libera el hold en Cuenca
 *   ⑥ Registra transacción en Firestore
 *
 * Este orden garantiza que nunca se quema MEXCOIN sin enviar el SPEI.
 */

import { NextRequest, NextResponse } from "next/server";
import { burnMexcoin, getMexcoinBalanceServer } from "@/lib/celo-admin";
import { sendWithdrawal, holdFunds, releaseHold } from "@/lib/cuenca-client";
import { getDb } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import type { WithdrawRequest, ApiResponse } from "@/types/cuenca";
import type { Address } from "viem";

// ── Comisión de retiro ────────────────────────────────────────────────────────
const WITHDRAWAL_FEE_PERCENT = 0.003;  // 0.3% — misma que el pitch

// ── Límites ───────────────────────────────────────────────────────────────────
const MIN_WITHDRAWAL_MXN = 50;         // $50 MXN mínimo
const MAX_WITHDRAWAL_MXN = 50_000;     // $50,000 MXN por transacción

// ── Autenticación ─────────────────────────────────────────────────────────────
function extractUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const payload = auth.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
    return decoded.sub ?? decoded.user_id ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  // ── 1. Autenticación ───────────────────────────────────────────────────────
  const userId = extractUserId(req);
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Token de autenticación requerido", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // ── 2. Parsear y validar request ───────────────────────────────────────────
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

  // Validar formato CLABE (18 dígitos)
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
  const fee = parseFloat((amountNum * WITHDRAWAL_FEE_PERCENT).toFixed(2));
  const amountAfterFee = parseFloat((amountNum - fee).toFixed(2));
  const amountCents = Math.round(amountAfterFee * 100); // Cuenca usa centavos

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

  const withdrawalRef = `WD-${userId}-${Date.now()}`;

  // ── 5. Hold en Cuenca (bloquear fondos fiat) ───────────────────────────────
  let holdId: string | null = null;
  try {
    const hold = await holdFunds({
      user_id:      userId,
      amount_cents: amountCents,
      reference:    withdrawalRef,
    });
    holdId = hold.hold_id;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error(`[withdraw] Error creando hold en Cuenca:`, message);
    return NextResponse.json(
      { ok: false, error: `Error en Cuenca: ${message}`, code: "HOLD_FAILED" },
      { status: 500 }
    );
  }

  // ── 6. Quemar MEXCOIN en Celo ──────────────────────────────────────────────
  let txHash: string;
  try {
    txHash = await burnMexcoin(
      wallet_address as Address,
      amountNum.toFixed(2),
      `WITHDRAW:${withdrawalRef}`
    );
  } catch (err) {
    // ROLLBACK: liberar hold en Cuenca
    if (holdId) {
      await releaseHold(holdId).catch((e) =>
        console.error(`[withdraw] Error liberando hold ${holdId}:`, e)
      );
    }
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error(`[withdraw] Error quemando MEXCOIN, hold liberado:`, message);
    return NextResponse.json(
      { ok: false, error: `Error en blockchain: ${message}. Fondos liberados.`, code: "BURN_FAILED" },
      { status: 500 }
    );
  }

  // ── 7. Ordenar SPEI saliente a Cuenca ─────────────────────────────────────
  let cuencaWithdrawal;
  try {
    cuencaWithdrawal = await sendWithdrawal({
      user_id:           userId,
      amount_cents:      amountCents,
      destination_clabe: destination_clabe,
      reference:         withdrawalRef,
    });
  } catch (err) {
    // MEXCOIN ya fue quemado pero el SPEI falló — requiere intervención manual
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error(`[withdraw] CRÍTICO: MEXCOIN quemado pero SPEI falló. tx: ${txHash}. Error:`, message);
    // TODO: sistema de alertas (PagerDuty/Slack) para intervención manual
    return NextResponse.json(
      { ok: false, error: "SPEI no procesado. Contacta soporte con tu referencia.", code: "SPEI_FAILED", },
      { status: 500 }
    );
  }

  // ── 8. Registrar en Firestore ──────────────────────────────────────────────
  const db = getDb();
  const txDocRef = doc(db, "len_transactions", txHash);
  await setDoc(txDocRef, {
    type:                 "withdrawal",
    user_id:              userId,
    wallet_address,
    amount_mxn:           amountNum.toFixed(2),
    fee_mxn:              fee.toFixed(2),
    amount_after_fee_mxn: amountAfterFee.toFixed(2),
    mexcoin_burned:       amountNum.toFixed(2),
    destination_clabe,
    celo_tx_hash:         txHash,
    cuenca_withdrawal_id: cuencaWithdrawal.withdrawal_id,
    cuenca_status:        cuencaWithdrawal.status,
    reference:            withdrawalRef,
    status:               "completed",
    created_at:           serverTimestamp(),
  });

  console.log(
    `[withdraw] ✓ ${amountNum.toFixed(2)} MEXCOIN quemado | ` +
    `SPEI ${amountAfterFee.toFixed(2)} MXN → CLABE: ${destination_clabe.slice(0, 6)}... | ` +
    `tx: ${txHash}`
  );

  return NextResponse.json({
    ok: true,
    data: {
      withdrawal_id:       cuencaWithdrawal.withdrawal_id,
      mexcoin_burned:      amountNum.toFixed(2),
      amount_mxn:          amountNum.toFixed(2),
      fee_mxn:             fee.toFixed(2),
      amount_received_mxn: amountAfterFee.toFixed(2),
      destination_clabe:   `${destination_clabe.slice(0, 6)}...${destination_clabe.slice(-4)}`,
      celo_tx_hash:        txHash,
      estimated_arrival:   cuencaWithdrawal.estimated_time,
      reference:           withdrawalRef,
    },
  });
}
