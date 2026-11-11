import { Module } from '@nestjs/common';
import { ProductSheetController } from './product-sheet.controller';
import { ProductSheetService } from './product-sheet.service';
import { MediaModule } from '../media/media.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [MediaModule, ProductsModule],
  controllers: [ProductSheetController],
  providers: [ProductSheetService],
})
export class ProductSheetModule {}
