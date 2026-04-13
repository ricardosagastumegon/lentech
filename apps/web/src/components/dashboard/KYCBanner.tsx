import Link from 'next/link';

interface KYCBannerProps {
  kycLevel: number;
  kycStatus: string;
}

export function KYCBanner({ kycLevel, kycStatus }: KYCBannerProps) {
  if (kycLevel >= 2) return null;

  const isPending = kycStatus === 'in_review';

  return (
    <div className={`rounded-2xl p-4 border flex items-center gap-3
      ${isPending
        ? 'bg-blue-50 border-blue-200 text-blue-800'
        : 'bg-amber-50 border-amber-200 text-amber-800'}`}
    >
      <div className="text-2xl">{isPending ? '⏳' : '🔐'}</div>
      <div className="flex-1">
        <p className="font-semibold text-sm">
          {isPending ? 'Verificación en proceso' : 'Verifica tu identidad'}
        </p>
        <p className="text-xs mt-0.5 opacity-80">
          {isPending
            ? 'Tu solicitud está siendo revisada (24–48 hrs)'
            : 'Completa KYC para aumentar tus límites de transacción'}
        </p>
      </div>
      {!isPending && (
        <Link
          href="/kyc"
          className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors flex-shrink-0"
        >
          Verificar
        </Link>
      )}
    </div>
  );
}
