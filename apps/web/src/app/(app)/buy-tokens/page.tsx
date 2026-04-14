'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletStore, COINS, COUNTRY_TO_COIN, TOKEN_FEES } from '@/store/wallet.store';
import { useAuthStore } from '@/store/auth.store';
import { PINConfirmModal } from '@/components/ui/pin-confirm-modal';
import { TransactionVoucher } from '@/components/ui/TransactionVoucher';

type Step = 'amount' | 'confirm' | 'success';

export default function BuyTokensPage() {
  const router  = useRouter();
  const { user } = useAuthStore();
  const { wallets, buyTokens } = useWalletStore();

  const country = user?.country ?? 'GT';
  const coin    = COUNTRY_TO_COIN[country] ?? 'QUETZA';
  const wallet  = wallets.find(w => w.coin === coin);
  const meta    = COINS[coin];

  const fiatAvailable = parseFloat(wallet?.fiatBalance ?? '0');
  const fee           = TOKEN_FEES.BUY;

  const [step,      setStep]    = useState<Step>('amount');
  const [amount,    setAmount]  = useState('');
  const [error,     setError]   = useState('');
  const [txId,      setTxId]    = useState('');
  const [txDate,    setTxDate]  = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const numAmount  = parseFloat(amount) || 0;
  const feeAmount  = numAmount * fee.percent;
  const netTokens  = numAmount - feeAmount;
  const isValid    = numAmount > 0 && numAmount <= fiatAvailable;

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function handleConfirm() {
    if (!isValid) { setError('Monto inválido'); return; }
    setError('');
    setStep('confirm');
  }

  async function handleExecute(pin: string) {
    setPinLoading(true);
    // Demo PIN validation
    if (pin !== '111111') {
      setPinLoading(false);
      throw new Error('PIN incorrecto');
    }
    // Small delay for UX
    await new Promise(r => setTimeout(r, 600));
    const id  = buyTokens(coin, numAmount);
    const now = new Date().toISOString();
    setTxId(id);
    setTxDate(now);
    setPinLoading(false);
    setStep('success');
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-6">

      {/* Header */}
      <div className="pt-5 mb-6">
        <button
          onClick={() => step === 'amount' ? router.back() : setStep('amount')}
          className="btn-ghost mb-3 -ml-2 text-sm"
        >
          ← {step === 'amount' ? 'Volver' : 'Modificar'}
        </button>
        <h1 className="text-2xl font-black text-len-dark">
          Comprar {meta.flag} {coin}
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Convierte tu saldo {meta.fiat} en tokens {coin} a precio 1:1
        </p>
      </div>

      {/* ── Step: Amount ── */}
      {step === 'amount' && (
        <div className="space-y-4">

          {/* Available fiat balance */}
          <div className="bg-len-light rounded-2xl px-4 py-3 border border-len-border flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">Saldo disponible en {meta.fiat}</p>
              <p className="text-lg font-black text-len-dark tabular-nums">
                {fmt(fiatAvailable)} <span className="text-gray-400 font-bold text-sm">{meta.fiat}</span>
              </p>
            </div>
            <span className="text-2xl">{meta.flag}</span>
          </div>

          {/* Amount input */}
          <div className="bg-white rounded-3xl border-2 border-len-border p-5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Cuántos {meta.fiat} quieres convertir
            </label>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-gray-200">{meta.symbol}</span>
              <input
                type="number"
                inputMode="decimal"
                className="flex-1 text-4xl font-black text-len-dark border-0 outline-none bg-transparent min-w-0 placeholder:text-gray-200"
                placeholder="0.00"
                value={amount}
                onChange={e => { setAmount(e.target.value); setError(''); }}
                max={fiatAvailable}
                min="1"
              />
              <span className="text-sm font-bold text-gray-400 flex-shrink-0">{meta.fiat}</span>
            </div>

            {/* Quick fill buttons */}
            <div className="flex gap-2 mt-3">
              {[0.25, 0.5, 0.75, 1].map(pct => (
                <button
                  key={pct}
                  onClick={() => setAmount((fiatAvailable * pct).toFixed(2))}
                  className="flex-1 text-xs font-bold text-len-purple bg-len-light border border-len-border
                             rounded-xl py-1.5 hover:border-len-purple transition-colors"
                >
                  {pct === 1 ? 'Todo' : `${pct * 100}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Fee preview */}
          {numAmount > 0 && (
            <div className="bg-white rounded-2xl border border-len-border px-4 py-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Conviertes</span>
                <span className="font-bold text-len-dark tabular-nums">{fmt(numAmount)} {meta.fiat}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Comisión de compra ({fee.label})</span>
                <span className={`font-bold tabular-nums ${fee.percent === 0 ? 'text-emerald-600' : 'text-gray-600'}`}>
                  {fee.percent === 0 ? 'Gratis' : `-${fmt(feeAmount)} ${meta.fiat}`}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-len-border">
                <span className="font-black text-len-dark">Recibes en tokens</span>
                <span className="font-black text-len-purple text-base tabular-nums">
                  {fmt(netTokens)} {coin}
                </span>
              </div>
            </div>
          )}

          {/* Legal note */}
          <div className="bg-indigo-50 rounded-2xl px-4 py-3 border border-indigo-100">
            <p className="text-xs text-indigo-700 font-semibold mb-1">¿Por qué comprar tokens?</p>
            <p className="text-xs text-indigo-600 leading-relaxed">
              Los tokens {coin} son activos digitales respaldados 1:1 con {meta.fiat}.
              Al comprarlos, adquieres un token LEN que puedes usar para enviar, recibir e intercambiar
              sin necesidad de efectivo físico ni intermediarios bancarios.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 rounded-2xl p-3 text-sm text-center">{error}</div>
          )}

          <button
            className="btn-primary w-full"
            onClick={handleConfirm}
            disabled={!isValid}
          >
            Ver resumen →
          </button>
        </div>
      )}

      {/* ── Step: Confirm ── */}
      {step === 'confirm' && (
        <div className="space-y-4">

          {/* Summary card */}
          <div className="rounded-3xl border-2 border-len-border overflow-hidden">
            {/* Header */}
            <div className="bg-len-gradient px-5 py-4">
              <p className="text-white/60 text-xs font-medium">Resumen de compra</p>
              <p className="text-white font-bold text-sm mt-0.5">
                {coin} · {meta.name}
              </p>
            </div>

            {/* Body */}
            <div className="bg-white px-5 py-4 space-y-3">
              {/* You pay */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{meta.flag}</span>
                  <div>
                    <p className="text-xs text-gray-400">Pagas con</p>
                    <p className="font-black text-len-dark text-lg tabular-nums">
                      {fmt(numAmount)} <span className="text-gray-400 text-sm font-bold">{meta.fiat}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Fee row */}
              <div className="bg-len-light rounded-2xl px-4 py-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Comisión de compra</span>
                  <span className={`font-bold ${fee.percent === 0 ? 'text-emerald-600' : 'text-gray-600'}`}>
                    {fee.percent === 0 ? '✓ Sin comisión' : `-${fmt(feeAmount)} ${meta.fiat}`}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Tasa</span>
                  <span className="font-mono font-bold text-len-dark">1 {coin} = 1 {meta.fiat}</span>
                </div>
              </div>

              {/* You receive */}
              <div className="flex items-center justify-between bg-emerald-50 rounded-2xl px-4 py-3 border border-emerald-200">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{meta.flag}</span>
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Recibes tokens</p>
                    <p className="font-black text-emerald-800 text-xl tabular-nums">
                      {fmt(netTokens)} <span className="text-sm font-bold">{coin}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-emerald-600 font-bold">1:1</div>
              </div>
            </div>
          </div>

          {/* PIN confirm */}
          <PINConfirmModal
            trigger={
              <button className="btn-primary w-full">
                🔒 Confirmar con PIN
              </button>
            }
            onConfirm={handleExecute}
            loading={pinLoading}
            title="Confirmar compra"
            description={`Autoriza la compra de ${fmt(netTokens)} ${coin} por ${fmt(numAmount)} ${meta.fiat}`}
          />

          <button className="btn-secondary w-full" onClick={() => setStep('amount')}>
            Modificar monto
          </button>
        </div>
      )}

      {/* ── Step: Success + Voucher ── */}
      {step === 'success' && (
        <div className="space-y-6 py-4">
          <div className="text-center">
            <div className="w-20 h-20 bg-len-light rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-len-border">
              <span className="text-4xl">{meta.flag}</span>
            </div>
            <h2 className="text-2xl font-black text-len-dark mb-1">¡Tokens adquiridos!</h2>
            <p className="text-gray-400 text-sm">Tu comprobante está listo para compartir</p>
          </div>

          <TransactionVoucher
            txId={txId}
            typeLabel="Adquisición de tokens"
            createdAt={txDate}
            lines={[
              { label: 'Monto depositado', value: `${fmt(numAmount)} ${meta.fiat}` },
              { label: 'Tokens recibidos', value: `+${fmt(netTokens)} ${coin}`, highlight: 'purple', large: true },
              { label: 'Tipo', value: `1 ${coin} = 1 ${meta.fiat}` },
              { label: 'Estado', value: 'Acreditado', highlight: 'green' },
            ]}
          />

          <div className="space-y-3">
            <button className="btn-primary w-full" onClick={() => router.push('/dashboard')}>
              Ir al inicio
            </button>
            <button className="btn-secondary w-full" onClick={() => router.push('/send')}>
              Enviar {coin} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
