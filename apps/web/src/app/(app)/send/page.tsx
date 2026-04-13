'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RecipientInput } from '@/components/send/recipient-input';
import { AmountInput } from '@/components/send/amount-input';
import { FXQuoteCard } from '@/components/send/fx-quote-card';
import { PINConfirmModal } from '@/components/ui/pin-confirm-modal';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { apiClient } from '@/lib/api-client';

type Step = 'recipient' | 'amount' | 'quote' | 'pin' | 'success';

interface FXQuote {
  quoteId: string;
  fromCoin: string;
  toCoin: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  rateDisplay: string;
  feeAmount: number;
  feePercent: number;
  usdEquivalent: number;
  validUntil: Date;
}

export default function SendPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('recipient');
  const [recipient, setRecipient] = useState('');
  const [recipientInfo, setRecipientInfo] = useState<{ userId: string; displayName: string; walletAddress: string; kycLevel: number } | null>(null);
  const [amount, setAmount] = useState('');
  const [fromCoin, setFromCoin] = useState('QUETZA');
  const [toCoin, setToCoin] = useState('QUETZA');
  const [quote, setQuote] = useState<FXQuote | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txId, setTxId] = useState('');

  async function fetchQuote() {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/fx/quote', {
        fromCoin,
        toCoin,
        fromAmount: parseFloat(amount),
      });
      setQuote({ ...res.data, validUntil: new Date(res.data.validUntil) });
      setStep('quote');
    } catch {
      setError('No se pudo obtener la cotización. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function executeTransfer(pin: string) {
    if (!quote) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/wallet/transfer', {
        toIdentifier: recipient,
        amountMondg: amount,
        description,
        quoteId: quote.quoteId,
        pin,
      });
      setTxId(res.data.id);
      setStep('success');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error al enviar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-20">
      <div className="pt-6 mb-6">
        <button onClick={() => router.back()} className="text-mondega-green text-sm flex items-center gap-1 mb-4">
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Enviar dinero</h1>
        <p className="text-gray-500 text-sm">A cualquier usuario Mondega en Mesoamérica</p>
      </div>

      {/* Step: Recipient */}
      {step === 'recipient' && (
        <div className="space-y-4">
          <RecipientInput
            value={recipient}
            onChange={setRecipient}
            onResolved={setRecipientInfo}
          />
          <button
            className="btn-primary w-full"
            onClick={() => setStep('amount')}
            disabled={!recipient}
          >
            Continuar
          </button>
        </div>
      )}

      {/* Step: Amount */}
      {step === 'amount' && (
        <div className="space-y-4">
          {recipientInfo && (
            <div className="card flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-mondega-green/10 flex items-center justify-center">
                <span className="text-mondega-green font-bold">{recipientInfo.displayName[0]}</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{recipientInfo.displayName}</p>
                <p className="text-gray-500 text-xs font-mono">{recipientInfo.walletAddress.slice(0, 8)}...</p>
              </div>
            </div>
          )}

          <AmountInput
            value={amount}
            onChange={setAmount}
            fromCoin={fromCoin}
            toCoin={toCoin}
            onFromCoinChange={setFromCoin}
            onToCoinChange={setToCoin}
          />

          <input
            className="input-field"
            placeholder="Descripción (opcional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={100}
          />

          {error && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}

          <button
            className="btn-primary w-full"
            onClick={fetchQuote}
            disabled={!amount || parseFloat(amount) <= 0 || loading}
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Ver cotización'}
          </button>
        </div>
      )}

      {/* Step: Quote confirmation */}
      {step === 'quote' && quote && (
        <div className="space-y-4">
          <FXQuoteCard quote={quote} recipient={recipientInfo?.displayName ?? recipient} />

          <div className="card bg-amber-50 border-amber-200">
            <p className="text-amber-800 text-sm">
              La tasa es válida por <CountdownTimer validUntil={quote.validUntil} />.
              Confirma antes de que expire.
            </p>
          </div>

          <PINConfirmModal
            trigger={
              <button className="btn-primary w-full">
                Confirmar y enviar
              </button>
            }
            onConfirm={executeTransfer}
            loading={loading}
          />

          <button className="btn-secondary w-full" onClick={() => setStep('amount')}>
            Modificar
          </button>
        </div>
      )}

      {/* Step: Success */}
      {step === 'success' && (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Enviado!</h2>
          <p className="text-gray-500 mb-2">
            {amount} {fromCoin} enviados a {recipientInfo?.displayName ?? recipient}
          </p>
          <p className="text-gray-400 text-xs mb-8">ID: {txId}</p>

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

// Helper: countdown timer
function CountdownTimer({ validUntil }: { validUntil: Date }) {
  const [secs, setSecs] = useState(
    Math.max(0, Math.round((validUntil.getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <span className="font-bold">{secs}s</span>;
}
