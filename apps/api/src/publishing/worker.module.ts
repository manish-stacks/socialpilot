import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../config/env';
import { PrismaModule } from '../prisma/prisma.service';
import { SettingsModule } from '../settings/settings.service';
import { QueueModule } from '../queue/queue.module';
import { MediaService } from '../media/media.service';
import { PublishingService } from './publishing.service';
import { WorkerRunner } from './reconciler.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, envFilePath: ['.env', '../../.env'] }), PrismaModule, SettingsModule, QueueModule],
  providers: [MediaService, PublishingService, WorkerRunner],
})
export class WorkerModule {}
