'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { PINInput } from '@/components/ui/pin-input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { apiClient } from '@/lib/api-client';

// Phase 1 — active; Phase 2+ shown as "coming soon" on hero
const ACTIVE_NETWORK = [
  { code: 'QUETZA',  flag: '🇬🇹', fiat: 'GTQ', country: 'Guatemala',  active: true  },
  { code: 'MEXCOIN', flag: '🇲🇽', fiat: 'MXN', country: 'México',      active: true  },
  { code: 'LEMPI',   flag: '🇭🇳', fiat: 'HNL', country: 'Honduras',    active: true  },
  { code: 'COLON',   flag: '🇸🇻', fiat: 'USD', country: 'El Salvador', active: false },
  { code: 'DOLAR',   flag: '🌎',  fiat: 'USD', country: 'USA',          active: false },
  { code: 'TIKAL',   flag: '🇧🇿', fiat: 'BZD', country: 'Belize',      active: false },
];

export default function LoginPage() {
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();

  const [step, setStep] = useState<'phone' | 'pin'>('phone');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Demo quick-login — one click, no PIN step needed
  async function demoLogin(demoPhone: string) {
    setPhone(demoPhone);
    setLoading(true);
    setError('');
    // Inline the demo logic with pin = '111111'
    const demos: Record<string, { name: string; coin: string; balance: string; fiatBalance: string; usd: number; country: string }> = {
      '11111': { name: 'Carlos Mendoza',  coin: 'QUETZA',  balance: '50000.00',  fiatBalance: '25000.00',  usd: 9500.00, country: 'GT' },
      '22222': { name: 'Sofía Hernández', coin: 'MEXCOIN', balance: '250000.00', fiatBalance: '100000.00', usd: 7200.00, country: 'MX' },
      '33333': { name: 'José Reyes',      coin: 'LEMPI',   balance: '500000.00', fiatBalance: '200000.00', usd: 8500.00, country: 'HN' },
    };
    const key = Object.keys(demos).find(k => demoPhone.includes(k));
    const p   = key ? demos[key] : demos['11111'];

    setTokens('demo-token', 'demo-refresh');
    setUser({
      id: `demo-${p.country.toLowerCase()}`,
      phoneNumber: demoPhone,
      phoneVerified: true,
      firstName: p.name.split(' ')[0],
      lastName:  p.name.split(' ')[1],
      displayName: p.name,
      country: p.country,
      kycLevel: 2, kycStatus: 'approved', status: 'active',
      createdAt: new Date().toISOString(),
    });

    const coin     = p.coin as import('@/store/wallet.store').CoinCode;
    const coinMeta = (await import('@/store/wallet.store')).COINS[coin];
    const { setWallets, setTransactions } = (await import('@/store/wallet.store')).useWalletStore.getState();
    const userId   = `demo-${p.country.toLowerCase()}`;

    const now  = Date.now();
    const ago  = (ms: number) => new Date(now - ms).toISOString();
    const peer1 = (p.country === 'MX' ? 'QUETZA' : 'MEXCOIN') as import('@/store/wallet.store').CoinCode;
    const peer2 = (p.country === 'HN' ? 'MEXCOIN' : 'LEMPI')  as import('@/store/wallet.store').CoinCode;

    const defaultWallets: import('@/store/wallet.store').WalletBalance[] = [{
      coin, balance: p.balance, available: p.balance,
      fiatBalance: p.fiatBalance, fiatCurrency: coinMeta.fiat, balanceUSD: p.usd,
    }];
    const defaultTxs: import('@/store/wallet.store').Transaction[] = [
      { id: 'LEN-20260410-FLD-DEMO1', type: 'fiat_load', status: 'completed', direction: 'received',
        fromCoin: coin, toCoin: coin, fromAmount: p.fiatBalance, toAmount: p.fiatBalance, fee: '0',
        description: `Depósito bancario — ${coinMeta.fiat}`, createdAt: ago(8*86400000), completedAt: ago(8*86400000) },
      { id: 'LEN-20260411-TKB-DEMO2', type: 'token_buy', status: 'completed', direction: 'internal',
        fromCoin: coin, toCoin: coin,
        fromAmount: (parseFloat(p.fiatBalance)*0.6).toFixed(2), toAmount: (parseFloat(p.balance)*0.6).toFixed(2),
        fee: '0.0000', feePercent: 0, description: `Compra de tokens ${coin} · 0%`,
        createdAt: ago(7*86400000), completedAt: ago(7*86400000) },
      { id: 'LEN-20260411-FXS-DEMO3', type: 'fx_swap', status: 'completed', direction: 'received',
        fromCoin: peer1, toCoin: coin, fromAmount: '2000.00',
        toAmount: p.country==='MX'?'9760.00':p.country==='HN'?'6200.00':'260.00',
        fee: '6.00', feePercent: 0.003, description: 'Pago recibido de Guatemala', senderName: 'María López',
        createdAt: ago(6*86400000), completedAt: ago(6*86400000) },
      { id: 'LEN-20260412-TRF-DEMO4', type: 'transfer', status: 'completed', direction: 'sent',
        fromCoin: coin, toCoin: coin, fromAmount: '5000.00', toAmount: '5000.00', fee: '0',
        description: 'Pago a familia', recipientName: 'Ana Martínez',
        createdAt: ago(5*86400000), completedAt: ago(5*86400000) },
      { id: 'LEN-20260413-TRF-DEMO7', type: 'transfer', status: 'completed', direction: 'received',
        fromCoin: coin, toCoin: coin, fromAmount: '12500.00', toAmount: '12500.00', fee: '0',
        description: 'Remesa recibida', senderName: 'Carlos Ruiz',
        createdAt: ago(2*86400000), completedAt: ago(2*86400000) },
      { id: 'LEN-20260413-TKS-DEMO8', type: 'token_sell', status: 'completed', direction: 'internal',
        fromCoin: coin, toCoin: coin, fromAmount: '3000.00', toAmount: '2985.00',
        fee: '15.0000', feePercent: 0.005, description: `Venta de tokens ${coin} · 0.5%`,
        createdAt: ago(86400000), completedAt: ago(86400000) },
    ];

    try {
      const { loadUserSnapshot, saveUserSnapshot } = await import('@/lib/user-db');
      const snapshot = await loadUserSnapshot(userId);
      if (snapshot?.wallets?.length) {
        setWallets(snapshot.wallets);
        setTransactions(snapshot.transactions);
        if (snapshot.bankAccounts?.length) {
          const { useBankStore } = await import('@/store/bank.store');
          useBankStore.setState({ accounts: snapshot.bankAccounts });
        }
      } else {
        setWallets(defaultWallets);
        setTransactions(defaultTxs);
        saveUserSnapshot(userId, { wallets: defaultWallets, transactions: defaultTxs, bankAccounts: [], updatedAt: new Date().toISOString() });
      }
      const { startWalletSync } = await import('@/lib/wallet-sync');
      startWalletSync(userId);
    } catch {
      setWallets(defaultWallets);
      setTransactions(defaultTxs);
    }

    setLoading(false);
    router.push('/dashboard');
  }

  async function handleLogin() {
    if (pin.length < 6) return;
    setLoading(true);
    setError('');

    // ── DEMO MODE ──────────────────────────────────────────────
    if (pin === '111111') {
      // fiatBalance = GTQ/MXN/HNL deposited from bank, not yet converted to tokens
      // balance     = tokens already purchased
      const demos: Record<string, { name: string; coin: string; balance: string; fiatBalance: string; usd: number; country: string }> = {
        '11111': { name: 'Carlos Mendoza',  coin: 'QUETZA',  balance: '50000.00',  fiatBalance: '25000.00',  usd: 9500.00, country: 'GT' },
        '22222': { name: 'Sofía Hernández', coin: 'MEXCOIN', balance: '250000.00', fiatBalance: '100000.00', usd: 7200.00, country: 'MX' },
        '33333': { name: 'José Reyes',      coin: 'LEMPI',   balance: '500000.00', fiatBalance: '200000.00', usd: 8500.00, country: 'HN' },
      };
      const key = Object.keys(demos).find(k => phone.includes(k));
      const p = key ? demos[key] : demos['11111'];

      setTokens('demo-token', 'demo-refresh');
      setUser({
        id: `demo-${p.country.toLowerCase()}`,
        phoneNumber: phone || '11111',
        phoneVerified: true,
        firstName: p.name.split(' ')[0],
        lastName: p.name.split(' ')[1],
        displayName: p.name,
        country: p.country,
        kycLevel: 2,
        kycStatus: 'approved',
        status: 'active',
        createdAt: new Date().toISOString(),
      });

      const coin    = p.coin as import('@/store/wallet.store').CoinCode;
      const coinMeta = (await import('@/store/wallet.store')).COINS[coin];
      const { setWallets, setTransactions } = (await import('@/store/wallet.store')).useWalletStore.getState();
      const userId = `demo-${p.country.toLowerCase()}`;

      // ── Build demo defaults (always available, Firestore is best-effort) ──────
      const now   = Date.now();
      const ago   = (ms: number) => new Date(now - ms).toISOString();
      const peer1 = (p.country === 'MX' ? 'QUETZA' : 'MEXCOIN') as import('@/store/wallet.store').CoinCode;
      const peer2 = (p.country === 'HN' ? 'MEXCOIN' : 'LEMPI')  as import('@/store/wallet.store').CoinCode;

      const defaultWallets: import('@/store/wallet.store').WalletBalance[] = [{
        coin,
        balance:      p.balance,
        available:    p.balance,
        fiatBalance:  p.fiatBalance,
        fiatCurrency: coinMeta.fiat,
        balanceUSD:   p.usd,
      }];

      const defaultTxs: import('@/store/wallet.store').Transaction[] = [
        { id: 'LEN-20260410-FLD-DEMO1', type: 'fiat_load', status: 'completed', direction: 'received',
          fromCoin: coin, toCoin: coin, fromAmount: p.fiatBalance, toAmount: p.fiatBalance, fee: '0',
          description: `Depósito bancario — ${coinMeta.fiat}`,
          createdAt: ago(8 * 86400000), completedAt: ago(8 * 86400000) },
        { id: 'LEN-20260411-TKB-DEMO2', type: 'token_buy', status: 'completed', direction: 'internal',
          fromCoin: coin, toCoin: coin,
          fromAmount: (parseFloat(p.fiatBalance) * 0.6).toFixed(2),
          toAmount:   (parseFloat(p.balance) * 0.6).toFixed(2),
          fee: '0.0000', feePercent: 0,
          description: `Compra de tokens ${coin} · 0%`,
          createdAt: ago(7 * 86400000), completedAt: ago(7 * 86400000) },
        { id: 'LEN-20260411-FXS-DEMO3', type: 'fx_swap', status: 'completed', direction: 'received',
          fromCoin: peer1, toCoin: coin, fromAmount: '2000.00',
          toAmount: p.country === 'MX' ? '9760.00' : p.country === 'HN' ? '6200.00' : '260.00',
          fee: '6.00', feePercent: 0.003, description: 'Pago recibido de Guatemala', senderName: 'María López',
          createdAt: ago(6 * 86400000), completedAt: ago(6 * 86400000) },
        { id: 'LEN-20260412-TRF-DEMO4', type: 'transfer', status: 'completed', direction: 'sent',
          fromCoin: coin, toCoin: coin, fromAmount: '5000.00', toAmount: '5000.00', fee: '0',
          description: 'Pago a familia', recipientName: 'Ana Martínez',
          createdAt: ago(5 * 86400000), completedAt: ago(5 * 86400000) },
        { id: 'LEN-20260412-TKB-DEMO5', type: 'token_buy', status: 'completed', direction: 'internal',
          fromCoin: coin, toCoin: coin,
          fromAmount: (parseFloat(p.fiatBalance) * 0.3).toFixed(2),
          toAmount:   (parseFloat(p.balance) * 0.3).toFixed(2),
          fee: '0.0000', feePercent: 0,
          description: `Compra de tokens ${coin} · 0%`,
          createdAt: ago(4 * 86400000), completedAt: ago(4 * 86400000) },
        { id: 'LEN-20260412-FXS-DEMO6', type: 'fx_swap', status: 'completed', direction: 'sent',
          fromCoin: coin, toCoin: peer2, fromAmount: '8000.00',
          toAmount: p.country === 'GT' ? '323440.00' : p.country === 'MX' ? '78320.00' : '197600.00',
          fee: '40.00', feePercent: 0.005, description: 'Envío a Honduras', recipientName: 'Pedro Reyes',
          createdAt: ago(3 * 86400000), completedAt: ago(3 * 86400000) },
        { id: 'LEN-20260413-TRF-DEMO7', type: 'transfer', status: 'completed', direction: 'received',
          fromCoin: coin, toCoin: coin, fromAmount: '12500.00', toAmount: '12500.00', fee: '0',
          description: 'Remesa recibida', senderName: 'Carlos Ruiz',
          createdAt: ago(2 * 86400000), completedAt: ago(2 * 86400000) },
        { id: 'LEN-20260413-TKS-DEMO8', type: 'token_sell', status: 'completed', direction: 'internal',
          fromCoin: coin, toCoin: coin, fromAmount: '3000.00', toAmount: '2985.00',
          fee: '15.0000', feePercent: 0.005,
          description: `Venta de tokens ${coin} · 0.5%`,
          createdAt: ago(86400000), completedAt: ago(86400000) },
        { id: 'LEN-20260413-TRF-DEMO9', type: 'transfer', status: 'pending', direction: 'sent',
          fromCoin: coin, toCoin: peer1, fromAmount: '1500.00', toAmount: '3870.00',
          fee: '7.50', feePercent: 0.005,
          description: 'Envío a México — en proceso', recipientName: 'Sofía Hernández',
          createdAt: ago(1800000) },
      ];

      // ── Try Firestore (best-effort — don't block login if it fails) ──────────
      try {
        const { loadUserSnapshot, saveUserSnapshot } = await import('@/lib/user-db');
        const snapshot = await loadUserSnapshot(userId);

        if (snapshot?.wallets?.length) {
          setWallets(snapshot.wallets);
          setTransactions(snapshot.transactions);
          if (snapshot.bankAccounts?.length) {
            const { useBankStore } = await import('@/store/bank.store');
            useBankStore.setState({ accounts: snapshot.bankAccounts });
          }
        } else {
          setWallets(defaultWallets);
          setTransactions(defaultTxs);
          saveUserSnapshot(userId, {
            wallets:      defaultWallets,
            transactions: defaultTxs,
            bankAccounts: [],
            updatedAt:    new Date().toISOString(),
          });
        }

        const { startWalletSync } = await import('@/lib/wallet-sync');
        startWalletSync(userId);
      } catch {
        // Firestore unavailable — use local defaults (still fully functional)
        setWallets(defaultWallets);
        setTransactions(defaultTxs);
      }

      setLoading(false);
      router.push('/dashboard');
      return;
    }
    // ── FIN DEMO ───────────────────────────────────────────────

    try {
      const res = await apiClient.post('/auth/login', { phoneNumber: phone, pin });
      setTokens(res.data.accessToken, res.data.refreshToken);
      setUser(res.data.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
        ?? 'Número o PIN incorrecto';
      setError(msg);
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── LEFT PANEL — hero ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-len-gradient flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
          <div className="absolute -bottom-48 -left-24 w-[500px] h-[500px] rounded-full bg-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/3" />
        </div>

        {/* Logo */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-len-lg">
              <span className="text-len-purple font-black text-xl">L</span>
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">LEN</span>
          </div>
        </div>

        {/* Headline */}
        <div className="relative space-y-6">
          <div>
            <h1 className="text-5xl font-black text-white leading-tight">
              Por que cada<br />
              <span className="text-len-violet">LEN</span> cuenta.
            </h1>
            <p className="mt-4 text-white/70 text-lg leading-relaxed max-w-sm">
              La primera red de TokenCoins nativa de Mesoamérica.
              Un token por país, tipo de cambio automático, comisiones desde <strong className="text-white">0.3%</strong>.
            </p>
          </div>

          {/* Coin network pills */}
          <div>
            <p className="text-white/50 text-xs uppercase tracking-widest mb-3 font-semibold">Red TokenCoin</p>
            <div className="flex flex-wrap gap-2">
              {ACTIVE_NETWORK.map(c => (
                <div key={c.code}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 border backdrop-blur
                    ${c.active
                      ? 'bg-white/15 border-white/30'
                      : 'bg-white/5 border-white/10 opacity-60'}`}>
                  <span className="text-sm">{c.flag}</span>
                  <span className={`text-xs font-bold ${c.active ? 'text-white' : 'text-white/60'}`}>{c.code}</span>
                  {c.active
                    ? <span className="text-white/50 text-xs">=1 {c.fiat}</span>
                    : <span className="text-white/30 text-[10px] italic">pronto</span>
                  }
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            {[
              { value: '3', label: 'Países activos', sub: '+5 en camino' },
              { value: '0.3%', label: 'Fee mínimo', sub: 'vs 5.5% WU' },
              { value: '$800B', label: 'Mercado TAM', sub: 'remesas 2024' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-2xl font-black text-white">{s.value}</div>
                <div className="text-white/50 text-xs">{s.label}</div>
                <div className="text-white/30 text-[10px] mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-len-surface">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-len-gradient rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-lg">L</span>
          </div>
          <span className="text-len-dark font-bold text-xl">LEN</span>
        </div>

        <div className="w-full max-w-sm">
          {step === 'phone' ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-len-dark">Bienvenido</h2>
                <p className="text-gray-500 text-sm mt-1">Ingresa tu número para continuar</p>
              </div>

              {/* Demo hint */}
              <div className="bg-len-light rounded-2xl p-4 border border-len-border">
                <p className="text-xs font-semibold text-len-purple mb-2">🧪 Demo — escoge un país:</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { num: '11111', flag: '🇬🇹', label: 'Guatemala', coin: 'QUETZA' },
                    { num: '22222', flag: '🇲🇽', label: 'México',    coin: 'MEXCOIN' },
                    { num: '33333', flag: '🇭🇳', label: 'Honduras',  coin: 'LEMPI' },
                  ].map(d => (
                    <button
                      key={d.num}
                      onClick={() => demoLogin(d.num)}
                      disabled={loading}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 border-len-border bg-white/60 hover:border-len-purple hover:bg-white hover:shadow-len transition-all text-center disabled:opacity-50"
                    >
                      <span className="text-xl">{d.flag}</span>
                      <span className="text-xs font-bold text-len-dark">{d.coin}</span>
                      <span className="text-[10px] text-gray-400">{d.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-2 text-center">Un click = entrar directo 🚀</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Número de teléfono</label>
                <input
                  type="tel"
                  className="input-field text-lg font-semibold"
                  placeholder="Ej. 50211111111"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <button
                className="btn-primary w-full"
                onClick={() => { if (phone.length >= 5) setStep('pin'); }}
                disabled={phone.length < 5}
              >
                Continuar →
              </button>

              <p className="text-center text-sm text-gray-500">
                ¿Primera vez?{' '}
                <Link href="/register" className="text-len-purple font-semibold hover:underline">
                  Crear cuenta gratis
                </Link>
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <button
                onClick={() => { setStep('phone'); setPin(''); setError(''); }}
                className="flex items-center gap-2 text-len-purple text-sm font-medium hover:underline"
              >
                ← Cambiar número
              </button>

              <div>
                <h2 className="text-2xl font-bold text-len-dark">Tu PIN</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Ingresa el PIN de 6 dígitos para <span className="font-semibold text-len-dark">{phone}</span>
                </p>
              </div>

              <PINInput
                length={6}
                value={pin}
                onChange={setPin}
                onComplete={handleLogin}
                className="mb-2"
              />

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 text-sm text-center">
                  {error}
                </div>
              )}

              <button
                className="btn-primary w-full"
                onClick={handleLogin}
                disabled={pin.length < 6 || loading}
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Entrar a LEN'}
              </button>

              <Link href="/pin/reset" className="block text-center text-len-purple text-sm hover:underline">
                ¿Olvidaste tu PIN?
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
