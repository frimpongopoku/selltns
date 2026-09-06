import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestLoggingInterceptor } from './common/request-logging.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';
import { ProductsModule } from './products/products.module';
import { CollectionsModule } from './collections/collections.module';
import { MediaModule } from './media/media.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { OrdersModule } from './orders/orders.module';
import { AuthModule } from './auth/auth.module';
import { TeamModule } from './team/team.module';
import { StoryModule } from './story/story.module';
import { SupportModule } from './support/support.module';
import { VerificationModule } from './verification/verification.module';
import { SuperAdminModule } from './superadmin/superadmin.module';
import { BillingModule } from './billing/billing.module';
import { HealthModule } from './health/health.module';
import { AffiliatesModule } from './affiliates/affiliates.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    // Global default: generous enough that no legitimate storefront/admin
    // session ever hits it, but it caps how hard a bot can hammer any
    // single endpoint. Sensitive, unauthenticated, write-y routes (auth,
    // checkout, contact form) additionally set a much tighter @Throttle()
    // of their own — see those controllers.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    PrismaModule,
    TenantsModule,
    ProductsModule,
    CollectionsModule,
    MediaModule,
    PaymentMethodsModule,
    OrdersModule,
    AuthModule,
    TeamModule,
    StoryModule,
    SupportModule,
    VerificationModule,
    SuperAdminModule,
    BillingModule,
    HealthModule,
    AffiliatesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Reports unhandled exceptions to Sentry. No global catch-all filter
    // exists in this app otherwise, so this is the only one — must be
    // registered before any other exception filter, per @sentry/nestjs.
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
