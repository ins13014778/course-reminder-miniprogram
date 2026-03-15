import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Reminder } from '../common/entities/reminder.entity';
import { Course } from '../common/entities/course.entity';

@Injectable()
export class RemindersService {
  constructor(
    @InjectRepository(Reminder)
    private reminderRepository: Repository<Reminder>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  async createReminder(userId: number, courseId: number, remindTime: Date) {
    const reminder = this.reminderRepository.create({
      userId,
      courseId,
      remindTime,
      status: 'pending',
    });
    return this.reminderRepository.save(reminder);
  }

  async getPendingReminders() {
    const now = new Date();
    return this.reminderRepository.find({
      where: {
        status: 'pending',
        remindTime: LessThan(now),
      },
    });
  }

  async markAsSent(id: number) {
    await this.reminderRepository.update(id, { status: 'sent' });
  }

  async markAsFailed(id: number, errorMsg: string) {
    await this.reminderRepository.update(id, { status: 'failed', errorMsg });
  }
}
