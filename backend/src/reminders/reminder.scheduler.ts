import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MessageSenderService } from './message-sender.service';
import { RemindersService } from './reminders.service';

@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);

  constructor(
    private remindersService: RemindersService,
    private messageSender: MessageSenderService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleReminders() {
    let jobs = [];

    try {
      jobs = await this.remindersService.getDueReminderJobs();
    } catch (error) {
      this.logger.error(`Load reminder jobs failed: ${error.message}`);
      return;
    }

    for (const job of jobs) {
      try {
        await this.messageSender.sendReminder(job.user.openid, {
          courseName: job.course.courseName || job.course.course_name || 'Course reminder',
          startTime: this.remindersService.getCourseStartTime(job.course),
          location: job.course.classroom || job.course.location || 'TBD',
          remark: `Class starts in ${job.subscription.remindMinutes} minutes`,
          page: job.subscription.pagePath || 'pages/index/index',
        });

        await this.remindersService.markAsSent(job.reminder.id);
        await this.remindersService.consumeSubscription(job.subscription.id);
      } catch (error) {
        this.logger.error(`Send reminder failed: ${error.message}`);
        await this.remindersService.markAsFailed(job.reminder.id, error.message);
      }
    }
  }
}
