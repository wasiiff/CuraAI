"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShoppingBagIcon,
  ArrowLeftIcon,
  BeakerIcon,
  ClipboardDocumentCheckIcon,
  CurrencyDollarIcon,
  TagIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

type Product = {
  _id: string;
  name: string;
  brand?: string;
  category?: string;
  description?: string;
  price?: string | number;
  ingredients?: string;
  dosage?: string;
};

export default function SingleProductPage() {
  const { id } = useParams();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/products/${id}`,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch product");
        }

        const data = await response.json();
        setProduct(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-red-200 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <InformationCircleIcon className="h-8 w-8 text-red-600" />
            <p className="font-semibold text-red-600 text-lg">Error</p>
          </div>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <ShoppingBagIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium text-lg">Product not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Page Header */}
      <header className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <ShoppingBagIcon className="h-7 w-7 text-blue-600" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              {product.name}
            </h1>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all hover:shadow-lg"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back
          </button>
        </div>
      </header>

      {/* Product Card */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-shadow">
          {/* Brand & Category */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200">
              <TagIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800 font-semibold">
                {product.brand || "No Brand"}
              </span>
            </div>
            {product.category && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-50 to-green-100 border border-green-200">
                <span className="text-sm text-green-800 font-semibold">
                  {product.category}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
            <h2 className="text-sm uppercase tracking-wide text-gray-500 font-semibold mb-2">
              Product Description
            </h2>
            <p className="text-gray-700 text-lg leading-relaxed">
              {product.description || "No description available"}
            </p>
          </div>

          {/* Ingredients & Dosage Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Ingredients */}
            {product.ingredients && (
              <div className="flex items-start gap-4 bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border border-purple-200 hover:shadow-md transition-shadow">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <BeakerIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1.5">
                    Ingredients
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {product.ingredients}
                  </p>
                </div>
              </div>
            )}

            {/* Dosage */}
            {product.dosage && (
              <div className="flex items-start gap-4 bg-gradient-to-br from-teal-50 to-cyan-50 p-5 rounded-xl border border-teal-200 hover:shadow-md transition-shadow">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <ClipboardDocumentCheckIcon className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1.5">
                    Dosage
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {product.dosage}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Price Section */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2.5 rounded-lg shadow-sm">
                  <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">
                    Product Price
                  </p>
                  <div className="text-4xl font-bold text-green-600">
                    ${product.price ?? "N/A"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product ID Footer */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Product ID: <span className="font-mono text-gray-700">{product._id}</span>
          </p>
        </div>
      </div>
    </div>
  );
}