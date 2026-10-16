import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';

@Global()
@Module({
  imports: [JwtModule.registerAsync({
    global: true,
    useFactory: () => ({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: (process.env.ACCESS_TOKEN_TTL ?? '15m') as any },
    }),
  })],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
