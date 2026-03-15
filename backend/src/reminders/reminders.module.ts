import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RemindersService } from './reminders.service';
import { MessageSenderService } from './message-sender.service';
import { ReminderScheduler } from './reminder.scheduler';
import { Reminder } from '../common/entities/reminder.entity';
import { Course } from '../common/entities/course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reminder, Course])],
  providers: [RemindersService, MessageSenderService, ReminderScheduler],
  exports: [RemindersService],
})
export class RemindersModule {}
