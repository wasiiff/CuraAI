"use client";
import { useState, useCallback, useEffect } from "react";
import { MagnifyingGlassIcon, XMarkIcon, SparklesIcon } from "@heroicons/react/24/outline";

interface SearchBarProps {
  query: string;
  setQuery: (q: string) => void;
  onTitleSearch: (query: string) => Promise<boolean>;
  onAISearch: (query: string) => void;
  onClear: () => void;
  loading?: boolean;
}

export default function SearchBar({
  query,
  setQuery,
  onTitleSearch,
  onAISearch,
  onClear,
  loading = false,
}: SearchBarProps) {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = useCallback(
    (value: string) => {
      if (debounceTimer) clearTimeout(debounceTimer);

      const timer = setTimeout(async () => {
        if (!value.trim()) return;

        const found = await onTitleSearch(value.trim());
        if (!found) onAISearch(value.trim());
      }, 1500);

      setDebounceTimer(timer);
    },
    [debounceTimer, onTitleSearch, onAISearch]
  );

  useEffect(() => {
    if (query) {
      handleSearch(query);
    }
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [query]);

  const handleClear = () => {
    setQuery("");
    onClear();
  };

  return (
    <div className="mb-6">
      {/* Search Container */}
      <div className={`bg-white rounded-2xl shadow-md border-2 transition-all duration-300 ${
        isFocused ? 'border-blue-500 shadow-lg' : 'border-gray-200'
      }`}>
        {/* Top Gradient Bar */}
        <div className={`h-1 w-[95%] mx-auto bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 rounded-t-2xl transition-all duration-300 ${
          isFocused ? 'h-[1px]' : 'h-1'
        }`}></div>
        
        <div className="p-5">
          <div className="relative flex items-center">
            {/* Search Icon */}
            <div className={`absolute left-4 transition-colors duration-200 ${
              isFocused ? 'text-blue-600' : 'text-gray-400'
            }`}>
              <MagnifyingGlassIcon className="h-5 w-5" />
            </div>

            {/* Input */}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Search products by title or describe what you're looking for..."
              className="block w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-blue-500 placeholder-gray-400 text-gray-900 transition-all duration-200"
              disabled={loading}
            />

            {/* Clear Button */}
            {query && !loading && (
              <button
                onClick={handleClear}
                className="absolute right-4 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full p-1 transition-all duration-200 focus:outline-none"
                aria-label="Clear search"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}

            {/* Loading Spinner */}
            {loading && (
              <div className="absolute right-4">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-blue-600 bg-blue-50 py-2.5 px-4 rounded-lg border border-blue-100">
              <SparklesIcon className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">Searching for products...</span>
            </div>
          )}

          {/* Search Tips */}
          {!query && !loading && (
            <div className="mt-4 flex items-center gap-2 text-gray-500 bg-gray-50 py-2.5 px-4 rounded-lg border border-gray-100">
              <SparklesIcon className="h-4 w-4" />
              <span className="text-xs">
                Try searching by product name or describe what you need
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}