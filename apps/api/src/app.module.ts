import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt.guard';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { PostsModule } from './posts/posts.module';
import { AccountsModule } from './accounts/accounts.module';
import { BillingModule } from './billing/billing.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiModule } from './ai/ai.module';
import { MediaModule } from './media/media.module';
import { QueueModule } from './queue/queue.module';
import { MetaModule } from './integrations/meta/meta.module';
import { SettingsModule } from './settings/settings.service';
import { AdminModule } from './admin/admin.module';
import { MaintenanceGuard } from './admin/maintenance.guard';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, envFilePath: ['../../.env', '.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule, AuthModule, WorkspacesModule, BillingModule, PostsModule, AccountsModule,
    DashboardModule, AnalyticsModule, AiModule, MediaModule, QueueModule, MetaModule, SettingsModule, AdminModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_GUARD, useClass: JwtAuthGuard }, { provide: APP_GUARD, useClass: MaintenanceGuard }],
})
export class AppModule {}
