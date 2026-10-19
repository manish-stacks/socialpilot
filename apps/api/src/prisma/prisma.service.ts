import { Global, Injectable, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try { await this.$connect(); }
    catch (e) {
      const msg = 'Cannot connect to MySQL. Is it running (docker compose -f infra/docker-compose.yml up -d) and is DATABASE_URL correct?';
      if (process.env.NODE_ENV === 'production') throw e;
      console.error(`\n[prisma] ${msg}\n`); // dev: keep the API up so /api/v1/health and the UI can report it
    }
  }
  async onModuleDestroy() { await this.$disconnect(); }
}

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
