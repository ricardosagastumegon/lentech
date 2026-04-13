import Link from 'next/link';

interface KYCBannerProps { kycLevel: number; kycStatus: string }

export function KYCBanner({ kycLevel, kycStatus }: KYCBannerProps) {
  if (kycLevel >= 2) return null;
  const isPending = kycStatus === 'in_review';

  return (
    <div className={`rounded-2xl p-4 flex items-center gap-3 border
      ${isPending
        ? 'bg-blue-50 border-blue-200'
        : 'bg-amber-50 border-amber-200'}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
        ${isPending ? 'bg-blue-100' : 'bg-amber-100'}`}>
        <span className="text-xl">{isPending ? '⏳' : '🔐'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${isPending ? 'text-blue-800' : 'text-amber-800'}`}>
          {isPending ? 'Verificación en proceso' : 'Verifica tu identidad'}
        </p>
        <p className={`text-xs mt-0.5 ${isPending ? 'text-blue-600' : 'text-amber-600'}`}>
          {isPending
            ? 'Revisión en 24–48 hrs. Límite actual: $200/día'
            : 'Completa KYC → hasta $10,000/día'}
        </p>
      </div>
      {!isPending && (
        <Link href="/kyc"
          className="px-3 py-2 bg-len-purple text-white text-xs font-semibold rounded-xl hover:bg-opacity-90 transition-colors flex-shrink-0">
          Verificar
        </Link>
      )}
    </div>
  );
}
