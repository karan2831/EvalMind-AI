import React from 'react';
import { CardSkeleton } from './CardSkeleton';
import { TextSkeleton } from './TextSkeleton';

export const PageSkeleton = ({ type = "dashboard" }: { type?: "dashboard" | "profile" | "evaluate" }) => {
  if (type === "profile") {
    return (
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-24 space-y-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-24 h-24 rounded-full animate-shimmer" />
          <div className="h-6 w-48 rounded animate-shimmer" />
          <div className="h-4 w-64 rounded animate-shimmer" />
        </div>
        <div className="space-y-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="h-12 w-full rounded-xl animate-shimmer" />
          <div className="h-12 w-full rounded-xl animate-shimmer" />
          <div className="h-12 w-full rounded-xl animate-shimmer" />
        </div>
      </div>
    );
  }

  if (type === "evaluate") {
    return (
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-24 space-y-8">
        <div className="space-y-4">
          <div className="h-8 w-64 rounded animate-shimmer" />
          <div className="h-4 w-full rounded animate-shimmer" />
        </div>
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl space-y-6">
          <div className="h-6 w-32 rounded animate-shimmer" />
          <div className="h-32 w-full rounded-2xl animate-shimmer" />
          <div className="h-12 w-full rounded-xl animate-shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 pt-32 pb-24 space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
};
