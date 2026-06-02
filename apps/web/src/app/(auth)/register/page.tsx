'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { useWalletStore, COUNTRY_TO_COIN, COINS, type CoinCode } from '@/store/wallet.store';

type Step = 'datos' | 'pin' | 'dpi' | 'selfie' | 'recibo' | 'revisar' | 'enviando' | 'listo';

const COUNTRIES = [
  { code: 'GT', label: 'Guatemala', flag: '🇬🇹', doc: 'DPI', bill: 'recibo de luz/agua/teléfono' },
  { code: 'MX', label: 'México',    flag: '🇲🇽', doc: 'INE', bill: 'recibo de luz/agua/teléfono' },
  { code: 'HN', label: 'Honduras',  flag: '🇭🇳', doc: 'DNI', bill: 'recibo de luz/agua/teléfono' },
] as const;

/** Reduce una imagen a máx 900px JPEG (~80-150KB) para enviarla en JSON. */
function downscaleImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 900;
        let { width, height } = img;
        if (width > max || height > max) {
          const r = Math.min(max / width, max / height);
          width = Math.round(width * r); height = Math.round(height * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function DocCapture({
  label, hint, value, capture, onCapture,
}: {
  label: string; hint: string; value: string | null;
  capture?: 'user' | 'environment'; onCapture: (dataUrl: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const id = `cap-${label.replace(/\s/g, '')}`;
  return (
    <label htmlFor={id} className="block cursor-pointer">
      <div className={`rounded-2xl border-2 border-dashed p-4 flex items-center gap-3 transition-all
        ${value ? 'border-emerald-300 bg-emerald-50' : 'border-len-border bg-len-light hover:border-len-purple'}`}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="w-14 h-14 rounded-xl object-cover border border-emerald-200" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-white border border-len-border flex items-center justify-center text-2xl">📷</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-len-dark text-sm">{label}</p>
          <p className="text-xs text-gray-500">{busy ? 'Procesando…' : value ? '✓ Capturado · toca para cambiar' : hint}</p>
        </div>
        {value && <span className="text-emerald-600 font-black">✓</span>}
      </div>
      <input
        id={id} type="file" accept="image/*" capture={capture} className="hidden"
        onChange={async e => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try { onCapture(await downscaleImage(f)); } catch { /* ignore */ }
          setBusy(false);
        }}
      />
    </label>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setTokens } = useAuthStore();

  const [step, setStep] = useState<Step>('datos');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [country, setCountry]     = useState<'GT' | 'MX' | 'HN'>('GT');
  const [pin, setPin]             = useState('');
  const [pin2, setPin2]           = useState('');
  const [dpiFront, setDpiFront]   = useState<string | null>(null);
  const [dpiBack, setDpiBack]     = useState<string | null>(null);
  const [selfie, setSelfie]       = useState<string | null>(null);
  const [utility, setUtility]     = useState<string | null>(null);
  const [error, setError]         = useState('');

  const cMeta = COUNTRIES.find(c => c.code === country)!;

  const canDatos  = firstName.trim() && phone.replace(/\D/g, '').length >= 8;
  const canPin    = pin.length >= 6 && pin === pin2;
  const canSubmit = dpiFront && selfie && utility;

  async function submit() {
    setError('');
    setStep('enviando');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone, country, pin,
          display_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          documents: {
            ...(dpiFront ? { dpi_front: dpiFront } : {}),
            ...(dpiBack  ? { dpi_back: dpiBack }   : {}),
            ...(selfie   ? { selfie }              : {}),
            ...(utility  ? { utility_bill: utility } : {}),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'No se pudo crear la cuenta');

      const u = json.data.user;
      setTokens(json.data.access_token, json.data.access_token);
      setUser({
        id: u.user_id, phoneNumber: u.phone, phoneVerified: true,
        firstName, lastName, displayName: u.display_name, country: u.country,
        kycLevel: 1, kycStatus: u.kyc_status ?? 'in_review', status: 'active',
        createdAt: new Date().toISOString(),
      });

      // Wallet inicial (una sola moneda, saldo 0) — el saldo real vendrá del backend/ledger
      const coin = (COUNTRY_TO_COIN[u.country] ?? 'QUETZA') as CoinCode;
      useWalletStore.getState().setWallets([{
        coin, balance: '0', available: '0',
        fiatBalance: '0', fiatCurrency: COINS[coin].fiat, balanceUSD: 0,
      }]);
      useWalletStore.getState().setTransactions([]);

      setStep('listo');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
      setStep('revisar');
    }
  }

  const wrap = 'min-h-screen flex flex-col px-5 py-6';
  const grad = { background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)' };

  // ── Pantalla final ──
  if (step === 'listo') {
    return (
      <div className={wrap + ' items-center justify-center text-center'} style={grad}>
        <div className="w-20 h-20 bg-white/15 rounded-full flex items-center justify-center mb-5 border-2 border-white/30">
          <span className="text-4xl">✓</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-2">¡Cuenta creada!</h1>
        <p className="text-white/70 text-sm max-w-xs mb-6">
          Tu identidad está <b>en revisión</b> (verificación KYC). En cuanto se apruebe se
          activan tus límites completos. Mientras tanto ya puedes usar LEN con límites básicos.
        </p>
        <button onClick={() => router.push('/dashboard')}
          className="bg-white text-len-purple font-black px-8 py-3 rounded-2xl">
          Entrar a LEN →
        </button>
      </div>
    );
  }
  if (step === 'enviando') {
    return (
      <div className={wrap + ' items-center justify-center text-center'} style={grad}>
        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-5" />
        <p className="text-white font-bold">Creando tu cuenta y verificando documentos…</p>
      </div>
    );
  }

  const STEPS: Step[] = ['datos', 'pin', 'dpi', 'selfie', 'recibo', 'revisar'];
  const idx = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-len-surface">
      <div className="max-w-md mx-auto px-5 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => idx > 0 ? setStep(STEPS[idx - 1]) : router.push('/login')}
            className="btn-ghost -ml-2 text-sm">← Atrás</button>
          <span className="text-xs text-gray-400 font-semibold">Paso {idx + 1} de {STEPS.length}</span>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-len-purple' : 'bg-len-border'}`} />
          ))}
        </div>

        {/* ── Datos ── */}
        {step === 'datos' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-black text-len-dark">Crea tu cuenta LEN</h1>
              <p className="text-gray-500 text-sm mt-1">Verificación de identidad nivel bancario.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {COUNTRIES.map(c => (
                <button key={c.code} onClick={() => setCountry(c.code)}
                  className={`rounded-2xl border-2 py-3 transition-all ${country === c.code
                    ? 'border-len-purple bg-len-light' : 'border-len-border bg-white'}`}>
                  <div className="text-2xl">{c.flag}</div>
                  <div className="text-xs font-bold text-len-dark mt-1">{c.label}</div>
                </button>
              ))}
            </div>
            <input className="input-field" placeholder="Nombre(s)" value={firstName} onChange={e => setFirstName(e.target.value)} />
            <input className="input-field" placeholder="Apellido(s)" value={lastName} onChange={e => setLastName(e.target.value)} />
            <input className="input-field" placeholder="Número de teléfono" inputMode="numeric"
              value={phone} onChange={e => setPhone(e.target.value)} />
            <button className="btn-primary w-full" disabled={!canDatos} onClick={() => setStep('pin')}>Continuar →</button>
            <p className="text-center text-xs text-gray-400">
              ¿Ya tienes cuenta? <Link href="/login" className="text-len-purple font-semibold">Inicia sesión</Link>
            </p>
          </div>
        )}

        {/* ── PIN ── */}
        {step === 'pin' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-black text-len-dark">Crea tu PIN</h1>
              <p className="text-gray-500 text-sm mt-1">6 dígitos. Lo usarás para entrar y autorizar pagos.</p>
            </div>
            <input className="input-field text-center text-2xl tracking-[0.5em] font-black" inputMode="numeric"
              maxLength={6} placeholder="••••••" value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} />
            <input className="input-field text-center text-2xl tracking-[0.5em] font-black" inputMode="numeric"
              maxLength={6} placeholder="Confirma tu PIN" value={pin2}
              onChange={e => setPin2(e.target.value.replace(/\D/g, '').slice(0, 6))} />
            {pin2.length === 6 && pin !== pin2 && <p className="text-red-600 text-xs text-center">Los PIN no coinciden</p>}
            <button className="btn-primary w-full" disabled={!canPin} onClick={() => setStep('dpi')}>Continuar →</button>
          </div>
        )}

        {/* ── DPI ── */}
        {step === 'dpi' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-black text-len-dark">Tu {cMeta.doc}</h1>
              <p className="text-gray-500 text-sm mt-1">Toma una foto clara, sin reflejos ni dedos sobre el documento.</p>
            </div>
            <DocCapture label={`${cMeta.doc} — frente`} hint="Toca para tomar la foto" capture="environment"
              value={dpiFront} onCapture={setDpiFront} />
            <DocCapture label={`${cMeta.doc} — reverso (opcional)`} hint="Toca para tomar la foto" capture="environment"
              value={dpiBack} onCapture={setDpiBack} />
            <button className="btn-primary w-full" disabled={!dpiFront} onClick={() => setStep('selfie')}>Continuar →</button>
          </div>
        )}

        {/* ── Selfie ── */}
        {step === 'selfie' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-black text-len-dark">Tu selfie</h1>
              <p className="text-gray-500 text-sm mt-1">Una foto de tu rostro para confirmar que eres tú.</p>
            </div>
            <DocCapture label="Selfie (tu cara)" hint="Toca para tomarte la selfie" capture="user"
              value={selfie} onCapture={setSelfie} />
            <button className="btn-primary w-full" disabled={!selfie} onClick={() => setStep('recibo')}>Continuar →</button>
          </div>
        )}

        {/* ── Recibo ── */}
        {step === 'recibo' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-black text-len-dark">Comprobante de domicilio</h1>
              <p className="text-gray-500 text-sm mt-1">Un {cMeta.bill} reciente (menos de 3 meses) a tu nombre.</p>
            </div>
            <DocCapture label="Recibo de servicios" hint="Luz, agua o teléfono" capture="environment"
              value={utility} onCapture={setUtility} />
            <button className="btn-primary w-full" disabled={!utility} onClick={() => setStep('revisar')}>Continuar →</button>
          </div>
        )}

        {/* ── Revisar ── */}
        {step === 'revisar' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-black text-len-dark">Revisa y confirma</h1>
              <p className="text-gray-500 text-sm mt-1">Verifica que todo esté correcto antes de enviar.</p>
            </div>
            <div className="card space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Nombre</span><span className="font-bold text-len-dark">{firstName} {lastName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Teléfono</span><span className="font-bold text-len-dark">{phone}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">País</span><span className="font-bold text-len-dark">{cMeta.flag} {cMeta.label}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{cMeta.doc}</span><span className="font-bold text-emerald-600">{dpiFront ? '✓' : '—'}{dpiBack ? ' + reverso' : ''}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Selfie</span><span className="font-bold text-emerald-600">{selfie ? '✓' : '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Comprobante</span><span className="font-bold text-emerald-600">{utility ? '✓' : '—'}</span></div>
            </div>
            {error && <div className="bg-red-50 text-red-700 rounded-2xl p-3 text-sm text-center">{error}</div>}
            <button className="btn-primary w-full" disabled={!canSubmit} onClick={submit}>Crear cuenta y enviar a verificación</button>
            <p className="text-center text-[11px] text-gray-400">
              Tus documentos se procesan bajo estándares AML/KYC (FATF/GAFILAT).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
