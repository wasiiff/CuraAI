"use client";

import Link from "next/link";
import { ShoppingBagIcon, TagIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

type Product = {
  _id: string;
  name: string;
  brand?: string;
  description?: string;
  price?: string | number;
};

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/products/${product._id}`}
      className="block bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden group border border-gray-100 hover:border-blue-200 hover:-translate-y-1"
    >
      {/* Decorative Top Bar */}
      <div className="h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 group-hover:h-2 transition-all duration-300"></div>
      
      <div className="p-6">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="bg-blue-50 p-2 rounded-lg group-hover:bg-blue-100 transition-colors duration-200">
              <ShoppingBagIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors duration-200 line-clamp-2 mb-1">
                {product.name}
              </h3>
            </div>
          </div>
        </div>

        {/* Brand Badge */}
        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200">
            <TagIcon className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-800">
              {product.brand || "No Brand"}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="mb-5 p-3 bg-gray-50 rounded-lg border border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-all duration-200">
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
            {product.description || "No description available"}
          </p>
        </div>

        {/* Footer Section */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <div className="flex items-baseline gap-1">
            <span className="text-sm text-gray-500 font-medium">Price:</span>
            <div className="text-2xl font-bold text-green-600">
              ${product.price ?? "N/A"}
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 text-blue-600 group-hover:gap-2.5 transition-all duration-200">
            <span className="text-sm font-medium">View</span>
            <ArrowRightIcon className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}