/* eslint-disable prettier/prettier */
import { Controller, UseGuards } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';

@Controller('gemini')
@UseGuards(AuthGuard('jwt'))
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}
}
