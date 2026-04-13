'use client';

import { useAuthStore } from '@/store/auth.store';
import { useWalletStore, COINS, COUNTRY_TO_COIN } from '@/store/wallet.store';
import Link from 'next/link';

export function TopBar() {
  const { user } = useAuthStore();
  const wallets = useWalletStore(s => s.wallets);
  const primaryCoin = wallets[0]?.coin;
  const coinMeta = primaryCoin ? COINS[primaryCoin] : null;

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-len-border z-50 h-16">
      <div className="flex items-center justify-between h-full max-w-2xl mx-auto px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-len-gradient rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-sm">L</span>
          </div>
          <span className="font-bold text-len-dark tracking-tight">LEN</span>
          {coinMeta && (
            <span className="text-xs text-gray-400 font-medium hidden sm:block">
              · {coinMeta.flag} {primaryCoin}
            </span>
          )}
          <span className="text-[9px] font-bold text-len-violet/60 hidden sm:block tracking-tight">v0.3</span>
        </Link>

        {/* Right */}
        <div className="flex items-center gap-2">
          {user && (
            <Link href="/kyc" className={`text-xs font-semibold px-2.5 py-1 rounded-full
              ${user.kycLevel >= 2 ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'}`}>
              KYC {user.kycLevel >= 2 ? '✓ Verificado' : 'Pendiente'}
            </Link>
          )}
          <Link
            href="/settings"
            className="w-9 h-9 bg-len-light rounded-full flex items-center justify-center hover:bg-len-border transition-colors border border-len-border"
          >
            <span className="text-len-purple font-bold text-sm">
              {user?.firstName?.[0]?.toUpperCase() ?? '?'}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
