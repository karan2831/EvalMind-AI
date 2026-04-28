import React from 'react';

export const ButtonSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`h-10 rounded-xl animate-shimmer ${className}`} />
);
