'use client';

import { useState } from 'react';

export interface VoucherLine {
  label: string;
  value: string;
  highlight?: 'green' | 'purple' | 'amber' | 'gray';
  bold?: boolean;
  large?: boolean;
}

interface TransactionVoucherProps {
  txId: string;
  typeLabel: string;
  statusLabel?: string;
  createdAt: string;
  lines: VoucherLine[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-GT', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Pure Canvas 2D voucher generator ────────────────────────────────────────
// Draws entirely with Canvas API — no DOM capture, works on all mobile browsers.
async function generateVoucherPNG(props: TransactionVoucherProps): Promise<Blob> {
  const { txId, typeLabel, statusLabel = 'Completada', createdAt, lines } = props;

  const SCALE  = 3;   // 3x for crisp retina
  const W      = 375; // logical px
  const PAD    = 24;
  const HDR_H  = 128;
  const LINE_H = 54;
  const SEP    = 1;
  const TXID_H = 64;
  const FOOT_H = 36;
  const TOTAL_H = HDR_H + (lines.length * LINE_H) + TXID_H + FOOT_H + PAD;

  const canvas = document.createElement('canvas');
  canvas.width  = W * SCALE;
  canvas.height = TOTAL_H * SCALE;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  // ── Helpers ────────────────────────────────────────────────────
  function rr(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── White card background ───────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  rr(0, 0, W, TOTAL_H, 20);
  ctx.fill();

  // ── Gradient header ────────────────────────────────────────────
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0,   '#1E1B4B');
  grad.addColorStop(0.5, '#4C3CCF');
  grad.addColorStop(1,   '#6C5CE7');
  ctx.fillStyle = grad;
  rr(0, 0, W, HDR_H, 20);
  ctx.fill();
  ctx.fillRect(0, HDR_H - 20, W, 20); // square off bottom of header

  // ── LEN Logo ───────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  rr(PAD, 20, 34, 34, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('L', PAD + 10, 37);

  // ── LEN name ───────────────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText('LEN', PAD + 44, 31);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillText('Red TokenCoin · Mesoamérica', PAD + 44, 46);

  // ── Status badge ────────────────────────────────────────────────
  const badge = '✓ ' + statusLabel;
  ctx.font = 'bold 9px system-ui, sans-serif';
  const bw = ctx.measureText(badge).width + 16;
  ctx.fillStyle = 'rgba(52,211,153,0.2)';
  rr(W - PAD - bw, 21, bw, 22, 11);
  ctx.fill();
  ctx.fillStyle = '#6ee7b7';
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(badge, W - PAD - 4, 34);

  // ── Type + date ─────────────────────────────────────────────────
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.fillText(typeLabel.toUpperCase(), PAD, 76);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(formatDate(createdAt), PAD, 93);

  // ── Data lines ──────────────────────────────────────────────────
  let y = HDR_H + PAD;
  ctx.textBaseline = 'alphabetic';

  lines.forEach((line, i) => {
    // Label
    ctx.fillStyle = '#6b7280';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(line.label, PAD, y + 22);

    // Value
    const valColor = line.highlight === 'green'  ? '#059669'
                   : line.highlight === 'purple' ? '#6C5CE7'
                   : line.highlight === 'amber'  ? '#d97706'
                   : line.highlight === 'gray'   ? '#9ca3af'
                   : '#1E1B4B';
    const valSize  = line.large ? 20 : 14;
    const valWeight = (line.large || line.bold) ? 'bold' : '600';
    ctx.fillStyle = valColor;
    ctx.font = `${valWeight} ${valSize}px system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(line.value, W - PAD, y + (line.large ? 24 : 22));

    // Separator
    if (i < lines.length - 1) {
      ctx.strokeStyle = '#EDE9FE';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(PAD, y + LINE_H - 4);
      ctx.lineTo(W - PAD, y + LINE_H - 4);
      ctx.stroke();
    }
    y += LINE_H;
  });

  // ── TX ID section ───────────────────────────────────────────────
  y += 8;
  ctx.fillStyle = '#F5F3FF';
  ctx.fillRect(0, y, W, TXID_H + FOOT_H);
  ctx.strokeStyle = '#EDE9FE';
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(0, y); ctx.lineTo(W, y);
  ctx.stroke();

  ctx.fillStyle = '#9ca3af';
  ctx.font = 'bold 8px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ID DE TRANSACCIÓN', PAD, y + 18);

  ctx.fillStyle = '#1E1B4B';
  ctx.font = 'bold 11px monospace, monospace';
  ctx.fillText(txId, PAD, y + 36);

  // ── Footer ──────────────────────────────────────────────────────
  const fy = y + TXID_H;
  ctx.strokeStyle = '#EDE9FE';
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(0, fy); ctx.lineTo(W, fy);
  ctx.stroke();

  ctx.fillStyle = '#a78bfa';
  ctx.font = 'bold 8px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VERIFICADO EN RED LEN · MESOAMÉRICA', W / 2, fy + 21);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('canvas empty')), 'image/png');
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export function TransactionVoucher(props: TransactionVoucherProps) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');

  // Preview lines (in-app display)
  const highlightClass: Record<string, string> = {
    green:  'text-emerald-600 font-black',
    purple: 'text-len-purple font-black',
    amber:  'text-amber-600 font-bold',
    gray:   'text-gray-400',
  };

  async function shareImage() {
    setStatus('generating');
    try {
      const blob = await generateVoucherPNG(props);
      const file = new File([blob], `LEN-${props.txId}.png`, { type: 'image/png' });

      // Share natively (mobile) or download (desktop)
      if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Comprobante LEN',
          text: `${props.typeLabel} · ${props.txId}`,
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LEN-${props.txId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setStatus('done');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  }

  async function copyId() {
    await navigator.clipboard.writeText(props.txId);
    setStatus('done');
    setTimeout(() => setStatus('idle'), 2000);
  }

  return (
    <div className="space-y-3">

      {/* In-app preview card */}
      <div className="rounded-3xl border-2 border-len-border overflow-hidden shadow-sm">

        {/* Header */}
        <div className="bg-len-gradient px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">L</span>
            </div>
            <div>
              <p className="text-white font-black text-sm leading-none">LEN</p>
              <p className="text-white/50 text-[10px] mt-0.5">Comprobante de transacción</p>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-emerald-400/20 text-emerald-200 px-2.5 py-1 rounded-full border border-emerald-400/30">
            ✓ {props.statusLabel ?? 'Completada'}
          </span>
        </div>

        {/* Type + date */}
        <div className="bg-white px-5 pt-3.5 pb-2 border-b border-len-border">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{props.typeLabel}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(props.createdAt)}</p>
        </div>

        {/* Lines */}
        <div className="bg-white px-5 py-3 divide-y divide-len-border">
          {props.lines.map((l, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 first:pt-1 last:pb-1">
              <span className="text-sm text-gray-500">{l.label}</span>
              <span className={`tabular-nums text-right ${
                l.large ? 'text-xl' : 'text-sm'
              } ${l.highlight ? highlightClass[l.highlight] : l.bold ? 'font-bold text-len-dark' : 'font-semibold text-len-dark'}`}>
                {l.value}
              </span>
            </div>
          ))}
        </div>

        {/* TX ID */}
        <div className="bg-len-light px-5 py-3 border-t border-len-border">
          <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold mb-0.5">ID de transacción</p>
          <p className="text-xs font-mono font-bold text-len-dark tracking-tight">{props.txId}</p>
        </div>

        {/* Footer */}
        <div className="bg-len-light px-5 py-2.5 border-t border-len-border text-center">
          <p className="text-[9px] text-len-violet/60 font-bold uppercase tracking-widest">
            Verificado en Red LEN · Mesoamérica
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2.5">
        <button
          onClick={shareImage}
          disabled={status === 'generating'}
          className="flex-1 flex items-center justify-center gap-2 bg-len-gradient
                     text-white font-bold text-sm py-3.5 rounded-2xl
                     active:scale-[0.98] transition-all disabled:opacity-60 shadow-len"
        >
          {status === 'generating' ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Generando...
            </>
          ) : status === 'done' ? (
            '✓ Listo'
          ) : status === 'error' ? (
            'Error — intenta de nuevo'
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
