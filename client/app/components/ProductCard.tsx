'use client';

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
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group border border-gray-100">
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors duration-200 line-clamp-2">
            {product.name}
          </h3>
          <div className="flex-shrink-0 ml-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {product.brand || 'No Brand'}
            </span>
          </div>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {product.description || 'No description available'}
        </p>
        
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold text-green-600">
            ${product.price ?? 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}