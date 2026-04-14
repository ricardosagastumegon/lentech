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
    label: 'Depositar',
    href: '/add-money',
    bg: 'bg-indigo-50',
    iconBg: 'bg-indigo-600',
    icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    label: 'Retirar',
    href: '/withdraw',
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-500',
    icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v4M10 7l2-2 2 2" />
      </svg>
    ),
  },
  {
    label: 'Tarjeta',
    href: '/card',
    bg: 'bg-purple-50',
    iconBg: 'bg-len-purple',
    icon: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
];

export function QuickActions() {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
      {ACTIONS.map(action => (
        <a
          key={action.href}
          href={action.href}
          className={`flex flex-col items-center gap-2 py-3 px-2 rounded-2xl ${action.bg} flex-shrink-0 w-[18%] min-w-[64px]
            border border-transparent hover:border-len-border hover:shadow-sm transition-all active:scale-95`}
        >
          <div className={`w-11 h-11 ${action.iconBg} rounded-xl flex items-center justify-center shadow-sm`}>
            {action.icon}
          </div>
          <span className="text-[11px] font-bold text-len-dark text-center leading-tight">{action.label}</span>
        </a>
      ))}
    </div>
  );
}
