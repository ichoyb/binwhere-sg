'use client';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
}

export default function BackButton({ onClick, label = 'Back' }: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-gray-600 active:text-gray-900 min-h-[48px] px-2"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
