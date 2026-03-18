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
    const jobs = await this.remindersService.getDueReminderJobs();

    for (const job of jobs) {
      try {
        await this.messageSender.sendReminder(job.user.openid, {
          courseName: job.course.courseName || (job.course as any).course_name || '课程提醒',
          startTime: this.remindersService.getCourseStartTime(job.course),
          location: (job.course as any).classroom || (job.course as any).location || '待定教室',
          remark: `还有 ${job.subscription.remindMinutes} 分钟上课，请提前到教室`,
        });
        await this.remindersService.markAsSent(job.reminder.id);
        await this.remindersService.consumeSubscription(job.subscription.id);
      } catch (error) {
        this.logger.error(`发送订阅消息失败: ${error.message}`);
        await this.remindersService.markAsFailed(job.reminder.id, error.message);
      }
    }
  }
}
