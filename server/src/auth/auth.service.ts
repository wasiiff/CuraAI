/* eslint-disable prettier/prettier */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService, private jwtService: JwtService) {}

  async signup(email: string, password: string, name?: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new UnauthorizedException('User already exists');
    const user = await this.usersService.create(email, password, name);
    const payload = { sub: user._id, email: user.email };
    return { access_token: this.jwtService.sign(payload) };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const isValid = await this.usersService.validatePassword(password, user.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');
    const payload = { sub: user._id, email: user.email };
    return { access_token: this.jwtService.sign(payload) };
  }
}
