'use client';

interface SnapButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function SnapButton({ onClick, disabled }: SnapButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-14 h-14 rounded-full bg-blue-bin border-4 border-white shadow-lg
        flex items-center justify-center
        active:scale-95 transition-transform
        disabled:opacity-40 disabled:cursor-not-allowed"
      aria-label="Take photo"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="13" r="4" fill="white"/>
        <path d="M4 8V6a2 2 0 012-2h2l2-2h4l2 2h2a2 2 0 012 2v2M4 8v10a2 2 0 002 2h12a2 2 0 002-2V8H4z" stroke="white" strokeWidth="1.5"/>
      </svg>
    </button>
  );
}
