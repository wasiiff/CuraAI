/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop()
  category: string;

  @Prop()
  brand: string;

  @Prop()
  description: string;

  @Prop()
  price: string;

  @Prop()
  ingredients: string;

  @Prop()
  dossage: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
