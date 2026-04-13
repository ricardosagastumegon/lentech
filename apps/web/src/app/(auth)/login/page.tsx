'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth.store';
import { PINInput } from '@/components/ui/pin-input';
import { PhoneInput } from '@/components/ui/phone-input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { apiClient } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();

  const [step, setStep] = useState<'phone' | 'pin'>('phone');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (pin.length < 6) return;
    setLoading(true);
    setError('');

    try {
      const res = await apiClient.post('/auth/login', { phoneNumber: phone, pin });
      setTokens(res.data.accessToken, res.data.refreshToken);
      setUser(res.data.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error al iniciar sesión';
      setError(msg);
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-mondega-dark to-mondega-green px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-3xl font-bold text-mondega-green">M</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Mondega Digital</h1>
          <p className="text-green-200 text-sm mt-1">La moneda digital de Mesoamérica</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {step === 'phone' ? (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Iniciar sesión</h2>
              <p className="text-gray-500 text-sm mb-6">Ingresa tu número de teléfono</p>

              <PhoneInput
                value={phone}
                onChange={setPhone}
                className="mb-6"
              />

              <button
                className="btn-primary w-full"
                onClick={() => { if (phone.length >= 8) setStep('pin'); }}
                disabled={phone.length < 8}
              >
                Continuar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep('phone'); setPin(''); setError(''); }}
                className="text-mondega-green text-sm mb-4 flex items-center gap-1"
              >
                ← Cambiar número
              </button>

              <h2 className="text-xl font-bold text-gray-900 mb-1">Tu PIN</h2>
              <p className="text-gray-500 text-sm mb-6">
                Ingresa tu PIN de 6 dígitos para <span className="font-medium text-gray-700">{phone}</span>
              </p>

              <PINInput
                length={6}
                value={pin}
                onChange={setPin}
                onComplete={handleLogin}
                className="mb-4"
              />

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-4">
                  {error}
                </div>
              )}

              <button
                className="btn-primary w-full"
                onClick={handleLogin}
                disabled={pin.length < 6 || loading}
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Entrar'}
              </button>

              <Link href="/pin/reset" className="block text-center text-mondega-green text-sm mt-4">
                ¿Olvidaste tu PIN?
              </Link>
            </>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <span className="text-gray-500 text-sm">¿No tienes cuenta? </span>
            <Link href="/register" className="text-mondega-green font-semibold text-sm">
              Regístrate gratis
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
