/* eslint-disable prettier/prettier */
import { Controller, Get, Query, Post, Body, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { GeminiService } from '../gemini/gemini.service';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';

@Controller('products')
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private gemini: GeminiService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async list(
    @Query('title') title?: string,
    @Query('q') q?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (title) {
      const items = await this.productsService.findByTitle(title);
      return { items, total: items.length, page: 1, limit: items.length };
    }

    if (q) {
      const items = await this.productsService.searchByText(q);
      return { items, total: items.length, page: 1, limit: items.length };
    }

    return this.productsService.findAll(pageNum, limitNum);
  }

  // AI intent-based search. Returns product suggestions based on intent.
  @Get('ai-search')
  async aiSearch(@Query('q') q: string) {
    const prompt = `User query: "${q}". Extract concise intent as comma-separated keywords (e.g., "calcium, vitamin D, joint"). Only output keywords.`;
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

    const products = await this.productsService.findByFilter({ $or: orFilters });
    return { keywords, products, rawIntent: response };
  }

  // Chatbot endpoint. Recommends products from inventory.
  @Post('chat')
  async chat(@Body() body: { q: string }) {
    const q = body.q || '';

    // ✅ fetch inventory with limit = 100
    const allProducts = await this.productsService.findAll(1, 100);
    const productsArray = Array.isArray(allProducts)
      ? allProducts
      : allProducts.items; // unwrap pagination

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

    const prompt = `You are a healthcare supplement recommendation assistant.

User query: "${q}"

📦 Inventory (products collection): 
${productSummaries || 'No products found in inventory.'}

📘 Schema reference:
${schemaReference}

⚠️ IMPORTANT RULES:
- Only recommend products that exist in the inventory list above.
- Do not invent or hallucinate items that are not in the inventory.
- Recommend up to 5 products that best match the user query.
- For each recommendation, provide a short reason (1–2 sentences).
- If no relevant product is found, return an empty array [].

Output format (strict JSON, no markdown fences):
[
  {
    "name": "<product name from inventory>",
    "reason": "<short reason>"
  }
]
`;

    const gresp = await this.gemini.ask(prompt);

    // ✅ sanitize markdown if AI adds code fences
    const cleaned = gresp.replace(/```json/gi, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      return { recommendations: parsed, raw: gresp };
    } catch (err) {
      console.log('Failed to parse JSON:', err);
      return { raw: gresp, recommendationsText: cleaned };
    }
  }
}
