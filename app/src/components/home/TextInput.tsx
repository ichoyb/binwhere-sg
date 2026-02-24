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
    <form onSubmit={handleSubmit} className={`flex gap-2 ${prominent ? 'mt-4' : ''}`}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={prominent ? "Describe your item (e.g. pizza box, old phone)" : "Or type what you have..."}
        disabled={disabled}
        enterKeyHint="search"
        className={`flex-1 px-4 py-3 rounded-btn border border-gray-200 bg-white
          text-body placeholder:text-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-bin/30 focus:border-blue-bin
          disabled:opacity-50
          ${prominent ? 'py-4 border-blue-bin/30' : ''}`}
        maxLength={200}
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="px-5 py-3 rounded-btn bg-nea-green text-white text-body font-medium
          active:bg-nea-green/90 disabled:opacity-40 disabled:cursor-not-allowed
          min-h-btn min-w-[60px]"
      >
        Go
      </button>
    </form>
  );
}
