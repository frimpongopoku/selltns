import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ProductsModule } from '../products/products.module';
import { EmailModule } from '../email/email.module';
import { AffiliatesModule } from '../affiliates/affiliates.module';

@Module({
  imports: [ProductsModule, EmailModule, AffiliatesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
