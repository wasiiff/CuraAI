"use client";

export default function ProductSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 animate-pulse">
      {/* Decorative Top Bar */}
      <div className="h-1.5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"></div>

      <div className="p-6 space-y-5">
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3 flex-1">
            {/* Icon Placeholder */}
            <div className="bg-gray-200 p-3 rounded-lg"></div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>

        {/* Brand Badge */}
        <div className="inline-block">
          <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
        </div>

        {/* Description Placeholder */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>

        {/* Footer Section */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          {/* Price */}
          <div className="space-y-2">
            <div className="h-3 w-12 bg-gray-200 rounded"></div>
            <div className="h-6 w-20 bg-gray-200 rounded"></div>
          </div>
          {/* View Button Placeholder */}
          <div className="h-5 w-14 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}
