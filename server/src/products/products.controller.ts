/* eslint-disable prettier/prettier */
import { Controller, Get, Query, Post, Body, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

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

  @Get('ai-search')
  async aiSearch(@Query('q') q: string) {
    return this.productsService.aiSearch(q);
  }

  @Post('chat')
  async chat(@Body() body: { q: string }) {
    const q = body.q || '';
    return this.productsService.chat(q);
  }
}
