'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

// KYC limits per level (USD equivalent)
const KYC_LEVELS = [
  { name: 'Anónimo',    desc: 'Solo tu número de teléfono.',                  daily: 50,    monthly: 200,    single: 50    },
  { name: 'Básico',     desc: 'Foto de DPI/pasaporte + selfie.',              daily: 200,   monthly: 1_000,  single: 200   },
  { name: 'Verificado', desc: 'Verificación completa de identidad.',          daily: 2_000, monthly: 10_000, single: 2_000 },
  { name: 'Empresarial',desc: 'Documentación empresarial. Sin límites.',      daily: 0,     monthly: 0,      single: 0     },
];

// Documents required to reach each level
const REQUIRED_DOCS = [
  [],
  ['Número de teléfono verificado'],
  ['DPI / Pasaporte vigente', 'Selfie con documento', 'Comprobante de domicilio'],
  ['Documentos corporativos', 'Acta de constitución', 'Identificación de representante legal'],
];

export default function KYCPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Use user from auth store — no API call needed in demo
  const currentLevel = user?.kycLevel ?? 0;
  const kycStatus    = user?.kycStatus ?? 'pending';
  const info         = KYC_LEVELS[currentLevel];

  const statusLabel = kycStatus === 'approved' ? 'Aprobado'
    : kycStatus === 'in_review' ? 'En revisión'
    : kycStatus === 'rejected'  ? 'Rechazado'
    : 'Pendiente';

  const statusColor = kycStatus === 'approved' ? 'bg-emerald-100 text-emerald-700'
    : kycStatus === 'in_review' ? 'bg-amber-100 text-amber-700'
    : kycStatus === 'rejected'  ? 'bg-red-100 text-red-700'
    : 'bg-gray-100 text-gray-500';

  const fmtUSD = (n: number) => n === 0 ? 'Sin límite' : `$${n.toLocaleString()} USD`;

  return (
    <div className="max-w-md mx-auto px-4 pb-20">
      <div className="pt-6 mb-6">
        <button onClick={() => router.back()} className="btn-ghost mb-4 -ml-2 text-sm">
          ← Volver
        </button>
        <h1 className="text-2xl font-black text-len-dark">Verificación KYC</h1>
        <p className="text-gray-500 text-sm mt-1">Aumenta tus límites completando la verificación</p>
      </div>

      {/* Current level card */}
      <div className="card mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-0.5">Nivel actual</p>
            <p className="text-xl font-black text-len-dark">{info.name}</p>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        {/* Limits grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Por día',    value: fmtUSD(info.daily)   },
            { label: 'Por tx',     value: fmtUSD(info.single)  },
            { label: 'Por mes',    value: fmtUSD(info.monthly) },
          ].map(item => (
            <div key={item.label} className="bg-len-light rounded-2xl py-3 px-2 border border-len-border">
              <p className="text-sm font-black text-len-dark">{item.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Level progression */}
      <div className="space-y-3 mb-6">
        {KYC_LEVELS.map((lvl, i) => {
          const isPast    = i < currentLevel;
          const isCurrent = i === currentLevel;
          const isFuture  = i > currentLevel;
          return (
            <div key={i} className={`card transition-all ${
              isCurrent ? 'border-2 border-len-purple bg-len-light'
              : isPast  ? 'opacity-60 bg-gray-50'
              : ''
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5 ${
                  isPast    ? 'bg-emerald-500 text-white'
                  : isCurrent ? 'bg-len-purple text-white'
                  : 'bg-len-border text-gray-400'
                }`}>
                  {isPast ? '✓' : i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-len-dark text-sm">{lvl.name}</p>
                    {isCurrent && <span className="text-[10px] bg-len-purple text-white px-2 py-0.5 rounded-full font-bold">Actual</span>}
                    {isPast    && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Completado</span>}
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{lvl.desc}</p>
                  {isFuture && REQUIRED_DOCS[i].length > 0 && (
                    <ul className="space-y-0.5">
                      {REQUIRED_DOCS[i].map(doc => (
                        <li key={doc} className="text-[11px] text-gray-400 flex items-center gap-1">
                          <span className="text-gray-300">›</span>{doc}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-len-dark">{fmtUSD(lvl.monthly)}</p>
                  <p className="text-[10px] text-gray-400">/ mes</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action — backend not connected yet */}
      {currentLevel < 3 && kycStatus !== 'in_review' && (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <p className="text-xs font-bold text-amber-700 mb-1">Verificación KYC — próximamente</p>
            <p className="text-xs text-amber-600 leading-relaxed">
              La integración con el proveedor KYC (Jumio/Onfido) está en desarrollo.
              Para el demo, tu nivel es KYC {currentLevel} ({info.name}).
              En producción podrás subir documentos directamente desde aquí.
            </p>
          </div>
          <button className="btn-primary w-full opacity-60 cursor-not-allowed" disabled>
            Subir a nivel {KYC_LEVELS[currentLevel + 1]?.name} — Próximamente
          </button>
        </div>
      )}

      {kycStatus === 'approved' && currentLevel >= 2 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-4 text-center">
          <p className="text-2xl mb-1">✓</p>
          <p className="font-bold text-emerald-700 text-sm">Identidad verificada</p>
          <p className="text-xs text-emerald-600 mt-0.5">Tus límites están activos</p>
        </div>
      )}
    </div>
  );
}
