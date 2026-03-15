import { Injectable } from '@nestjs/common';

@Injectable()
export class ScheduleParserService {
  parseOcrResult(ocrData: any): any[] {
    // Mock 解析逻辑
    const courses = [];

    if (ocrData.data) {
      ocrData.data.forEach((cell, index) => {
        const lines = cell.text.split('\n');
        courses.push({
          courseName: lines[0] || '未知课程',
          teacherName: lines[1] || null,
          classroom: lines[2] || null,
          weekday: (cell.col % 7) + 1,
          startSection: cell.row * 2 - 1,
          endSection: cell.row * 2,
          startWeek: 1,
          endWeek: 16,
          weekType: 'all',
        });
      });
    }

    return courses;
  }
}
