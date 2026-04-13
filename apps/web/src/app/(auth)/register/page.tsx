'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PhoneInput } from '@/components/ui/phone-input';
import { PINInput } from '@/components/ui/pin-input';
import { CountrySelector } from '@/components/ui/country-selector';
import { OTPInput } from '@/components/ui/otp-input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';

type Step = 'phone' | 'country' | 'pin' | 'otp';

export default function RegisterPage() {
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('GT');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/auth/register', {
        phoneNumber: phone,
        country,
        pin,
      });
      setStep('otp');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    if (otp.length < 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/auth/verify-phone', { phoneNumber: phone, otp });
      setTokens(res.data.accessToken, res.data.refreshToken);
      setUser(res.data.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Código incorrecto');
      setOtp('');
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    { id: 'phone', label: 'Teléfono' },
    { id: 'country', label: 'País' },
    { id: 'pin', label: 'PIN' },
    { id: 'otp', label: 'Verificar' },
  ];

  const currentStepIdx = steps.findIndex(s => s.id === step);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-mondega-dark to-mondega-green px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-2xl shadow-lg mb-3">
            <span className="text-2xl font-bold text-mondega-green">M</span>
          </div>
          <h1 className="text-xl font-bold text-white">Crear cuenta Mondega</h1>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${i < currentStepIdx ? 'bg-green-300 text-green-900'
                  : i === currentStepIdx ? 'bg-white text-mondega-green'
                  : 'bg-white/20 text-white/50'}`}>
                {i < currentStepIdx ? '✓' : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${i < currentStepIdx ? 'bg-green-300' : 'bg-white/20'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {step === 'phone' && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Tu número de teléfono</h2>
              <p className="text-gray-500 text-sm mb-6">Usaremos este número para verificar tu identidad</p>
              <PhoneInput value={phone} onChange={setPhone} className="mb-6" />
              <button className="btn-primary w-full" onClick={() => setStep('country')} disabled={phone.length < 8}>
                Continuar
              </button>
            </>
          )}

          {step === 'country' && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">¿En qué país estás?</h2>
              <p className="text-gray-500 text-sm mb-6">Esto determina tu moneda digital principal</p>
              <CountrySelector value={country} onChange={setCountry} className="mb-6" />
              <button className="btn-primary w-full" onClick={() => setStep('pin')}>
                Continuar
              </button>
            </>
          )}

          {step === 'pin' && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Crea tu PIN</h2>
              <p className="text-gray-500 text-sm mb-4">6 dígitos. Úsalo para autorizar transacciones.</p>

              <p className="text-xs font-medium text-gray-600 mb-2">Nuevo PIN</p>
              <PINInput length={6} value={pin} onChange={setPin} className="mb-4" />

              <p className="text-xs font-medium text-gray-600 mb-2">Confirmar PIN</p>
              <PINInput length={6} value={confirmPin} onChange={setConfirmPin} className="mb-4" />

              {pin.length === 6 && confirmPin.length === 6 && pin !== confirmPin && (
                <p className="text-red-500 text-sm mb-4">Los PINs no coinciden</p>
              )}

              {error && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm mb-4">{error}</div>}

              <button
                className="btn-primary w-full"
                onClick={handleRegister}
                disabled={pin.length < 6 || pin !== confirmPin || loading}
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Crear cuenta'}
              </button>
            </>
          )}

          {step === 'otp' && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Verificar número</h2>
              <p className="text-gray-500 text-sm mb-6">
                Enviamos un código de 6 dígitos a <span className="font-medium text-gray-700">{phone}</span>
              </p>

              <OTPInput value={otp} onChange={setOtp} onComplete={handleVerifyOTP} className="mb-4" />

              {error && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm mb-4">{error}</div>}

              <button
                className="btn-primary w-full"
                onClick={handleVerifyOTP}
                disabled={otp.length < 6 || loading}
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Verificar'}
              </button>

              <button
                onClick={() => apiClient.post('/auth/resend-otp', { phoneNumber: phone })}
                className="block text-center text-mondega-green text-sm mt-4 w-full"
              >
                Reenviar código
              </button>
            </>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <span className="text-gray-500 text-sm">¿Ya tienes cuenta? </span>
            <Link href="/login" className="text-mondega-green font-semibold text-sm">Inicia sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
