import Link from 'next/link';

const ACTIONS = [
  {
    label: 'Enviar',
    href: '/send',
    bg: 'bg-len-light',
    iconBg: 'bg-len-gradient',
    icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
  },
  {
    label: 'Recibir',
    href: '/receive',
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-500',
    icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
  },
  {
    label: 'Adquirir',
    href: '/add-money',
    bg: 'bg-indigo-50',
    iconBg: 'bg-indigo-600',
    icon: (
      // Token/coin icon — represents buying a token
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
        <circle cx="12" cy="12" r="8" strokeLinecap="round" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8M9 11l3-3 3 3" />
      </svg>
    ),
  },
  {
    label: 'Tarjeta',
    href: '/card',
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-500',
    icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {ACTIONS.map(action => (
        <Link
          key={action.href}
          href={action.href}
          className={`flex flex-col items-center gap-2.5 p-3 rounded-2xl ${action.bg}
            border border-transparent hover:border-len-border hover:shadow-sm transition-all active:scale-95`}
        >
          <div className={`w-11 h-11 ${action.iconBg} rounded-xl flex items-center justify-center shadow-sm`}>
            {action.icon}
          </div>
          <span className="text-xs font-bold text-len-dark">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
