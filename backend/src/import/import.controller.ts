import { Controller, Post, Get, Body, Param, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';

@Controller('import')
export class ImportController {
  constructor(private importService: ImportService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: any) {
    console.log('收到上传请求', { hasFile: !!file, filename: file?.originalname });
    const userId = 1;
    try {
      const result = await this.importService.createTask(userId, file.buffer, file.originalname);
      console.log('上传成功', result);
      return result;
    } catch (error) {
      console.error('上传失败', error.message);
      throw error;
    }
  }

  @Get('task/:id')
  getTask(@Param('id') id: string) {
    return this.importService.getTask(+id);
  }
}
