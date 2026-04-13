'use client';

import { PINInput } from './PINInput';

interface OTPInputProps {
  value: string;
  onChange: (val: string) => void;
  onComplete?: () => void;
  onResend?: () => void;
  resendCountdown?: number;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function OTPInput({
  value,
  onChange,
  onComplete,
  onResend,
  resendCountdown = 0,
  disabled,
  error,
  className,
}: OTPInputProps) {
  return (
    <div className={`text-center ${className ?? ''}`}>
      <PINInput
        length={6}
        value={value}
        onChange={onChange}
        onComplete={onComplete}
        disabled={disabled}
        error={error}
        autoFocus
      />
      <div className="mt-4">
        {resendCountdown > 0 ? (
          <p className="text-sm text-gray-400">
            Reenviar en <span className="font-mono font-semibold text-gray-600">{resendCountdown}s</span>
          </p>
        ) : (
          <button
            type="button"
            onClick={onResend}
            className="text-sm text-mondega-green font-medium hover:underline disabled:opacity-50"
            disabled={disabled}
          >
            ¿No recibiste el código? Reenviar
          </button>
        )}
      </div>
    </div>
  );
}
