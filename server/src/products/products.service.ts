/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { Model } from 'mongoose';
import { GeminiService } from '../gemini/gemini.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private gemini: GeminiService,
  ) {}

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
        { ingredients: { $regex: q, $options: 'i' } },
      ]
    }).limit(50).lean();
  }

  async findByFilter(filter: any) {
    return this.productModel.find(filter).limit(50).lean();
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.productModel.find().skip(skip).limit(limit).lean(),
      this.productModel.countDocuments(),
    ]);

    return { items, total, page, limit };
  }


  async checkRelevancy(q: string): Promise<{ relevant: boolean; reason?: string }> {
    const prompt = `
      Pre Task Instructions:
      Normalize the text if it has any typos or grammatical errors.
      Task: Check if the following user query is related to healthcare supplements, vitamins, or products in the inventory.
      Query: "${q}"

      Respond only in strict JSON:
      {
        "relevant": true|false,
        "reason": "<short reason why>"
      }
    `;

    const gresp = await this.gemini.ask(prompt);
    const cleaned = gresp.replace(/```json/gi, '').replace(/```/g, '').trim();

    try {
      return JSON.parse(cleaned);
    } catch (err) {
      console.error('Relevancy check parsing error:', err);
      return { relevant: false, reason: "Could not verify query relevance" };
    }
  }


  async aiSearch(q: string) {
    const relevancy = await this.checkRelevancy(q);
    if (!relevancy.relevant) {
      return { keywords: [], products: [], rawIntent: null, relevancy };
    }

    const prompt = `
      Pre Task Instructions:
      Normalize the text if it has any typos or grammatical errors.
      
      Role:
      You are an intent extraction engine for a healthcare product search system. 
      
      User query: "${q}"
      
      Task Context: 
      Extract exact concise intent as comma-separated keywords (e.g., "calcium, vitamin D, joint"). like if a user entered joints Health issues then intent should be exact as supplements for joints, not for health.
      Task: 
       - Identify the user's exact intent and extract the most relevant keywords. 
       - Keywords should strictly match product-related attributes such as ingredients (e.g., "calcium", "vitamin D"), health goals (e.g., "joint support", "immune boost"), or product type (e.g., "protein powder", "multivitamin"). 
       - Do not add unrelated words or explanations. 
       - Return keywords only, in a simple comma-separated list (no sentences, no extra text). 
       - Only output keywords.
       `;

    const response = await this.gemini.ask(prompt);
    const keywordsStr = response.replace(/\n/g, ' ').trim();
    const keywords = keywordsStr
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const orFilters = keywords.flatMap((k) => [
      { ingredients: { $regex: k, $options: 'i' } },
      { category: { $regex: k, $options: 'i' } },
      { name: { $regex: k, $options: 'i' } },
      { description: { $regex: k, $options: 'i' } },
    ]);

    const products = await this.findByFilter({ $or: orFilters });
    return { keywords, products, rawIntent: response, relevancy };
  }

 
  async chat(q: string) {
    const relevancy = await this.checkRelevancy(q);
    if (!relevancy.relevant) {
      return { recommendations: [], raw: null, relevancy };
    }

    const allProducts = await this.findAll(1, 100);
    const productsArray = Array.isArray(allProducts)
      ? allProducts
      : allProducts.items;

    const productSummaries = productsArray
      .map(
        (p) =>
          `Name: ${p.name}\nBrand: ${p.brand}\nCategory: ${p.category}\nDescription: ${p.description}\nIngredients: ${p.ingredients}\nDosage: ${p.dossage}\nPrice: ${p.price}`,
      )
      .join('\n\n');

    const schemaReference = `
      Product Schema:
      {
        "name": "string",
        "category": "string",
        "brand": "string",
        "description": "string",
        "price": "string",
        "ingredients": "string",
        "dossage": "string"
      }
    `;

    const prompt = `
      Pre Task Instructions:
      Normalize the text if it has any typos or grammatical errors.
      You are a healthcare supplement recommendation assistant.

      User query: "${q}"

      📦 Inventory:
      ${productSummaries || 'No products found in inventory.'}

      📘 Schema reference:
      ${schemaReference}

      ⚠️ Rules:
      - Only recommend products from the inventory.
      - Do not hallucinate.
      - Recommend up to 5 products with short reasons.
      - If no relevant product found, return [].

      Output JSON only:
      [
        { "name": "<product name>", "reason": "<reason>" }
      ]
    `;

    const gresp = await this.gemini.ask(prompt);
    const cleaned = gresp.replace(/```json/gi, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      return { recommendations: parsed, raw: gresp, relevancy };
    } catch (err) {
      console.log('Failed to parse JSON:', err);
      return { raw: gresp, recommendationsText: cleaned, relevancy };
    }
  }
}
