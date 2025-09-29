/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { Model } from 'mongoose';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private productModel: Model<ProductDocument>) {}

  async createMany(items: Partial<Product>[]) {
    return this.productModel.insertMany(items);
  }

  async findByTitle(title: string) {
  return this.productModel.find({
    name: { $regex: title, $options: 'i' },
  }).lean();
}


  async searchByText(q: string) {
    return this.productModel.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { ingredients: { $regex: q, $options: 'i' } }
      ]
    }).limit(50).lean();
  }

  async findByFilter(filter: any) {
    return this.productModel.find(filter).limit(50).lean();
  }

// products.service.ts
async findAll(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    this.productModel.find().skip(skip).limit(limit).lean(),
    this.productModel.countDocuments(),
  ]);

  return { items, total, page, limit };
}

}
