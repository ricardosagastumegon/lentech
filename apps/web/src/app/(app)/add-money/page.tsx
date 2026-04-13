'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { COINS, COUNTRY_TO_COIN, CoinCode } from '@/store/wallet.store';

// Virtual account numbers per user (production: from fiat-bridge API)
function getVirtualAccount(userId: string, country: string) {
  const seed = userId.slice(-4).padStart(4, '0');
  const accounts: Record<string, { methods: VirtualAccount[] }> = {
    GT: {
      methods: [
        {
          bank: 'Banrural',
          logo: '🏦',
          type: 'Transferencia bancaria',
          accountNumber: `5020-${seed}-GT-LEN`,
          reference: `LEN${seed.toUpperCase()}GT`,
          instructions: 'Realiza una transferencia a la cuenta Banrural de LEN e incluye tu referencia en el concepto. Al confirmar el depósito, los tokens QUETZA aparecen en tu wallet automáticamente.',
          min: 'Q 50',
          max: 'Q 25,000/día',
          time: '< 30 min (L-V hábil)',
        },
        {
          bank: 'BAM',
          logo: '🏛',
          type: 'Transferencia bancaria',
          accountNumber: `3010-${seed}-GT-LEN`,
          reference: `LEN${seed.toUpperCase()}GT`,
          instructions: 'Transfiere quetzales a la cuenta BAM de LEN. Tu referencia única identifica tu compra. Los tokens QUETZA se acreditan tras confirmar el depósito.',
          min: 'Q 50',
          max: 'Q 25,000/día',
          time: '< 1 hora (L-V hábil)',
        },
      ],
    },
    MX: {
      methods: [
        {
          bank: 'SPEI (cualquier banco MX)',
          logo: '🇲🇽',
          type: 'CLABE interbancaria',
          accountNumber: `646180${seed}00000001`,
          reference: `LEN${seed.toUpperCase()}MX`,
          instructions: 'Usa esta CLABE desde tu banca en línea para transferir MXN. El MEXCOIN aparece en tu wallet automáticamente en minutos.',
          min: '$50 MXN',
          max: '$200,000 MXN/día',
          time: 'Inmediato (SPEI 24/7)',
        },
        {
          bank: 'OXXO Pay',
          logo: '🏪',
          type: 'Pago en tienda',
          accountNumber: `${seed}00OXXOLEN`,
          reference: `LEN${seed.toUpperCase()}`,
          instructions: 'Presenta este código en cualquier OXXO. Di "pago de servicio LEN". Los MEXCOIN se acreditan en < 2 horas.',
          min: '$20 MXN',
          max: '$10,000 MXN/día',
          time: '< 2 horas',
        },
      ],
    },
    HN: {
      methods: [
        {
          bank: 'Banco Atlántida',
          logo: '🏦',
          type: 'Transferencia bancaria',
          accountNumber: `3090-${seed}-HN-LEN`,
          reference: `LEN${seed.toUpperCase()}HN`,
          instructions: 'Transfiere lempiras a la cuenta LEN en Atlántida con tu referencia. Los tokens LEMPI se acreditan al confirmar el depósito.',
          min: 'L 500',
          max: 'L 100,000/día',
          time: '< 1 hora (L-V hábil)',
        },
      ],
    },
  };
  return accounts[country] ?? accounts['GT'];
}

interface VirtualAccount {
  bank: string;
  logo: string;
  type: string;
  accountNumber: string;
  reference: string;
  instructions: string;
  min: string;
  max: string;
  time: string;
}

export default function AdquirirPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedMethod, setSelectedMethod] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const country  = user?.country ?? 'GT';
  const coin     = COUNTRY_TO_COIN[country] ?? 'QUETZA';
  const coinMeta = COINS[coin as CoinCode];
  const accountData = getVirtualAccount(user?.id ?? 'demo', country);
  const method      = accountData.methods[selectedMethod];

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(label);
    setTimeout(() => setCopied(null), 2200);
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-6">

      {/* Header */}
      <div className="pt-5 mb-6">
        <button onClick={() => router.back()} className="btn-ghost mb-3 -ml-2 text-sm">
          ← Volver
        </button>
        <h1 className="text-2xl font-black text-len-dark">
          Adquirir {coinMeta.flag} {coin}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Compra tokens <strong className="text-len-purple">{coin}</strong> con tus {coinMeta.fiat} a precio 1:1
        </p>
      </div>

      {/* Token info card */}
      <div className="rounded-3xl border-2 border-len-border bg-white p-4 mb-5 flex items-center gap-4">
        <div className="w-14 h-14 bg-len-gradient rounded-2xl flex items-center justify-center text-3xl shadow-len flex-shrink-0">
          {coinMeta.flag}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-len-dark text-base">{coin}</p>
          <p className="text-sm text-gray-500 mt-0.5">{coinMeta.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <span className="text-xs text-emerald-600 font-semibold">Respaldado 1:1 con {coinMeta.fiat}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="bg-emerald-100 text-emerald-800 text-sm font-black px-3 py-1.5 rounded-full">
            1:1
          </div>
          <p className="text-[10px] text-gray-400 mt-1">1 {coin} = 1 {coinMeta.fiat}</p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-len-light rounded-3xl px-4 py-3 border border-len-border mb-5">
        <p className="text-xs font-bold text-len-purple mb-2">¿Cómo funciona?</p>
        <div className="space-y-1.5">
          {[
            `Transfieres ${coinMeta.fiat} a la cuenta LEN usando tu banco`,
            `LEN emite ${coin} tokens equivalentes y los acredita en tu wallet`,
            `Usas tus ${coin} para enviar, recibir o intercambiar`,
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-5 h-5 bg-len-purple text-white text-[10px] font-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-xs text-gray-600">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Method tabs */}
      {accountData.methods.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
          {accountData.methods.map((m, i) => (
            <button
              key={i}
              onClick={() => setSelectedMethod(i)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl border-2 text-sm font-semibold transition-all
                ${i === selectedMethod
                  ? 'border-len-purple bg-len-light text-len-purple'
                  : 'border-len-border bg-white text-gray-500 hover:border-len-violet'}`}
            >
              <span>{m.logo}</span>
              <span>{m.bank}</span>
            </button>
          ))}
        </div>
      )}

      {/* Account details */}
      <div className="bg-white rounded-3xl border-2 border-len-border p-5 space-y-4">

        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-0.5">{method.type}</p>
          <p className="text-base font-black text-len-dark">{method.logo} {method.bank}</p>
        </div>

        {/* Account number */}
        <div className="bg-len-light rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-gray-500 font-medium">Número de cuenta / CLABE</p>
            <button
              onClick={() => copy(method.accountNumber, 'cuenta')}
              className={`text-xs font-bold transition-colors ${copied === 'cuenta' ? 'text-emerald-600' : 'text-len-purple'}`}
            >
              {copied === 'cuenta' ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="font-mono text-len-dark font-bold text-lg tracking-wider break-all">
            {method.accountNumber}
          </p>
        </div>

        {/* Reference — critical */}
        <div className="bg-amber-50 rounded-2xl p-4 border-2 border-amber-200">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-amber-700 font-bold">⚠ Referencia obligatoria</p>
            <button
              onClick={() => copy(method.reference, 'ref')}
              className={`text-xs font-bold transition-colors ${copied === 'ref' ? 'text-emerald-600' : 'text-len-purple'}`}
            >
              {copied === 'ref' ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="font-mono text-amber-900 font-black text-2xl tracking-widest">
            {method.reference}
          </p>
          <p className="text-xs text-amber-600 mt-2">
            Escríbela en el concepto de tu transferencia. Sin referencia, el depósito no se procesa automáticamente.
          </p>
        </div>

        {/* Instructions */}
        <p className="text-sm text-gray-600 leading-relaxed">{method.instructions}</p>

        {/* Limits grid */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-len-border">
          {[
            { label: 'Mínimo',      value: method.min },
            { label: 'Máx. diario', value: method.max },
            { label: 'Tiempo',      value: method.time },
          ].map(item => (
            <div key={item.label} className="text-center bg-len-light rounded-xl py-2">
              <p className="text-[10px] text-gray-400 font-medium">{item.label}</p>
              <p className="text-xs font-bold text-len-dark mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Receive from other LEN users */}
      <div className="mt-4 bg-len-light rounded-3xl border border-len-border px-4 py-4">
        <p className="text-sm font-bold text-len-dark mb-1">Recibir de otro usuario LEN</p>
        <p className="text-xs text-gray-500 mb-3">
          Si otro usuario LEN te envía {coin}, aparece directo en tu wallet. Solo comparte tu número o QR.
        </p>
        <button
          onClick={() => router.push('/receive')}
          className="btn-secondary w-full text-sm py-2.5"
        >
          Ver mi QR →
        </button>
      </div>
    </div>
  );
}
