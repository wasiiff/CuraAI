/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(email: string, password: string, name?: string) {
    const hashed = await bcrypt.hash(password, 10);
    const created = new this.userModel({ email, password: hashed, name });
    return created.save();
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).lean();
  }

  async findById(id: string) {
    return this.userModel.findById(id).lean();
  }

  async validatePassword(plain: string, hashed: string) {
    return bcrypt.compare(plain, hashed);
  }
}
