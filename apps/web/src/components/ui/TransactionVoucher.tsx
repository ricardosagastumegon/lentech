'use client';

import { useState } from 'react';

export interface VoucherLine {
  label: string;
  value: string;
  highlight?: 'green' | 'purple' | 'amber' | 'gray';
  mono?: boolean;
  bold?: boolean;
}

interface TransactionVoucherProps {
  txId: string;
  typeLabel: string;    // e.g. "Compra de tokens", "Envío internacional"
  statusLabel?: string; // e.g. "Completado"
  createdAt: string;    // ISO string
  lines: VoucherLine[];
  onShare?: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-GT', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function TransactionVoucher({
  txId,
  typeLabel,
  statusLabel = 'Completado',
  createdAt,
  lines,
}: TransactionVoucherProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  async function copyId() {
    await navigator.clipboard.writeText(txId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    const text = [
      `Comprobante LEN`,
      `──────────────`,
      `Tipo: ${typeLabel}`,
      `Estado: ${statusLabel}`,
      `Fecha: ${formatDate(createdAt)}`,
      ...lines.map(l => `${l.label}: ${l.value}`),
      `──────────────`,
      `ID: ${txId}`,
      ``,
      `Verificado en red LEN · Mesoamérica`,
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Comprobante LEN', text });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      } catch { /* user cancelled */ }
    }
    // Fallback: copy full text
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const highlightClass: Record<string, string> = {
    green:  'text-emerald-700 font-black',
    purple: 'text-len-purple font-black',
    amber:  'text-amber-700 font-bold',
    gray:   'text-gray-500',
  };

  return (
    <div className="rounded-3xl border-2 border-len-border overflow-hidden shadow-sm">

      {/* Header */}
      <div className="bg-len-gradient px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-sm">L</span>
          </div>
          <div>
            <p className="text-white font-black text-sm leading-none">LEN</p>
            <p className="text-white/60 text-[10px] mt-0.5">Comprobante de transacción</p>
          </div>
        </div>
        <span className="text-[10px] font-bold bg-emerald-400/20 text-emerald-200 px-2.5 py-1 rounded-full border border-emerald-400/30">
          ✓ {statusLabel}
        </span>
      </div>

      {/* Meta */}
      <div className="bg-white px-5 pt-4 pb-2 border-b border-len-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{typeLabel}</span>
          <span className="text-xs text-gray-400">{formatDate(createdAt)}</span>
        </div>
      </div>

      {/* Lines */}
      <div className="bg-white px-5 py-3 space-y-2.5">
        {lines.map((l, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{l.label}</span>
            <span className={`text-sm tabular-nums ${l.mono ? 'font-mono' : ''} ${
              l.highlight ? highlightClass[l.highlight] : l.bold ? 'font-bold text-len-dark' : 'text-len-dark font-semibold'
            }`}>
              {l.value}
            </span>
          </div>
        ))}
      </div>

      {/* TX ID */}
      <div className="bg-len-light px-5 py-3 border-t border-len-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">ID de transacción</p>
            <p className="text-xs font-mono font-bold text-len-dark tracking-tight">{txId}</p>
          </div>
          <button
            onClick={copyId}
            className="text-[11px] font-bold text-len-purple bg-white border border-len-border
                       px-2.5 py-1.5 rounded-xl hover:border-len-purple transition-colors"
          >
            {copied ? '✓ Copiado' : 'Copiar ID'}
          </button>
        </div>
      </div>

      {/* Share */}
      <div className="bg-white px-5 py-4">
        <button
          onClick={share}
          className="w-full flex items-center justify-center gap-2 bg-len-light border border-len-border
                     text-len-dark font-bold text-sm py-3 rounded-2xl hover:border-len-purple
                     hover:text-len-purple transition-all active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0
                 1 1 0-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 1 1 5.367 2.684
                 3 3 0 0 1-5.367 2.684zm0-8a3 3 0 1 1 5.367-2.684 3 3 0 0 1-5.367 2.684z" />
          </svg>
          {shared ? '¡Compartido!' : 'Compartir comprobante'}
        </button>
      </div>
    </div>
  );
}
