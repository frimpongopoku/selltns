import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantsModule } from './tenants/tenants.module';
import { ProductsModule } from './products/products.module';
import { CollectionsModule } from './collections/collections.module';
import { GalleryModule } from './gallery/gallery.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { OrdersModule } from './orders/orders.module';
import { AuthModule } from './auth/auth.module';
import { TeamModule } from './team/team.module';
import { StoryModule } from './story/story.module';

@Module({
  imports: [
    TenantsModule,
    ProductsModule,
    CollectionsModule,
    GalleryModule,
    PaymentMethodsModule,
    OrdersModule,
    AuthModule,
    TeamModule,
    StoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
