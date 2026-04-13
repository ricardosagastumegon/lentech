interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`${sizes[size]} animate-spin rounded-full border-2 border-gray-200 border-t-mondega-green ${className}`} />
  );
}

export function FullPageSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 gap-3">
      <LoadingSpinner size="lg" />
      {message && <p className="text-sm text-gray-400">{message}</p>}
    </div>
  );
}
