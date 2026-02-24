'use client';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="2"/>
          <path d="M12 8v4M12 16h.01" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <p className="text-gray-700 font-medium mb-1 text-body">Something went wrong</p>
      <p className="text-gray-500 text-caption mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2.5 rounded-btn bg-nea-green text-white text-body font-medium active:bg-nea-green/90 min-h-btn"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
