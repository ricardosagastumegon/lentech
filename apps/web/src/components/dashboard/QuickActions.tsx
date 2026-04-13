import Link from 'next/link';

const ACTIONS = [
  { label: 'Enviar',   href: '/send',       icon: '↑', color: 'bg-blue-50 text-blue-600' },
  { label: 'Recibir',  href: '/receive',    icon: '↓', color: 'bg-green-50 text-green-600' },
  { label: 'Agregar',  href: '/add-money',  icon: '+', color: 'bg-purple-50 text-purple-600' },
  { label: 'Tarjeta',  href: '/card',       icon: '▣', color: 'bg-orange-50 text-orange-600' },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {ACTIONS.map(action => (
        <Link
          key={action.href}
          href={action.href}
          className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${action.color}`}>
            {action.icon}
          </div>
          <span className="text-xs font-medium text-gray-600">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
