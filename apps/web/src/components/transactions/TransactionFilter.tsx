interface TransactionFilterProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

const OPTIONS = [
  { value: 'all',      label: 'Todos' },
  { value: 'sent',     label: 'Enviados' },
  { value: 'received', label: 'Recibidos' },
];

export function TransactionFilter({ value, onChange, className }: TransactionFilterProps) {
  return (
    <div className={`flex gap-2 ${className ?? ''}`}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
            ${value === opt.value
              ? 'bg-mondega-green text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
