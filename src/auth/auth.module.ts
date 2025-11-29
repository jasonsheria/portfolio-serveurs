// src/auth/auth.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersService } from 'src/users/users.service';
import { GatewayModule } from '../chat/gateway.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '2h' },
      }),
      inject: [ConfigService],
    }),
    GatewayModule,
    UploadModule,
  ],
  // UsersService is provided by UsersModule and should NOT be re-provided here.
  // Re-providing it here causes Nest to try to instantiate UsersService inside
  // AuthModule (where Mongoose models may not be available), leading to
  // "Nest can't resolve dependencies" errors.
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}