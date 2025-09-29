'use client';

export default function ProductSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 animate-pulse">
      <div className="p-6 space-y-4">
        {/* Title + Badge */}
        <div className="flex justify-between items-start">
          <div className="h-5 bg-gray-200 rounded w-2/3"></div>
          <div className="h-5 bg-gray-200 rounded-full w-16"></div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>

        {/* Price */}
        <div className="h-6 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  );
}
