'use client';

import { useRef, useState } from 'react';

export interface VoucherLine {
  label: string;
  value: string;
  highlight?: 'green' | 'purple' | 'amber' | 'gray';
  bold?: boolean;
  large?: boolean;   // make the value bigger (for the main amount)
}

interface TransactionVoucherProps {
  txId: string;
  typeLabel: string;
  statusLabel?: string;
  createdAt: string;
  lines: VoucherLine[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-GT', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const highlightClass: Record<string, string> = {
  green:  'text-emerald-600 font-black',
  purple: 'text-len-purple font-black',
  amber:  'text-amber-600 font-bold',
  gray:   'text-gray-400',
};

/** The visual voucher card — this is what gets captured as image */
function VoucherCard({
  txId, typeLabel, statusLabel = 'Completada', createdAt, lines,
}: TransactionVoucherProps) {
  return (
    <div
      style={{ fontFamily: 'Inter, system-ui, sans-serif', background: '#fff', width: 360, borderRadius: 24, overflow: 'hidden', boxShadow: '0 8px 40px rgba(108,92,231,0.18)' }}
    >
      {/* Header gradient */}
      <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #4C3CCF 50%, #6C5CE7 100%)', padding: '20px 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 14 }}>L</span>
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: 15, lineHeight: 1 }}>LEN</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 }}>Red TokenCoin</div>
            </div>
          </div>
          {/* Status badge */}
          <div style={{ background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.4)', borderRadius: 999, padding: '4px 10px' }}>
            <span style={{ color: '#6ee7b7', fontSize: 10, fontWeight: 700 }}>✓ {statusLabel}</span>
          </div>
        </div>

        {/* Type + date */}
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {typeLabel}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
          {formatDate(createdAt)}
        </div>
      </div>

      {/* Lines */}
      <div style={{ background: '#fff', padding: '16px 24px' }}>
        {lines.map((l, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < lines.length - 1 ? 10 : 0, marginBottom: i < lines.length - 1 ? 10 : 0, borderBottom: i < lines.length - 1 ? '1px solid #EDE9FE' : 'none' }}>
            <span style={{ color: '#6b7280', fontSize: 13 }}>{l.label}</span>
            <span style={{
              fontSize: l.large ? 20 : 14,
              fontWeight: l.large ? 900 : (l.bold ? 800 : 600),
              color: l.highlight === 'green' ? '#059669'
                   : l.highlight === 'purple' ? '#6C5CE7'
                   : l.highlight === 'amber' ? '#d97706'
                   : l.highlight === 'gray' ? '#9ca3af'
                   : '#1E1B4B',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {l.value}
            </span>
          </div>
        ))}
      </div>

      {/* TX ID footer */}
      <div style={{ background: '#F5F3FF', padding: '12px 24px', borderTop: '1px solid #EDE9FE' }}>
        <div style={{ color: '#9ca3af', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 3 }}>
          ID de transacción
        </div>
        <div style={{ color: '#1E1B4B', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.02em' }}>
          {txId}
        </div>
      </div>

      {/* Powered by */}
      <div style={{ background: '#F5F3FF', padding: '8px 24px 14px', textAlign: 'center' }}>
        <span style={{ color: '#c4b5fd', fontSize: 9, fontWeight: 600, letterSpacing: '0.08em' }}>
          VERIFICADO EN RED LEN · MESOAMÉRICA
        </span>
      </div>
    </div>
  );
}

export function TransactionVoucher(props: TransactionVoucherProps) {
  const cardRef  = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'generating' | 'done'>('idle');

  async function captureAndShare() {
    if (!cardRef.current) return;
    setStatus('generating');

    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,          // retina quality
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) { setStatus('idle'); return; }

        const file = new File([blob], `LEN-comprobante-${props.txId}.png`, { type: 'image/png' });

        // Try Web Share API with files (mobile)
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: 'Comprobante LEN',
            text: `Transacción ${props.typeLabel} · ${props.txId}`,
            files: [file],
          });
        } else {
          // Fallback: download
          const url = URL.createObjectURL(blob);
          const a   = document.createElement('a');
          a.href     = url;
          a.download = `LEN-comprobante-${props.txId}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
        setStatus('done');
        setTimeout(() => setStatus('idle'), 3000);
      }, 'image/png');
    } catch {
      setStatus('idle');
    }
  }

  async function copyId() {
    await navigator.clipboard.writeText(props.txId);
    setStatus('done');
    setTimeout(() => setStatus('idle'), 2000);
  }

  return (
    <div className="space-y-4">
      {/* The card to capture */}
      <div className="flex justify-center">
        <div ref={cardRef} className="w-full max-w-sm">
          <VoucherCard {...props} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2.5">
        <button
          onClick={captureAndShare}
          disabled={status === 'generating'}
          className="flex-1 flex items-center justify-center gap-2 bg-len-gradient text-white
                     font-bold text-sm py-3.5 rounded-2xl active:scale-95 transition-all
                     disabled:opacity-60 shadow-len"
        >
          {status === 'generating' ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Generando...
            </span>
          ) : status === 'done' ? (
            '✓ Listo'
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 1 1 0-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 1 1 5.367 2.684 3 3 0 0 1-5.367 2.684zm0-8a3 3 0 1 1 5.367-2.684 3 3 0 0 1-5.367 2.684z" />
              </svg>
              Compartir imagen
            </>
          )}
        </button>

        <button
          onClick={copyId}
          className="flex items-center justify-center gap-1.5 bg-len-light border border-len-border
                     text-len-dark font-bold text-xs px-4 py-3.5 rounded-2xl
                     hover:border-len-purple active:scale-95 transition-all"
        >
          <svg className="w-3.5 h-3.5 text-len-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copiar ID
        </button>
      </div>
    </div>
  );
}
