import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './publishing/worker.module';

/** Separate process from the API: `npm run dev:worker`. */
async function main() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
}
main();
