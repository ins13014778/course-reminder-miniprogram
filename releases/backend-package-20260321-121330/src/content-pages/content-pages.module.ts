import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { ContentPagesController } from './content-pages.controller';
import { ContentPagesService } from './content-pages.service';

@Module({
  imports: [AdminModule],
  controllers: [ContentPagesController],
  providers: [ContentPagesService],
})
export class ContentPagesModule {}
