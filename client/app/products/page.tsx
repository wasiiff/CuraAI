/* eslint-disable react-hooks/exhaustive-deps */
'use client';
import { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';
import ChatBot from '../components/ChatBot';
import {
  ShoppingBagIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import ProductSkeleton from '../components/ProductSkeleton';

type Product = {
  _id: string;
  name: string;
  brand?: string;
  description?: string;
  price?: string | number;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'all' | 'title' | 'ai'>('all');

  // pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(20); // items per page
  const [total, setTotal] = useState(0);

  const fetchProducts = async (
    pageNum = 1,
    searchQuery?: string,
    type: 'all' | 'title' | 'ai' = 'all'
  ): Promise<{ hasResults: boolean; total: number; page: number }> => {
    setLoading(true);
    setError(null);
    setSearchType(type);

    try {
      const token = localStorage.getItem('token');

      let url = `${process.env.NEXT_PUBLIC_API_URL}/products?page=${pageNum}&limit=${limit}`;
      if (type === 'title' && searchQuery) {
        url = `${process.env.NEXT_PUBLIC_API_URL}/products?title=${encodeURIComponent(
          searchQuery
        )}&page=${pageNum}&limit=${limit}`;
      } else if (type === 'ai' && searchQuery) {
        url = `${process.env.NEXT_PUBLIC_API_URL}/products/ai-search?q=${encodeURIComponent(
          searchQuery
        )}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();

      if (type === 'ai') {
        setProducts(data.products || []);
        setTotal(data.products?.length || 0);
        setPage(1);
        return {
          hasResults: (data.products || []).length > 0,
          total: data.products?.length || 0,
          page: 1,
        };
      } else {
        setProducts(data.items || data);
        setTotal(data.total || data.length || 0);
        setPage(data.page || pageNum);
        return {
          hasResults: (data.items || data).length > 0,
          total: data.total || (data.items || data).length || 0,
          page: data.page || pageNum,
        };
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setProducts([]);
      return { hasResults: false, total: 0, page: 1 };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(1);
  }, []);

  const handleTitleSearch = async (title: string): Promise<boolean> => {
    const result = await fetchProducts(1, title, 'title');
    return result.hasResults;
  };

  const handleAISearch = async (q: string) => {
    await fetchProducts(1, q, 'ai');
  };

  const handleClearFilters = async () => {
    setQuery('');
    await fetchProducts(1); // reset to "all"
  };

  const getResultsText = () => {
    const count = products.length;
    if (searchType === 'all') return `${count} Products`;
    if (searchType === 'title') return `${count} Results from Title Search`;
    if (searchType === 'ai') return `${count} AI-Recommended Products`;
    return `${count} Products`;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Title */}
            <div className="flex items-center gap-3">
              <ShoppingBagIcon className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 tracking-wide">
                Cura<span className="text-blue-600">AI</span>
              </h1>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => fetchProducts(1)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All Products
              </button>

              {typeof window !== 'undefined' && localStorage.getItem('token') && (
                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    window.location.href = '/auth/login';
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <SearchBar
          query={query}
          setQuery={setQuery}
          onTitleSearch={handleTitleSearch}
          onAISearch={handleAISearch}
          onClear={handleClearFilters}
          loading={loading}
        />

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {getResultsText()}
          </h2>
          {searchType !== 'all' && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              <p className="text-red-700 font-medium">Error</p>
            </div>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={() => fetchProducts(1)}
              className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
            >
              Try loading all products
            </button>
          </div>
        )}

        {/* Loading State */}
       {loading && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {Array.from({ length: 20 }).map((_, i) => (
      <ProductSkeleton key={i} />
    ))}
  </div>
)}

        {/* Products Grid */}
        {!loading && !error && (
          <>
            {products.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBagIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium">
                  No products found
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Try adjusting your search terms or browse all products.
                </p>
                <button
                  onClick={() => fetchProducts(1)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  View All Products
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>

                {/* Pagination Controls */}
                {searchType !== 'ai' && totalPages > 1 && (
                  <div className="flex justify-center mt-8 gap-2">
                    <button
                      onClick={() => fetchProducts(page - 1, query, searchType)}
                      disabled={page === 1}
                      className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="px-4 py-2">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => fetchProducts(page + 1, query, searchType)}
                      disabled={page === totalPages}
                      className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Chat Bot */}
      <ChatBot />
    </div>
  );
}
