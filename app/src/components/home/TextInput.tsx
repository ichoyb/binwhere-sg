'use client';

import { useState } from 'react';

interface TextInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  prominent?: boolean;
}

export default function TextInput({ onSubmit, disabled, prominent }: TextInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={prominent ? "e.g. plastic bottle, old phone" : "Type an item name..."}
        disabled={disabled}
        enterKeyHint="search"
        className={`flex-1 px-3 py-2.5 rounded-btn border border-gray-200 bg-white
          text-caption placeholder:text-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-bin/30 focus:border-blue-bin
          disabled:opacity-50
          ${prominent ? 'py-3 border-blue-bin/30' : ''}`}
        maxLength={200}
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="px-4 py-2.5 rounded-btn bg-nea-green text-white text-caption font-medium
          active:bg-nea-green/90 disabled:opacity-40 disabled:cursor-not-allowed
          min-h-[44px]"
      >
        Search
      </button>
    </form>
  );
}
