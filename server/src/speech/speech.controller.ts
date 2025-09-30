/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';

const uploadDir = '/tmp/uploads';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Controller('speech')
export class SpeechController {
  private openai: OpenAI;

  constructor() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OPENAI_API_KEY not set in environment');
    }
    this.openai = new OpenAI({ apiKey: key });
  }

  @Post('speech-to-text')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => {
          const id = uuidv4();
          const ext = extname(file.originalname) || '.webm';
          cb(null, `${id}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async transcribe(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }
    const filePath = file.path;
    try {
      // OpenAI JS SDK expects a Readable stream for file parameter
      const response = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath) as any,
        model: 'whisper-1',
      });

      // response.text is returned by API
      const text = (response as any).text || '';
      return { text };
    } catch (err) {
      console.error('Whisper error:', err);
      throw new HttpException('Transcription failed', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      // cleanup
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to delete temp file:', e);
      }
    }
  }
}
