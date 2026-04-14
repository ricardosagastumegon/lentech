'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useWalletStore, COINS, CoinCode } from '@/store/wallet.store';

// Deterministic hash so QR pattern is stable across renders
function hashCell(seed: string, index: number): boolean {
  let h = 0x811c9dc5;
  const s = seed + String(index);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h & 1) === 1;
}

export default function ReceivePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);

  const phone = user?.phoneNumber ?? '';
  const displayPhone = phone.replace(/(\+?\d{3})(\d{4})(\d+)/, '$1-$2-$3');

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const acceptedCoins = Object.entries(COINS) as [CoinCode, typeof COINS[CoinCode]][];

  return (
    <div className="max-w-md mx-auto px-4 pb-6">
      <div className="pt-5 mb-6">
        <button onClick={() => router.back()} className="btn-ghost mb-3 -ml-2 text-sm">
          ← Volver
        </button>
        <h1 className="text-2xl font-black text-len-dark">Recibir</h1>
        <p className="text-gray-500 text-sm mt-1">
          Acepta cualquier TokenCoin de la red LEN
        </p>
      </div>

      {/* QR card */}
      <div className="card flex flex-col items-center py-8 mb-4">
        <div className="w-48 h-48 bg-len-gradient rounded-3xl flex items-center justify-center mb-4 shadow-len-lg relative overflow-hidden">
          {/* Deterministic QR pattern — stable per phone number */}
          <div className="absolute inset-3 grid grid-cols-7 gap-0.5 opacity-40">
            {Array.from({ length: 49 }).map((_, i) => (
              <div
                key={i}
                className={`rounded-sm ${hashCell(phone || 'len', i) ? 'bg-white' : ''}`}
              />
            ))}
          </div>
          <div className="relative w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow">
            <span className="text-len-purple font-black text-xl">L</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-widest">Tu número LEN</p>
        <p className="text-2xl font-black text-len-dark tracking-wide mb-1">{displayPhone}</p>
        <p className="text-xs text-gray-400 text-center max-w-xs">
          Cualquier usuario LEN puede enviarte dinero con este número,
          en cualquier moneda de la red.
        </p>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => copy(phone)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all
              ${copied
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-len-light text-len-purple hover:bg-len-border'}`}
          >
            {copied ? '✓ Copiado' : '📋 Copiar número'}
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'Mi LEN', text: `Envíame dinero por LEN: ${phone}` }).catch(() => {});
              } else {
                copy(phone);
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm
                       bg-len-light text-len-purple hover:bg-len-border transition-all"
          >
            📤 Compartir
          </button>
        </div>
      </div>

      {/* Accepted coins */}
      <div className="card mb-4">
        <p className="text-sm font-bold text-len-dark mb-3">
          Monedas que puedes recibir
        </p>
        <div className="grid grid-cols-2 gap-2">
          {acceptedCoins.map(([code, meta]) => (
            <div key={code} className="flex items-center gap-2 bg-len-surface rounded-xl px-3 py-2.5 border border-len-border">
              <span className="text-lg">{meta.flag}</span>
              <div>
                <p className="text-xs font-bold text-len-dark">{code}</p>
                <p className="text-[10px] text-gray-400">{meta.name}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">
          Recibes en la moneda original. Convierte cuando quieras al tipo de cambio LEN.
        </p>
      </div>

      {/* How it works */}
      <div className="card bg-len-light border-len-border">
        <p className="text-sm font-bold text-len-dark mb-3">¿Cómo funciona?</p>
        <div className="space-y-3">
          {[
            { step: '1', text: 'Comparte tu número o QR con quien te va a pagar' },
            { step: '2', text: 'El emisor elige en qué moneda envía (QUETZA, MEXCOIN, LEMPI…)' },
            { step: '3', text: 'Recibes la moneda en tu wallet LEN en segundos' },
            { step: '4', text: 'Usa la moneda recibida o conviértela a tu moneda local cuando quieras' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-6 h-6 bg-len-purple rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">{s.step}</span>
              </div>
              <p className="text-sm text-gray-600">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
