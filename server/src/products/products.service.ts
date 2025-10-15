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
  // 🔹 Step 1: Ask Gemini for symptom analysis
  const prompt = `
    Analyze these symptoms and map them to supplement categories or nutrients.
    Symptoms: "${symptomText}"

    Respond ONLY in this JSON format:
    {
      "keywords": ["<keyword1>", "<keyword2>"],
      "related_terms": ["<term1>", "<term2>"],
      "reasoning": "short explanation"
    }
  `;

  const gresp = await this.gemini.ask(prompt);
  const cleaned = gresp.replace(/```json/gi, '').replace(/```/g, '').trim();

  let aiResult: { keywords: string[]; related_terms?: string[]; reasoning: string } = {
    keywords: [],
    related_terms: [],
    reasoning: "Could not interpret symptoms clearly.",
  };

  try {
    aiResult = JSON.parse(cleaned);
  } catch (err) {
    console.error("Symptom parsing error:", err, "Response was:", cleaned);
  }

  // 🔹 Step 2: Combine AI keywords + symptom mapping
  const normalizedInput = symptomText.toLowerCase();
  const allKeys = new Set<string>([
    ...aiResult.keywords.map(k => k.toLowerCase()),
    ...(aiResult.related_terms || []).map(k => k.toLowerCase())
  ]);

  const recommendations: string[] = [];

  Object.entries(symptomMapping).forEach(([sym, nutrients]) => {
    if ([...allKeys].some(k => k.includes(sym)) || normalizedInput.includes(sym)) {
      recommendations.push(...nutrients);
    }
  });

  // 🔹 Step 3: AI Enrichment (optional fallback)
  if (recommendations.length === 0 && aiResult.keywords.length > 0) {
    recommendations.push(...aiResult.keywords);
  }

  const uniqueRecs = [...new Set(recommendations)].slice(0, 6);

  // 🔹 Step 4: Query database with scoring
  let products: any[] = [];
  if (uniqueRecs.length > 0) {
    const allProducts = await this.findAll(1, 100);
    const dataset = Array.isArray(allProducts) ? allProducts : allProducts.items;

    // Compute a basic relevance score
    products = dataset
      .map((p) => {
        const score = uniqueRecs.reduce((acc, nutrient) => {
          const regex = new RegExp(nutrient, "i");
          const fields = `${p.name} ${p.description} ${p.ingredients}`;
          return regex.test(fields) ? acc + 1 : acc;
        }, 0);
        return { ...p, score };
      })
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  // 🔹 Step 5: Confidence estimation
  const confidence =
    uniqueRecs.length === 0 ? "low" :
    products.length < 2 ? "medium" : "high";

  // 🔹 Step 6: Structured and clear response
  return {
    type: "Symptom → Supplement Recommendation",
    symptoms: symptomText,
    recommendations: uniqueRecs.length > 0 ? uniqueRecs : ["General Multivitamin"],
    reasoning: aiResult.reasoning,
    products,
    confidence,
    explanation:
      aiResult.reasoning ||
      (uniqueRecs.length
        ? `These nutrients are commonly used to support symptoms like "${symptomText}".`
        : `No strong nutrient link found. A balanced multivitamin may help.`),
    suggestions:
      products.length === 0
        ? "No matching products in our catalog, but these nutrients may help. Consult a doctor if symptoms persist."
        : "The listed products contain ingredients linked to your reported symptoms.",
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
