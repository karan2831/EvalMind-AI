import React from 'react';

export const CardSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`bg-white border border-gray-100 rounded-2xl p-6 space-y-4 shadow-sm ${className}`}>
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl animate-shimmer" />
      <div className="space-y-2 flex-1">
        <div className="h-4 w-3/4 rounded animate-shimmer" />
        <div className="h-3 w-1/2 rounded animate-shimmer" />
      </div>
    </div>
    <div className="space-y-2 pt-2">
      <div className="h-3 w-full rounded animate-shimmer" />
      <div className="h-3 w-5/6 rounded animate-shimmer" />
    </div>
    <div className="pt-4 flex justify-between items-center">
      <div className="h-8 w-24 rounded-lg animate-shimmer" />
      <div className="h-4 w-16 rounded animate-shimmer" />
    </div>
  </div>
);
