"use client";
import { useState, useCallback, useEffect } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

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
    onClear(); // instantly reset filters + products
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="relative flex items-center">
        {/* Icon */}
        <MagnifyingGlassIcon className="absolute left-3 h-5 w-5 text-gray-400" />

        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products by title or describe what you're looking for..."
          className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 text-gray-900"
          disabled={loading}
        />

        {/* Clear button */}
        {query && !loading && (
          <button
            onClick={handleClear}
            className="absolute right-3 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="mt-3 flex items-center gap-2 text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
          <span className="text-sm">Searching...</span>
        </div>
      )}
    </div>
  );
}
