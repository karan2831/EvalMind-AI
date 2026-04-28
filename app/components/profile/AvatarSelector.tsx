'use client';

import React from 'react';

const AVATARS = [
  { id: 'smile', emoji: '😀', color: 'bg-yellow-50' },
  { id: 'cat', emoji: '😺', color: 'bg-orange-50' },
  { id: 'dog', emoji: '🐶', color: 'bg-amber-50' },
  { id: 'octopus', emoji: '🐙', color: 'bg-purple-50' },
  { id: 'lion', emoji: '🦁', color: 'bg-orange-100' },
  { id: 'bot', emoji: '🤖', color: 'bg-blue-50' },
  { id: 'ghost', emoji: '👻', color: 'bg-gray-100' },
  { id: 'sparkles', emoji: '✨', color: 'bg-indigo-50' },
];

interface AvatarSelectorProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function AvatarSelector({ selectedId, onSelect }: AvatarSelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {AVATARS.map((avatar) => (
        <button
          key={avatar.id}
          type="button"
          onClick={() => onSelect(avatar.id)}
          className={`relative aspect-square rounded-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 ${
            avatar.color
          } ${
            selectedId === avatar.id 
              ? 'ring-4 ring-blue-500 shadow-lg z-10' 
              : 'ring-1 ring-gray-100 hover:ring-gray-300'
          }`}
        >
          <span className="text-3xl sm:text-4xl select-none">{avatar.emoji}</span>
          
          {selectedId === avatar.id && (
            <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full p-1 shadow-md animate-in zoom-in duration-300">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="w-3 h-3"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
