import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RemindersService } from './reminders.service';
import { MessageSenderService } from './message-sender.service';

@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);

  constructor(
    private remindersService: RemindersService,
    private messageSender: MessageSenderService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleReminders() {
    const reminders = await this.remindersService.getPendingReminders();

    for (const reminder of reminders) {
      try {
        await this.messageSender.sendReminder(reminder.userId, {
          courseName: '课程名称',
        });
        await this.remindersService.markAsSent(reminder.id);
      } catch (error) {
        await this.remindersService.markAsFailed(reminder.id, error.message);
      }
    }
  }
}
