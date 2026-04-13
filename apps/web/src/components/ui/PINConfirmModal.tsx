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
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => { setOpen(false); setPin(''); setError(''); }}
          />
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-2xl">
            <div className="text-center">
              <div className="w-12 h-12 bg-mondega-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🔒</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              <p className="text-gray-500 text-sm mt-1">{description}</p>
            </div>

            <PINInput
              value={pin}
              onChange={setPin}
              autoFocus
              error={error}
              disabled={loading}
            />

            <button
              className="w-full bg-mondega-green text-white font-semibold py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              onClick={handleConfirm}
              disabled={pin.length < 6 || loading}
            >
              {loading ? 'Procesando…' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
