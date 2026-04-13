'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';

interface KYCStatus {
  kycLevel: number;
  kycStatus: string;
  requiredDocuments: string[];
  nextLevel: number | null;
  limits: { daily: number; monthly: number; singleTx: number };
}

const levelNames = ['Anónimo', 'Básico', 'Verificado', 'Empresarial'];
const levelDescriptions = [
  'Solo necesitas tu número de teléfono. Límite $50/día.',
  'Foto de tu DPI/pasaporte + selfie. Límite $200/día.',
  'Verificación completa de identidad. Límite $2,000/día.',
  'Documentación empresarial. Sin límites prácticos.',
];

export default function KYCPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [kycData, setKycData] = useState<KYCStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    apiClient.get('/kyc/status')
      .then(res => setKycData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function startKYC() {
    setStarting(true);
    try {
      const res = await apiClient.post('/kyc/initiate', {
        returnUrl: `${window.location.origin}/kyc`,
      });
      window.location.href = res.data.redirectUrl;
    } catch {
      setStarting(false);
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <LoadingSpinner />
    </div>
  );

  return (
    <div className="max-w-md mx-auto px-4 pb-20">
      <div className="pt-6 mb-6">
        <button onClick={() => router.back()} className="text-mondega-green text-sm flex items-center gap-1 mb-4">
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Verificación de identidad</h1>
        <p className="text-gray-500 text-sm">Aumenta tus límites completando la verificación</p>
      </div>

      {/* Level Progress */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Nivel actual</p>
            <p className="text-xl font-bold text-gray-900">{levelNames[kycData?.kycLevel ?? 0]}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium
            ${kycData?.kycStatus === 'approved' ? 'bg-green-100 text-green-800'
              : kycData?.kycStatus === 'in_review' ? 'bg-yellow-100 text-yellow-800'
              : kycData?.kycStatus === 'rejected' ? 'bg-red-100 text-red-800'
              : 'bg-gray-100 text-gray-800'}`}>
            {kycData?.kycStatus === 'approved' ? 'Aprobado'
              : kycData?.kycStatus === 'in_review' ? 'En revisión'
              : kycData?.kycStatus === 'rejected' ? 'Rechazado'
              : 'Pendiente'}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center mb-4">
          {[{ label: 'Día', value: kycData?.limits.daily },
            { label: 'Transacción', value: kycData?.limits.singleTx },
            { label: 'Mes', value: kycData?.limits.monthly }].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-lg font-bold text-gray-900">${item.value?.toLocaleString()}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KYC Levels */}
      <div className="space-y-3 mb-6">
        {levelNames.map((name, i) => (
          <div
            key={i}
            className={`card transition-all
              ${i === (kycData?.kycLevel ?? 0) ? 'border-2 border-mondega-green bg-green-50'
                : i < (kycData?.kycLevel ?? 0) ? 'opacity-60'
                : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                ${i < (kycData?.kycLevel ?? 0) ? 'bg-green-500 text-white'
                  : i === (kycData?.kycLevel ?? 0) ? 'bg-mondega-green text-white'
                  : 'bg-gray-100 text-gray-400'}`}>
                {i < (kycData?.kycLevel ?? 0) ? '✓' : i + 1}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{name}</p>
                <p className="text-gray-500 text-xs">{levelDescriptions[i]}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action */}
      {kycData?.kycStatus !== 'approved' && kycData?.nextLevel !== null && (
        <button
          className="btn-primary w-full"
          onClick={startKYC}
          disabled={starting || kycData?.kycStatus === 'in_review'}
        >
          {starting ? <LoadingSpinner size="sm" />
            : kycData?.kycStatus === 'in_review' ? 'En revisión — espera el resultado'
            : kycData?.kycStatus === 'rejected' ? 'Reintentar verificación'
            : `Subir a nivel ${levelNames[kycData?.nextLevel ?? 1]}`}
        </button>
      )}

      {kycData?.kycStatus === 'rejected' && (
        <div className="card bg-red-50 border-red-200 mt-4">
          <p className="text-red-800 text-sm">
            Tu verificación fue rechazada. Asegúrate de que los documentos sean legibles
            y que la selfie sea clara. Puedes intentarlo nuevamente.
          </p>
        </div>
      )}
    </div>
  );
}
