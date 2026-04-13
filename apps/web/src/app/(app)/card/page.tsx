'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useWalletStore, COINS } from '@/store/wallet.store';

export default function CardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const wallets = useWalletStore(s => s.wallets);
  const [waitlisted, setWaitlisted] = useState(false);

  const primaryWallet = wallets[0];
  const coinMeta = primaryWallet ? COINS[primaryWallet.coin] : null;
  const maskedNumber = '•••• •••• •••• 0000';

  return (
    <div className="max-w-md mx-auto px-4 pb-6">
      <div className="pt-5 mb-6">
        <button onClick={() => router.back()} className="btn-ghost mb-3 -ml-2 text-sm">
          ← Volver
        </button>
        <h1 className="text-2xl font-black text-len-dark">Tarjeta LEN</h1>
        <p className="text-gray-500 text-sm mt-1">Débito Mastercard virtual + física</p>
      </div>

      {/* Virtual Card preview */}
      <div className="relative mb-6">
        <div className="rounded-3xl p-6 bg-len-gradient shadow-len-lg aspect-[1.586/1] flex flex-col justify-between relative overflow-hidden">
          {/* Decorations */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-white/5" />

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-len-purple font-black text-sm">L</span>
              </div>
              <span className="text-white font-bold">LEN</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-red-400 rounded-full opacity-90" />
              <div className="w-6 h-6 bg-amber-400 rounded-full opacity-90 -ml-2" />
            </div>
          </div>

          <div className="relative">
            {/* Chip */}
            <div className="w-10 h-7 bg-yellow-300/80 rounded-md mb-4 flex items-center justify-center">
              <div className="w-6 h-5 border-2 border-yellow-600/40 rounded-sm grid grid-cols-3 gap-px p-0.5">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="bg-yellow-600/30 rounded-sm" />
                ))}
              </div>
            </div>

            <p className="text-white/90 font-mono text-lg tracking-widest mb-2">
              {maskedNumber}
            </p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-white/50 text-[10px] uppercase tracking-widest">Titular</p>
                <p className="text-white font-semibold text-sm">
                  {user?.displayName?.toUpperCase() ?? 'CARLOS MENDOZA'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/50 text-[10px] uppercase tracking-widest">Saldo</p>
                <p className="text-white font-bold text-sm">
                  {primaryWallet
                    ? `${Number(primaryWallet.available).toLocaleString()} ${primaryWallet.coin}`
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coming soon overlay */}
        <div className="absolute inset-0 bg-len-dark/70 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center">
          <div className="bg-white rounded-2xl px-6 py-4 text-center max-w-[240px]">
            <p className="text-2xl mb-2">🚀</p>
            <p className="font-black text-len-dark text-lg">Próximamente</p>
            <p className="text-gray-500 text-sm mt-1">Fase 3 del roadmap — Q1 2026</p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="card mb-4">
        <p className="font-bold text-len-dark mb-4">¿Qué incluirá la tarjeta LEN?</p>
        <div className="space-y-3">
          {[
            { icon: '💳', title: 'Débito Mastercard', desc: 'Virtual inmediata + física en 7-10 días' },
            { icon: '🌎', title: 'Acepta en todo el mundo', desc: 'Cualquier comercio Mastercard, 210 países' },
            { icon: '⚡', title: 'Pago con cualquier coin', desc: 'Paga en QUETZA, MEXCOIN, LEMPI… FX automático' },
            { icon: '📱', title: 'Apple Pay & Google Pay', desc: 'Agrega la tarjeta virtual a tu teléfono' },
            { icon: '🔒', title: 'Control total', desc: 'Bloquea, ajusta límites y CVV dinámico desde la app' },
            { icon: '💸', title: 'Sin comisión de FX bancario', desc: 'La conversión la hace LEN al 0.5% — no el banco al 3%' },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-3">
              <div className="w-10 h-10 bg-len-light rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl">{f.icon}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-len-dark">{f.title}</p>
                <p className="text-xs text-gray-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Waitlist */}
      <div className="card bg-len-gradient text-white text-center py-8">
        {waitlisted ? (
          <>
            <p className="text-3xl mb-3">🎉</p>
            <p className="font-black text-xl mb-1">¡Estás en la lista!</p>
            <p className="text-white/70 text-sm">
              Te notificaremos cuando la tarjeta esté disponible para tu país.
            </p>
          </>
        ) : (
          <>
            <p className="font-black text-xl mb-1">Sé el primero</p>
            <p className="text-white/70 text-sm mb-5">
              Únete a la lista de espera y obtén acceso prioritario + 0% comisión el primer mes.
            </p>
            <button
              onClick={() => setWaitlisted(true)}
              className="bg-white text-len-purple font-bold py-3 px-8 rounded-2xl hover:bg-opacity-90 transition-all shadow-len-lg"
            >
              Unirme a la lista de espera →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
