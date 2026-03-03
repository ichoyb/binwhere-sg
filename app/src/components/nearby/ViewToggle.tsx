'use client';

interface ViewToggleProps {
  mode: 'list' | 'map';
  onChange: (mode: 'list' | 'map') => void;
}

export default function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200">
      <button
        onClick={() => onChange('list')}
        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
          mode === 'list'
            ? 'bg-blue-bin text-white'
            : 'bg-white text-gray-600 active:bg-gray-50'
        }`}
      >
        List
      </button>
      <button
        onClick={() => onChange('map')}
        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
          mode === 'map'
            ? 'bg-blue-bin text-white'
            : 'bg-white text-gray-600 active:bg-gray-50'
        }`}
      >
        Map
      </button>
    </div>
  );
}
