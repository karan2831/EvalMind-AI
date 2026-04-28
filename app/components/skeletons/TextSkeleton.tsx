import React from 'react';

export const TextSkeleton = ({ lines = 1, className = "" }: { lines?: number, className?: string }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div 
        key={i} 
        className="h-4 rounded animate-shimmer" 
        style={{ width: i === lines - 1 && lines > 1 ? '60%' : '100%' }}
      />
    ))}
  </div>
);
