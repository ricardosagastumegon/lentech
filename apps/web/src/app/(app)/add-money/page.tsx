'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useWalletStore, COINS, COUNTRY_TO_COIN, CoinCode } from '@/store/wallet.store';
import { DEPOSIT_MODEL, BankCountry } from '@/store/bank.store';

// ─── Generate the user's deposit account info ─────────────────────────────────
// GT/HN: LEN sub-account at Banrural/BAC — last 4 digits = wallet suffix
// MX:    CLABE virtual 18 digits unique per user (STP)

function getUserDepositInfo(userId: string, country: BankCountry) {
  const walletSuffix = userId.replace(/\D/g, '').slice(-4).padStart(4, '0');
  const model        = DEPOSIT_MODEL[country];

  if (country === 'MX') {
    // CLABE: STP prefix (646180) + 11 user digits (from userId hash) + check digit
    const raw    = userId.replace(/\D/g, '').padStart(11, '0').slice(0, 11);
    const base17 = `646180${raw}`;
    const check  = clabeCheck(base17);
    const clabe  = `${base17}${check}`;
    return {
      type:        'clabe' as const,
      bank:        'STP — Red SPEI',
      displayAccount: clabe,
      copyValue:   clabe,
      label:       'Tu CLABE LEN (exclusiva)',
      subLabel:    'Transfiere desde CUALQUIER banco mexicano',
      note:        'El depósito llega en segundos, 24/7. No necesitas concepto ni referencia.',
      min:         '$50 MXN',
      max:         '$200,000 MXN/día',
      time:        'Inmediato (SPEI 24/7)',
    };
  }

  // GT / HN — sub-account model
  const accountNumber = `${model.poolAccount}${walletSuffix}`;
  return {
    type:           'sub-account' as const,
    bank:           model.bank,
    displayAccount: accountNumber,
    copyValue:      accountNumber.replace(/-/g, ''),
    label:          `Tu cuenta LEN en ${model.bank}`,
    subLabel:       `Desde CUALQUIER banco de ${country === 'GT' ? 'Guatemala' : 'Honduras'}`,
    note:           model.note,
    min:            country === 'GT' ? 'Q 50' : 'L 500',
    max:            country === 'GT' ? 'Q 25,000/día' : 'L 100,000/día',
    time:           '15–30 min (L-V hábil)',
  };
}

// CLABE check digit (Banxico Luhn)
function clabeCheck(clabe17: string): string {
  const w = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
  const s = clabe17.split('').reduce((acc, d, i) => acc + (parseInt(d) * w[i]) % 10, 0);
  return String((10 - (s % 10)) % 10);
}

export default function AdquirirPage() {
  const router        = useRouter();
  const { user }      = useAuthStore();
  const wallets       = useWalletStore(s => s.wallets);
  const [copied, setCopied] = useState<string | null>(null);

  const country   = (user?.country ?? 'GT') as BankCountry;
  const coin      = COUNTRY_TO_COIN[country] ?? 'QUETZA';
  const coinMeta  = COINS[coin as CoinCode];
  const wallet    = wallets.find(w => w.coin === coin);
  const fiatBalance = parseFloat(wallet?.fiatBalance ?? '0');

  const deposit = getUserDepositInfo(user?.id ?? 'demo-gt', country);

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2500);
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-6">

      {/* Header */}
      <div className="pt-5 mb-6">
        <button onClick={() => router.back()} className="btn-ghost mb-3 -ml-2 text-sm">
          ← Volver
        </button>
        <h1 className="text-2xl font-black text-len-dark">
          Cargar wallet {coinMeta.flag}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Deposita {coinMeta.fiat} · llega a tu saldo fiat automáticamente
        </p>
      </div>

      {/* Current fiat balance */}
      <div className="bg-len-light rounded-2xl px-4 py-3 border border-len-border flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-gray-400 font-medium">Saldo fiat disponible</p>
          <p className="text-lg font-black text-len-dark tabular-nums">
            {fmt(fiatBalance)} <span className="text-gray-400 font-bold text-sm">{coinMeta.fiat}</span>
          </p>
        </div>
        <span className="text-2xl">{coinMeta.flag}</span>
      </div>

      {/* How it works */}
      <div className="bg-len-light rounded-3xl px-4 py-4 border border-len-border mb-5">
        <p className="text-xs font-bold text-len-purple mb-3">¿Cómo funciona?</p>
        <div className="space-y-2.5">
          {[
            country === 'MX'
              ? `Transfieres ${coinMeta.fiat} desde tu banco a tu CLABE LEN exclusiva`
              : `Transfieres ${coinMeta.fiat} desde CUALQUIER banco a tu cuenta LEN en ${deposit.bank}`,
            `El banco notifica a LEN automáticamente — sin referencias ni pasos extras`,
            `Tu saldo fiat aparece en la app${country === 'MX' ? ' en segundos' : ' en 15–30 minutos'}`,
            `Conviertes fiat → tokens ${coin} cuando quieras (1:1, sin comisión)`,
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-5 h-5 bg-len-purple text-white text-[10px] font-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-xs text-gray-600">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main deposit card */}
      <div className="bg-white rounded-3xl border-2 border-len-border overflow-hidden mb-4">

        {/* Bank header */}
        <div className="bg-len-gradient px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs font-medium">Tu cuenta de depósito LEN</p>
            <p className="text-white font-bold text-sm mt-0.5">{deposit.bank}</p>
          </div>
          <span className="text-2xl">{coinMeta.flag}</span>
        </div>

        <div className="p-5 space-y-4">

          {/* Account number / CLABE */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{deposit.label}</p>
              <button
                onClick={() => copy(deposit.copyValue, 'account')}
                className={`text-xs font-bold transition-colors ${copied === 'account' ? 'text-emerald-600' : 'text-len-purple'}`}
              >
                {copied === 'account' ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
            <div className="bg-len-light rounded-2xl p-4 border border-len-border">
              <p className="font-mono text-len-dark font-bold text-xl tracking-wider break-all">
                {deposit.displayAccount}
              </p>
              <p className="text-xs text-gray-400 mt-1">{deposit.subLabel}</p>
            </div>
          </div>

          {/* MX: extra CLABE info */}
          {country === 'MX' && (
            <div className="bg-indigo-50 rounded-2xl px-4 py-3 border border-indigo-100">
              <p className="text-xs font-bold text-indigo-700 mb-1">¿Cómo transferir con CLABE?</p>
              <p className="text-xs text-indigo-600 leading-relaxed">
                En tu app bancaria → "Transferir" → "A otro banco" → pega esta CLABE.
                BBVA, Santander, Banamex, Nu, Mercado Pago — todos soportan SPEI.
                El depósito llega en segundos, los 365 días del año.
              </p>
            </div>
          )}

          {/* GT/HN: from any bank note */}
          {country !== 'MX' && (
            <div className="bg-emerald-50 rounded-2xl px-4 py-3 border border-emerald-100">
              <p className="text-xs font-bold text-emerald-700 mb-1">
                ✓ Acepta depósitos de CUALQUIER banco de {country === 'GT' ? 'Guatemala' : 'Honduras'}
              </p>
              <p className="text-xs text-emerald-600 leading-relaxed">
                {country === 'GT'
                  ? 'Industrial, BAM, G&T, Promerica, Bantrab, Citibank, Ficohsa y más — todos pueden transferir a esta cuenta Banrural.'
                  : 'Atlántida, Ficohsa, Banpaís, Occidente, Davivienda, Promerica HN — todos pueden transferir a esta cuenta BAC.'}
              </p>
            </div>
          )}

          {/* Note */}
          <p className="text-xs text-gray-500 leading-relaxed">{deposit.note}</p>

          {/* Limits grid */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-len-border">
            {[
              { label: 'Mínimo',      value: deposit.min },
              { label: 'Máx. diario', value: deposit.max },
              { label: 'Tiempo',      value: deposit.time },
            ].map(item => (
              <div key={item.label} className="text-center bg-len-light rounded-xl py-2">
                <p className="text-[10px] text-gray-400 font-medium">{item.label}</p>
                <p className="text-xs font-bold text-len-dark mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Warning — same account always */}
      <div className="bg-amber-50 rounded-2xl px-4 py-3 border border-amber-100 mb-4">
        <p className="text-xs font-bold text-amber-700 mb-1">
          {country === 'MX' ? '🔐 Tu CLABE es permanente' : '🔐 Tu cuenta LEN es permanente'}
        </p>
        <p className="text-xs text-amber-600 leading-relaxed">
          {country === 'MX'
            ? 'Esta CLABE siempre es tuya. Puedes guardarla en tus contactos bancarios como "Cuenta LEN" para futuros depósitos.'
            : `Este número de cuenta siempre es tuyo. Guárdalo en tus contactos bancarios como "Mi cuenta LEN ${deposit.bank}" para futuros depósitos.`}
        </p>
      </div>

      {/* CTA — convert tokens */}
      {fiatBalance > 0 && (
        <div className="bg-len-light rounded-2xl px-4 py-4 border border-len-border flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-len-dark">Tienes {fmt(fiatBalance)} {coinMeta.fiat} disponibles</p>
            <p className="text-xs text-gray-400 mt-0.5">Conviértelos a tokens {coin} para enviar o intercambiar</p>
          </div>
          <button onClick={() => router.push('/buy-tokens')} className="btn-primary text-sm px-4 py-2.5 whitespace-nowrap ml-3">
            Comprar →
          </button>
        </div>
      )}

      {/* Receive from LEN users */}
      <div className="mt-4 bg-len-light rounded-3xl border border-len-border px-4 py-4">
        <p className="text-sm font-bold text-len-dark mb-1">Recibir de otro usuario LEN</p>
        <p className="text-xs text-gray-500 mb-3">
          Si otro usuario LEN te envía {coin}, aparece directo en tu wallet sin pasar por el banco.
        </p>
        <button onClick={() => router.push('/receive')} className="btn-secondary w-full text-sm py-2.5">
          Ver mi QR →
        </button>
      </div>
    </div>
  );
}
