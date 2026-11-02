import { Module } from '@nestjs/common';
import { PhotoDropController } from './photo-drop.controller';
import { PhotoDropService } from './photo-drop.service';
import { MediaModule } from '../media/media.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [MediaModule, ProductsModule],
  controllers: [PhotoDropController],
  providers: [PhotoDropService],
})
export class PhotoDropModule {}
