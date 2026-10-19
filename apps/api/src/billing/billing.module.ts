import { Global, Module } from '@nestjs/common';
import { BillingController, PublicPlansController } from './billing.controller';
import { BillingService } from './billing.service';
@Global() @Module({ controllers: [BillingController, PublicPlansController], providers: [BillingService], exports: [BillingService] })
export class BillingModule {}
