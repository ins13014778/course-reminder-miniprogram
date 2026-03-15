import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportService } from './import.service';
import { ImportController } from './import.controller';
import { ImportTask } from '../common/entities/import-task.entity';
import { OcrService } from '../common/services/ocr.service';

@Module({
  imports: [TypeOrmModule.forFeature([ImportTask])],
  controllers: [ImportController],
  providers: [ImportService, OcrService],
  exports: [ImportService],
})
export class ImportModule {}
