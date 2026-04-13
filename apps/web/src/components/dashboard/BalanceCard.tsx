'use client';

import { useState } from 'react';

interface Wallet {
  coin: string;
  balance: string;
  balanceUSD: number;
  blockchainAddress: string;
}

interface BalanceCardProps {
  wallets: Wallet[];
  totalUSD: number;
}

export function BalanceCard({ wallets, totalUSD }: BalanceCardProps) {
  const [hidden, setHidden] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const wallet = wallets[selectedIdx];

  return (
    <div className="bg-gradient-to-br from-mondega-green to-green-700 rounded-2xl p-6 text-white shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <span className="text-green-200 text-sm font-medium">Balance total</span>
        <button
          onClick={() => setHidden(h => !h)}
          className="text-green-200 hover:text-white transition-colors text-xs"
        >
          {hidden ? 'Mostrar' : 'Ocultar'}
        </button>
      </div>

      <div className="mb-4">
        <div className="text-3xl font-bold tracking-tight">
          {hidden ? '••••••' : `$${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </div>
        <div className="text-green-200 text-sm mt-1">USD equivalente</div>
      </div>

      {wallets.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {wallets.map((w, i) => (
            <button
              key={w.coin}
              onClick={() => setSelectedIdx(i)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
                ${i === selectedIdx ? 'bg-white text-mondega-green' : 'bg-white/20 text-white hover:bg-white/30'}`}
            >
              {w.coin}
            </button>
          ))}
        </div>
      )}

      {wallet && (
        <div className="bg-white/10 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-green-100 text-xs">{wallet.coin}</span>
            <span className="font-mono font-bold text-sm">
              {hidden ? '••••' : Number(wallet.balance).toLocaleString()}
            </span>
          </div>
          <div className="text-green-300 text-xs mt-1 font-mono truncate">
            {wallet.blockchainAddress.slice(0, 6)}...{wallet.blockchainAddress.slice(-4)}
          </div>
        </div>
      )}
    </div>
  );
}
