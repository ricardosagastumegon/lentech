'use client';

/**
 * Login real — autentica contra POST /api/auth/token
 *
 * Flujo:
 *   1. Usuario escribe teléfono → continúa
 *   2. Usuario escribe PIN de 6 dígitos
 *   3. Backend valida contra Firestore (PIN hasheado con scrypt)
 *   4. Si OK → JWT firmado HS256, válido 24h
 *   5. Cliente guarda token + redirige al dashboard
 *
 * Sin demos hardcoded — todos los usuarios viven en Firestore.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { PINInput } from '@/components/ui/pin-input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Network display (informativo, no funcional)
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

  const [step,    setStep]    = useState<'phone' | 'pin'>('phone');
  const [phone,   setPhone]   = useState('');
  const [pin,     setPin]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleLogin() {
    if (pin.length < 6) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone, pin }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setError(json.error ?? 'Credenciales inválidas');
        setPin('');
        setLoading(false);
        return;
      }

      const { access_token, user } = json.data;

      setTokens(access_token, '');
      setUser({
        id:           user.user_id,
        phoneNumber:  phone,
        phoneVerified: true,
        firstName:    user.display_name.split(' ')[0] ?? user.display_name,
        lastName:     user.display_name.split(' ').slice(1).join(' '),
        displayName:  user.display_name,
        country:      user.country,
        kycLevel:     2,
        kycStatus:    'approved',
        status:       'active',
        createdAt:    new Date().toISOString(),
      });

      // Cargar snapshot del usuario si existe (best-effort)
      try {
        const { loadUserSnapshot } = await import('@/lib/user-db');
        const { setWallets, setTransactions } = (await import('@/store/wallet.store')).useWalletStore.getState();
        const snapshot = await loadUserSnapshot(user.user_id);
        if (snapshot?.wallets?.length) {
          setWallets(snapshot.wallets);
          setTransactions(snapshot.transactions);
          if (snapshot.bankAccounts?.length) {
            const { useBankStore } = await import('@/store/bank.store');
            useBankStore.setState({ accounts: snapshot.bankAccounts });
          }
        }
        const { startWalletSync } = await import('@/lib/wallet-sync');
        startWalletSync(user.user_id);
      } catch { /* no bloquea el login si falla */ }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
      setPin('');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── LEFT PANEL — hero ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-len-gradient flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
          <div className="absolute -bottom-48 -left-24 w-[500px] h-[500px] rounded-full bg-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/3" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-len-lg">
              <span className="text-len-purple font-black text-xl">L</span>
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">LEN</span>
          </div>
        </div>

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

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            {[
              { value: '3',    label: 'Países activos', sub: '+5 en camino' },
              { value: '0.3%', label: 'Fee mínimo',     sub: 'vs 5.5% WU' },
              { value: '$800B',label: 'Mercado TAM',    sub: 'remesas 2024' },
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Número de teléfono</label>
                <input
                  type="tel"
                  className="input-field text-lg font-semibold"
                  placeholder="Ej. 50211111111"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => { if (e.key === 'Enter' && phone.length >= 5) setStep('pin'); }}
                  autoFocus
                />
                <p className="text-[11px] text-gray-400 mt-2">
                  Formato internacional sin espacios (ej. 502, 52, 504 + tu número)
                </p>
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
                  Crear cuenta
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
