import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminAuditService } from './admin-audit.service';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { RemindersModule } from '../reminders/reminders.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([]),
    RemindersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default_secret',
        signOptions: { expiresIn: '7d' },
      }),
  }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthGuard, AdminAuditService],
  exports: [AdminAuthGuard, JwtModule, AdminAuditService],
})
export class AdminModule {}
