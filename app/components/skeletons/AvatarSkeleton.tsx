import React from 'react';

export const AvatarSkeleton = ({ size = "md", className = "" }: { size?: "sm" | "md" | "lg" | "xl", className?: string }) => {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24"
  };
  
  return (
    <div className={`${sizes[size]} rounded-full animate-shimmer border-2 border-white shadow-sm ${className}`} />
  );
};
