'use client';

import { useState, ReactNode } from 'react';
import { PINInput } from './PINInput';

interface PINConfirmModalProps {
  trigger: ReactNode;
  onConfirm: (pin: string) => void | Promise<void>;
  loading?: boolean;
  title?: string;
  description?: string;
}

export function PINConfirmModal({
  trigger,
  onConfirm,
  loading = false,
  title = 'Confirmar con PIN',
  description = 'Ingresa tu PIN de 6 dígitos para continuar',
}: PINConfirmModalProps) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  async function handleConfirm() {
    if (pin.length < 6) {
      setError('El PIN debe tener 6 dígitos');
      return;
    }
    setError('');
    try {
      await onConfirm(pin);
      setOpen(false);
      setPin('');
    } catch {
      setError('PIN incorrecto. Intenta de nuevo.');
      setPin('');
    }
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>{trigger}</div>

      {open && (
        /* z-[200] — above BottomNav (z-50) and TopBar (z-50) */
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setOpen(false); setPin(''); setError(''); }}
          />

          {/* Sheet — slides from bottom on mobile, centered on desktop */}
          <div className="relative bg-white rounded-t-[2rem] sm:rounded-2xl w-full max-w-sm shadow-2xl
                          max-h-[90svh] overflow-y-auto
                          pb-[env(safe-area-inset-bottom,0px)]">

            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="px-6 pt-4 pb-8 space-y-5">
              <div className="text-center">
                <div className="w-14 h-14 bg-len-light border-2 border-len-border rounded-full
                                flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🔒</span>
                </div>
                <h2 className="text-lg font-bold text-len-dark">{title}</h2>
                <p className="text-gray-500 text-sm mt-1 leading-snug">{description}</p>
              </div>

              <PINInput
                value={pin}
                onChange={setPin}
                autoFocus
                error={error}
                disabled={loading}
              />

              <button
                className="w-full bg-len-gradient text-white font-bold py-3.5 rounded-2xl
                           disabled:opacity-50 transition-opacity active:scale-[0.98]"
                onClick={handleConfirm}
                disabled={pin.length < 6 || loading}
              >
                {loading ? 'Procesando…' : 'Confirmar'}
              </button>

              <button
                className="w-full text-gray-400 text-sm py-1"
                onClick={() => { setOpen(false); setPin(''); setError(''); }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
