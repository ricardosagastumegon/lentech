'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useWalletStore, COINS, COUNTRY_TO_COIN } from '@/store/wallet.store';
import { stopWalletSync } from '@/lib/wallet-sync';

const KYC_LEVELS = [
  { level: 0, name: 'Anónimo',   limit: '$200/mes',    color: 'bg-gray-100 text-gray-600' },
  { level: 1, name: 'Básico',    limit: '$1,000/mes',  color: 'bg-amber-100 text-amber-700' },
  { level: 2, name: 'Verificado',limit: '$10,000/mes', color: 'bg-emerald-100 text-emerald-700' },
  { level: 3, name: 'Empresarial',limit: 'Sin límite', color: 'bg-len-light text-len-purple' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const wallets = useWalletStore(s => s.wallets);

  const kycInfo = KYC_LEVELS[user?.kycLevel ?? 0];
  const primaryCoin = wallets[0]?.coin ?? COUNTRY_TO_COIN[user?.country ?? 'GT'];

  return (
    <div className="max-w-md mx-auto px-4 pb-6">
      <div className="pt-5 mb-6">
        <h1 className="text-2xl font-black text-len-dark">Mi perfil</h1>
      </div>

      {/* Profile card */}
      <div className="card mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-len-gradient rounded-2xl flex items-center justify-center shadow-len text-white font-black text-2xl flex-shrink-0">
            {user?.firstName?.[0] ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-len-dark text-lg">{user?.displayName ?? 'Usuario'}</p>
            <p className="text-gray-400 text-sm">{user?.phoneNumber}</p>
            <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${kycInfo.color}`}>
              KYC {kycInfo.name} · {kycInfo.limit}
            </span>
          </div>
        </div>
      </div>

      {/* My wallets / coins */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-len-dark">Mis monedas</p>
          <span className="text-xs text-gray-400">{wallets.length} activa{wallets.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="space-y-2">
          {wallets.length > 0 ? wallets.map(w => {
            const m = COINS[w.coin];
            return (
              <div key={w.coin} className="flex items-center gap-3 bg-len-surface rounded-2xl p-3 border border-len-border">
                <div className="w-10 h-10 bg-len-light rounded-xl flex items-center justify-center text-xl">
                  {m.flag}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-len-dark">{w.coin}</p>
                  <p className="text-xs text-gray-400">{m.name} · 1 {w.coin} = 1 {m.fiat}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm text-len-dark">
                    {Number(w.available).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-400">≈ ${w.balanceUSD.toFixed(2)} USD</p>
                </div>
              </div>
            );
          }) : (
            <p className="text-sm text-gray-400 text-center py-4">Sin monedas activas aún</p>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3 text-center">
          Recibes una moneda → aparece aquí automáticamente
        </p>
      </div>

      {/* Quick links */}
      <div className="card mb-4 py-2">
        {[
          { icon: '🔐', label: 'Verificación KYC', href: '/kyc', badge: user && user.kycLevel < 2 ? 'Pendiente' : null },
          { icon: '🏦', label: 'Cuentas bancarias', href: '/bank-accounts', badge: null },
          { icon: '💳', label: 'Tarjeta LEN', href: '/card', badge: 'Próximamente' },
          { icon: '🔔', label: 'Notificaciones', href: '/notifications', badge: null },
          { icon: '🛡', label: 'Seguridad y PIN', href: '/security', badge: null },
        ].map(item => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 py-3 hover:bg-len-surface rounded-xl px-2 -mx-2 transition-colors"
          >
            <span className="text-xl w-8 text-center">{item.icon}</span>
            <span className="flex-1 text-sm font-medium text-len-dark">{item.label}</span>
            {item.badge && (
              <span className="text-xs bg-len-light text-len-purple font-semibold px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
            <span className="text-gray-300">›</span>
          </a>
        ))}
      </div>

      {/* Country info */}
      <div className="card mb-4 bg-len-light border-len-border py-4">
        <p className="text-xs text-gray-500 mb-1">País registrado</p>
        <p className="font-bold text-len-dark flex items-center gap-2">
          <span className="text-lg">{primaryCoin ? COINS[primaryCoin]?.flag : '🌎'}</span>
          {user?.country === 'GT' ? 'Guatemala' : user?.country === 'MX' ? 'México' : user?.country === 'HN' ? 'Honduras' : user?.country ?? 'N/A'}
        </p>
        <p className="text-xs text-gray-400 mt-1">Moneda base: {primaryCoin}</p>
      </div>

      {/* Logout */}
      <button
        onClick={() => { stopWalletSync(); logout(); router.push('/login'); }}
        className="w-full py-3 rounded-2xl border-2 border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
