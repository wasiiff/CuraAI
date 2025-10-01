/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { Model } from 'mongoose';
import { GeminiService } from '../gemini/gemini.service';

// Mapping symptoms to supplement categories
const symptomMapping: Record<string, string[]> = {
  tired: ["Vitamin B Complex", "Iron Supplements"],
  fatigue: ["Vitamin B Complex", "Iron Supplements"],
  weakness: ["Vitamin B Complex", "Iron Supplements"],
  "hair fall": ["Biotin", "Zinc", "Multivitamin"],
  "hair loss": ["Biotin", "Zinc", "Multivitamin"],
  "weak bones": ["Calcium", "Vitamin D"],
  stress: ["Magnesium", "Ashwagandha"],
  sleep: ["Melatonin", "Magnesium"],
  immunity: ["Vitamin C", "Zinc", "Echinacea"],
  "immune support": ["Vitamin C", "Zinc", "Echinacea"],
  digestion: ["Probiotics", "Fiber Supplements"],
  "joint pain": ["Glucosamine", "Chondroitin", "MSM", "Collagen"],
  "joint issues": ["Glucosamine", "Chondroitin", "MSM", "Collagen"],
  "arthritis": ["Glucosamine", "Chondroitin", "MSM", "Collagen", "Turmeric"],
  "knee pain": ["Glucosamine", "Collagen", "MSM"],
  "bone pain": ["Calcium", "Vitamin D", "Collagen"]
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private gemini: GeminiService,
  ) { }

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

  async symptomChecker(symptomText: string) {
    const prompt = `
  Analyze the following symptoms and map them to supplement categories.
  Symptoms: "${symptomText}"
  Return JSON in this format only:
  {
    "keywords": ["<keyword1>", "<keyword2>"],
    "reasoning": "short explanation of why these nutrients help"
  }
  `;

    const gresp = await this.gemini.ask(prompt);
    const cleaned = gresp.replace(/```json/gi, '').replace(/```/g, '').trim();

    let aiResult: { keywords: string[]; reasoning: string } = {
      keywords: [],
      reasoning: "Could not interpret symptoms clearly.",
    };

    try {
      aiResult = JSON.parse(cleaned);
    } catch (err) {
      console.error("Symptom parsing error:", err, "Response was:", cleaned);
    }

    // ✅ Step 1: Map AI keywords & user text to known nutrients
    const recommendations: string[] = [];
    aiResult.keywords.forEach((kw) => {
      Object.keys(symptomMapping).forEach((sym) => {
        if (
          kw.toLowerCase().includes(sym) ||
          symptomText.toLowerCase().includes(sym)
        ) {
          recommendations.push(...symptomMapping[sym]);
        }
      });
    });

    const uniqueRecs = [...new Set(recommendations)].slice(0, 5);

    // ✅ Step 2: Query DB for products containing these nutrients
    let products: any[] = [];
    if (uniqueRecs.length > 0) {
      const orFilters = uniqueRecs.flatMap((nutrient) => [
        { ingredients: { $regex: nutrient, $options: "i" } },
        { name: { $regex: nutrient, $options: "i" } },
        { description: { $regex: nutrient, $options: "i" } },
      ]);

      products = await this.findByFilter({ $or: orFilters });
    }

    // ✅ Step 3: Build a polished response
    return {
      symptoms: symptomText,
      recommendations: uniqueRecs.length > 0 ? uniqueRecs : ["General Multivitamin"],
      products: products.length > 0 ? products : [],
      explanation:
        aiResult.reasoning ||
        (uniqueRecs.length > 0
          ? `These supplements are commonly recommended for symptoms like "${symptomText}".`
          : `We could not find a strong match for your symptoms, but a balanced multivitamin may help support overall wellness.`),
      confidence: uniqueRecs.length > 0 ? "high" : "low",  // ✅ extra info for frontend
      suggestions: products.length === 0
        ? "No direct products found in our catalog for these nutrients. You may consult a healthcare provider for tailored advice."
        : "These products contain nutrients linked to your symptoms.",
    };
  }


  async aiSearch(q: string) {
    const relevancy = await this.checkRelevancy(q);
    if (!relevancy.relevant) {
      return { products: [], rawIntent: null, relevancy };
    }

    // ✅ Fetch all products (or maybe top 100 to avoid prompt overload)
    const allProducts = await this.findAll(1, 100);
    const productsArray = Array.isArray(allProducts) ? allProducts : allProducts.items;

    // Convert products into compact JSON for AI
    const productSummaries = productsArray.map((p) => ({
      _id: p._id,
      name: p.name,
      brand: p.brand,
      description: p.description,
      price: p.price,
      ingredients: p.ingredients,
      category: p.category,
    }));

    const prompt = `
    You are a product filter engine for healthcare supplements.

    User query: "${q}"

    Here is the available product dataset (JSON array):
    ${JSON.stringify(productSummaries, null, 2)}

    Task:
    - Select only the products relevant to the user query and symptoms, matching analysis Should Be Very Strict and Only return products that exactly match the query.
    - Do not invent or hallucinate.
    - Only return a JSON array of product objects exactly as in dataset.
    - If no relevant products, return [].

    Output JSON only:
    [
      {
        "_id": "<id>",
        "name": "<name>",
        "brand": "<brand>",
        "description": "<description>",
        "price": "<price>"
      }
    ]
  `;

    const gresp = await this.gemini.ask(prompt);
    const cleaned = gresp.replace(/```json/gi, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      return { products: parsed, rawIntent: q, relevancy };
    } catch (err) {
      console.error("AI search JSON parse error:", err);
      return { products: [], rawIntent: gresp, relevancy };
    }
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

    async findById(id: string) {
    return this.productModel.findById(id).lean();
  }
}
