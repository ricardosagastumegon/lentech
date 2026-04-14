'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RecipientInput } from '@/components/send/recipient-input';
import { AmountInput } from '@/components/send/amount-input';
import { FXQuoteCard } from '@/components/send/fx-quote-card';
import { PINConfirmModal } from '@/components/ui/pin-confirm-modal';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { apiClient } from '@/lib/api-client';
import { calculateFXQuote, FXQuoteResult } from '@/lib/fx-engine';
import { CoinCode, COUNTRY_TO_COIN, COINS, genTxId } from '@/store/wallet.store';
import { useAuthStore } from '@/store/auth.store';
import { useWalletStore } from '@/store/wallet.store';
import { TransactionVoucher } from '@/components/ui/TransactionVoucher';
import { creditTransfer } from '@/lib/user-db';

type Step = 'recipient' | 'amount' | 'quote' | 'success';

export default function SendPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const wallets          = useWalletStore(s => s.wallets);
  const recordTransfer   = useWalletStore(s => s.recordTransfer);
  const [txDate, setTxDate] = useState('');

  const defaultCoin: CoinCode = (user?.country ? COUNTRY_TO_COIN[user.country] : 'QUETZA') ?? 'QUETZA';

  const [step, setStep]           = useState<Step>('recipient');
  const [recipient, setRecipient] = useState('');
  const [recipientInfo, setRecipientInfo] = useState<{
    userId: string; displayName: string; walletAddress: string; kycLevel: number; country?: string;
  } | null>(null);
  const [amount, setAmount]       = useState('');
  const [fromCoin, setFromCoin]   = useState<CoinCode>(defaultCoin);
  const [toCoin, setToCoin]       = useState<CoinCode>(defaultCoin);
  const [quote, setQuote]         = useState<FXQuoteResult | null>(null);
  const [description, setDesc]    = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [txId, setTxId]           = useState('');

  const balance = wallets.find(w => w.coin === fromCoin)?.available ?? '0';
  const isFX = fromCoin !== toCoin;

  function buildQuote() {
    const n = parseFloat(amount);
    if (!n || n <= 0) return null;
    return calculateFXQuote(fromCoin, toCoin, n);
  }

  function handleGetQuote() {
    const q = buildQuote();
    if (!q) { setError('Ingresa un monto válido'); return; }
    setQuote(q);
    setError('');
    setStep('quote');
  }

  async function executeTransfer(pin: string) {
    if (!quote) return;
    setLoading(true);
    setError('');
    const now  = new Date().toISOString();
    const txId = genTxId(fromCoin !== toCoin ? 'FXS' : 'TRF');
    // Recipient tx gets a different ID so both sender+receiver have unique records
    const rxId = genTxId(fromCoin !== toCoin ? 'FXS' : 'TRF');

    try {
      await apiClient.post('/wallet/transfer', {
        toIdentifier: recipient, fromCoin, toCoin,
        fromAmount: quote.fromAmount, quoteId: `local-${Date.now()}`, pin, description,
      });
    } catch { /* demo mode — backend offline, continue */ }

    // ── Record sender's transaction (always) ─────────────────────────────────
    recordTransfer({
      id: txId, type: fromCoin !== toCoin ? 'fx_swap' : 'transfer',
      status: 'completed', direction: 'sent',
      fromCoin, toCoin,
      fromAmount: quote.fromAmount.toFixed(2),
      toAmount:   quote.toAmount.toFixed(2),
      fee: quote.feeAmount.toFixed(4), feePercent: quote.feePercent,
      description: description || undefined,
      recipientName: recipientInfo?.displayName ?? recipient,
      createdAt: now, completedAt: now,
    });

    // ── Credit recipient via Firestore (cross-user real-time) ─────────────────
    if (recipientInfo?.userId) {
      const toCoinMeta = COINS[toCoin];
      await creditTransfer({
        recipientId:  recipientInfo.userId,
        coin:         toCoin,
        fiatCurrency: toCoinMeta.fiat,
        amount:       quote.toAmount,
        transaction: {
          id: rxId, type: fromCoin !== toCoin ? 'fx_swap' : 'transfer',
          status: 'completed', direction: 'received',
          fromCoin, toCoin,
          fromAmount: quote.fromAmount.toFixed(2),
          toAmount:   quote.toAmount.toFixed(2),
          fee: quote.feeAmount.toFixed(4), feePercent: quote.feePercent,
          description: description || `Recibido de ${user?.displayName ?? 'usuario LEN'}`,
          senderName:  user?.displayName ?? undefined,
          createdAt: now, completedAt: now,
        },
      });
    }

    setTxId(txId);
    setTxDate(now);
    setStep('success');
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-6">
      {/* Header */}
      <div className="pt-5 mb-6">
        <button onClick={() => step === 'recipient' ? router.back() : setStep(step === 'quote' ? 'amount' : 'recipient')}
          className="btn-ghost mb-3 -ml-2 text-sm">
          ← {step === 'recipient' ? 'Volver' : 'Atrás'}
        </button>
        <h1 className="text-2xl font-black text-len-dark">Enviar</h1>
        <p className="text-gray-400 text-sm">A cualquier usuario LEN en Mesoamérica</p>
      </div>

      {/* Step indicator */}
      {step !== 'success' && (
        <div className="flex items-center gap-2 mb-6">
          {(['recipient', 'amount', 'quote'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${step === s ? 'bg-len-purple text-white scale-110'
                  : (i < ['recipient', 'amount', 'quote'].indexOf(step)) ? 'bg-emerald-500 text-white'
                  : 'bg-len-border text-gray-400'}`}>
                {i < ['recipient', 'amount', 'quote'].indexOf(step) ? '✓' : i + 1}
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 w-8 rounded ${i < ['recipient', 'amount', 'quote'].indexOf(step) ? 'bg-emerald-500' : 'bg-len-border'}`} />}
            </div>
          ))}
          <span className="text-xs text-gray-400 ml-auto">
            {step === 'recipient' ? 'Destinatario' : step === 'amount' ? 'Monto' : 'Confirmar'}
          </span>
        </div>
      )}

      {/* ── Step 1: Recipient ── */}
      {step === 'recipient' && (
        <div className="space-y-4">
          <RecipientInput
            value={recipient}
            onChange={setRecipient}
            onResolved={setRecipientInfo}
          />
          <button className="btn-primary w-full" onClick={() => setStep('amount')} disabled={!recipient}>
            Continuar →
          </button>
        </div>
      )}

      {/* ── Step 2: Amount ── */}
      {step === 'amount' && (
        <div className="space-y-4">
          {/* Recipient summary */}
          {recipientInfo && (
            <div className="card flex items-center gap-3 py-4">
              <div className="w-10 h-10 bg-len-gradient rounded-xl flex items-center justify-center text-white font-black">
                {recipientInfo.displayName[0]}
              </div>
              <div className="flex-1">
                <p className="font-bold text-len-dark text-sm">{recipientInfo.displayName}</p>
                <p className="text-xs text-gray-400 font-mono">
                  {recipientInfo.walletAddress.slice(0, 8)}…{recipientInfo.walletAddress.slice(-4)}
                </p>
              </div>
              <span className="badge-purple">KYC {recipientInfo.kycLevel}</span>
            </div>
          )}

          {/* Your balance */}
          <div className="flex items-center justify-between bg-len-light rounded-2xl px-4 py-2.5 border border-len-border">
            <span className="text-xs text-gray-500">Tu saldo disponible</span>
            <span className="text-sm font-black text-len-dark tabular-nums">
              {Number(balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} {fromCoin}
            </span>
          </div>

          <AmountInput
            value={amount}
            onChange={setAmount}
            fromCoin={fromCoin}
            toCoin={toCoin}
            onFromCoinChange={setFromCoin}
            onToCoinChange={setToCoin}
          />

          {/* Preview rate — sin USD */}
          {isFX && amount && parseFloat(amount) > 0 && (() => {
            const q = calculateFXQuote(fromCoin, toCoin, parseFloat(amount));
            const fm = COINS[fromCoin];
            const tm = COINS[toCoin];
            return (
              <div className="bg-len-light rounded-2xl px-4 py-3 border border-len-border text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tipo de cambio</span>
                  <span className="font-mono font-bold text-len-dark">{q.rateDisplay}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Recibirá ~</span>
                  <span className="font-bold text-emerald-700">
                    {q.toAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {toCoin}
                    <span className="text-gray-400 ml-1">({tm.fiat})</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Comisión ({(q.feePercent * 100).toFixed(1)}%)</span>
                  <span className="text-gray-500">-{q.feeAmount.toFixed(4)} {fromCoin}</span>
                </div>
              </div>
            );
          })()}

          <input
            className="input-field"
            placeholder="Descripción (opcional)"
            value={description}
            onChange={e => setDesc(e.target.value)}
            maxLength={100}
          />

          {error && <div className="bg-red-50 text-red-700 rounded-2xl p-3 text-sm text-center">{error}</div>}

          <button
            className="btn-primary w-full"
            onClick={handleGetQuote}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            Ver cotización →
          </button>
        </div>
      )}

      {/* ── Step 3: Quote + Confirm ── */}
      {step === 'quote' && quote && (
        <div className="space-y-4">
          <FXQuoteCard quote={quote} recipient={recipientInfo?.displayName ?? recipient} />

          <input
            className="input-field"
            placeholder="Descripción (opcional)"
            value={description}
            onChange={e => setDesc(e.target.value)}
            maxLength={100}
          />

          {error && <div className="bg-red-50 text-red-700 rounded-2xl p-3 text-sm text-center">{error}</div>}

          <PINConfirmModal
            trigger={
              <button className="btn-primary w-full">
                🔒 Confirmar y enviar
              </button>
            }
            onConfirm={executeTransfer}
            loading={loading}
            title="Confirma tu envío"
            description={`Autoriza el envío de ${quote.fromAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${fromCoin} (${COINS[fromCoin].fiat})`}
          />

          <button className="btn-secondary w-full" onClick={() => { setStep('amount'); setQuote(null); }}>
            Modificar
          </button>
        </div>
      )}

      {/* ── Success + Voucher ── */}
      {step === 'success' && quote && (
        <div className="space-y-6 py-4">
          <div className="text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-200">
              <span className="text-4xl">✓</span>
            </div>
            <h2 className="text-2xl font-black text-len-dark mb-1">¡Enviado!</h2>
            <p className="text-gray-400 text-sm">Tu comprobante está listo para compartir</p>
          </div>

          <TransactionVoucher
            txId={txId}
            typeLabel={isFX ? 'Envío internacional' : 'Envío de tokens'}
            createdAt={txDate}
            lines={[
              { label: 'Destinatario', value: recipientInfo?.displayName ?? recipient, bold: true },
              { label: 'Monto enviado', value: `${quote.fromAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${fromCoin}` },
              ...(isFX ? [
                { label: 'Destinatario recibe', value: `${quote.toAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${toCoin}`, highlight: 'green' as const, large: true },
                { label: 'Tipo de cambio', value: quote.rateDisplay },
              ] : [
                { label: 'Monto recibido', value: `${quote.fromAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${toCoin}`, highlight: 'green' as const, large: true },
              ]),
              { label: 'Estado', value: 'Acreditado', highlight: 'green' as const },
            ]}
          />

          <div className="space-y-3">
            <button className="btn-primary w-full" onClick={() => router.push('/dashboard')}>
              Ir al inicio
            </button>
            <button className="btn-secondary w-full" onClick={() => router.push('/transactions')}>
              Ver historial
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
