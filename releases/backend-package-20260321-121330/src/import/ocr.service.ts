import { Injectable } from '@nestjs/common';

@Injectable()
export class OcrService {
  async parseScheduleImage(imageUrl: string): Promise<any> {
    // Mock OCR 识别，返回模拟的课程表数据
    return {
      success: true,
      data: [
        { row: 1, col: 2, text: '高等数学\n张老师\nA101' },
        { row: 1, col: 3, text: '英语\n李老师\nB202' },
      ],
    };
  }

  // 预留真实 OCR 接口
  async callTencentOcr(imageUrl: string): Promise<any> {
    // TODO: 接入腾讯云 OCR
    throw new Error('Not implemented');
  }
}
