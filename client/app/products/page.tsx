/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";
import ChatBot from "../components/ChatBot";
import {
  ShoppingBagIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  FunnelIcon,
  SparklesIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import ProductSkeleton from "../components/ProductSkeleton";
import { useRouter } from "next/navigation";

type Product = {
  _id: string;
  name: string;
  brand?: string;
  description?: string;
  price?: string | number;
};

export default function ProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<"all" | "title" | "ai">("all");

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
    } else {
      setIsLoggedIn(true);
    }
  }, []);

  const fetchProducts = async (
    pageNum = 1,
    searchQuery?: string,
    type: "all" | "title" | "ai" = "all"
  ): Promise<{ hasResults: boolean; total: number; page: number }> => {
    setLoading(true);
    setError(null);
    setSearchType(type);

    try {
      const token = localStorage.getItem("token");

      let url = `${process.env.NEXT_PUBLIC_API_URL}/products?page=${pageNum}&limit=${limit}`;
      if (type === "title" && searchQuery) {
        url = `${
          process.env.NEXT_PUBLIC_API_URL
        }/products?title=${encodeURIComponent(
          searchQuery
        )}&page=${pageNum}&limit=${limit}`;
      } else if (type === "ai" && searchQuery) {
        url = `${
          process.env.NEXT_PUBLIC_API_URL
        }/products/ai-search?q=${encodeURIComponent(searchQuery)}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();

      if (type === "ai") {
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
      setError(err instanceof Error ? err.message : "An error occurred");
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
    const result = await fetchProducts(1, title, "title");
    return result.hasResults;
  };

  const handleAISearch = async (q: string) => {
    await fetchProducts(1, q, "ai");
  };

  const handleClearFilters = async () => {
    setQuery("");
    await fetchProducts(1);
  };

  const getResultsText = () => {
    const count = products.length;
    if (searchType === "all") return `${count} Products`;
    if (searchType === "title") return `${count} Results from Title Search`;
    if (searchType === "ai") return `${count} AI-Recommended Products`;
    return `${count} Products`;
  };

  const getSearchTypeBadge = () => {
    if (searchType === "all") return null;

    const badges = {
      title: { text: "Title Search", color: "blue", icon: FunnelIcon },
      ai: { text: "AI Recommended", color: "purple", icon: SparklesIcon },
    };

    const badge = badges[searchType];
    const Icon = badge.icon;

    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-${badge.color}-100 border border-${badge.color}-200`}
      >
        <Icon className={`h-4 w-4 text-${badge.color}-600`} />
        <span className={`text-sm font-semibold text-${badge.color}-800`}>
          {badge.text}
        </span>
      </div>
    );
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b-2 border-gray-200 sticky top-0 z-20">
        <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Title */}
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <ShoppingBagIcon className="h-7 w-7 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-wide">
                Cura<span className="text-blue-600">AI</span>
              </h1>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => fetchProducts(1)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold hover:bg-blue-50 px-3 py-2 rounded-lg transition-all duration-200"
              >
                <ShoppingBagIcon className="h-5 w-5" />
              </button>

              {isLoggedIn && (
                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    window.location.href = "/auth/login";
                  }}
                  className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-900">
                {getResultsText()}
              </h2>
              {getSearchTypeBadge()}
            </div>
            {searchType !== "all" && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg font-medium transition-all duration-200"
              >
                <FunnelIcon className="h-4 w-4" />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-6 mb-6 shadow-md">
            <div className="flex items-start gap-3 mb-3">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-red-700 font-bold text-lg">Error</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={() => fetchProducts(1)}
              className="mt-2 flex items-center gap-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-100 px-3 py-2 rounded-lg font-medium transition-all duration-200"
            >
              <ArrowRightIcon className="h-4 w-4" />
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
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBagIcon className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-gray-900 text-xl font-bold mb-2">
                  No products found
                </p>
                <p className="text-gray-500 text-sm mb-6">
                  Try adjusting your search terms or browse all products.
                </p>
                <button
                  onClick={() => fetchProducts(1)}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <ShoppingBagIcon className="h-5 w-5" />
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

                {/* Pagination */}
                {searchType !== "ai" && totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row sm:justify-center sm:items-center mt-10 gap-4 w-full">
                    {/* Previous Button */}
                    <button
                      onClick={() => fetchProducts(page - 1, query, searchType)}
                      disabled={page === 1}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md w-full sm:w-auto"
                    >
                      <ArrowLeftIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </button>

                    {/* Page Info */}
                    <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white rounded-lg border border-gray-300 shadow-sm w-full sm:w-auto">
                      <span className="text-gray-700 font-semibold">
                        Page {page}
                      </span>
                      <span className="text-gray-400">of</span>
                      <span className="text-gray-700 font-semibold">
                        {totalPages}
                      </span>
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={() => fetchProducts(page + 1, query, searchType)}
                      disabled={page === totalPages}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md w-full sm:w-auto"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ArrowRightIcon className="h-4 w-4" />
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
