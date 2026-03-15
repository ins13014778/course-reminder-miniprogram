import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportTask } from '../common/entities/import-task.entity';
import { OcrService } from '../common/services/ocr.service';

@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(ImportTask)
    private importTaskRepository: Repository<ImportTask>,
    private ocrService: OcrService,
  ) {}

  async createTask(userId: number, fileBuffer: Buffer, filename: string) {
    const task = this.importTaskRepository.create({
      userId,
      imageUrl: filename,
      status: 'processing',
    });
    await this.importTaskRepository.save(task);

    try {
      const ocrResult = await this.ocrService.recognizeImage(fileBuffer, filename);
      await this.importTaskRepository.update(task.id, {
        status: 'success',
        ocrResult,
      });
      return { ...task, status: 'success', ocrResult };
    } catch (error) {
      await this.importTaskRepository.update(task.id, {
        status: 'failed',
        errorMsg: error.message,
      });
      throw error;
    }
  }

  async getTask(taskId: number) {
    return this.importTaskRepository.findOne({ where: { id: taskId } });
  }
}
