'use client';

interface PreparationListProps {
  steps: string[];
}

export default function PreparationList({ steps }: PreparationListProps) {
  if (steps.length === 0) return null;

  return (
    <div className="bg-white rounded-card p-4 border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Before you go</h3>
      <ul className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-nea-green/10 text-nea-green text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="text-sm text-gray-600">{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
