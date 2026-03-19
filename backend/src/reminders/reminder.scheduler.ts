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
      const sendPayload = {
        courseName: job.course.courseName || job.course.course_name || 'Course reminder',
        startTime: this.remindersService.getCourseStartTime(job.course),
        location: job.course.classroom || job.course.location || 'TBD',
        remark: `Class starts in ${job.subscription.remindMinutes} minutes`,
        page: job.subscription.pagePath || 'pages/index/index',
      };

      try {
        const response = await this.messageSender.sendReminder(job.user.openid, sendPayload);

        await this.remindersService.markAsSent(job.reminder.id);
        await this.remindersService.createSendLog({
          reminderId: job.reminder.id,
          userId: job.reminder.userId,
          courseId: job.reminder.courseId,
          status: 'sent',
          templateId: process.env.WECHAT_SUBSCRIBE_TEMPLATE_ID || null,
          pagePath: sendPayload.page,
          courseName: sendPayload.courseName,
          startTime: sendPayload.startTime,
          location: sendPayload.location,
          remark: sendPayload.remark,
          responseJson: response,
        });
        await this.remindersService.consumeSubscription(job.subscription.id);
      } catch (error) {
        this.logger.error(`Send reminder failed: ${error.message}`);
        await this.remindersService.markAsFailed(job.reminder.id, error.message);
        await this.remindersService.createSendLog({
          reminderId: job.reminder.id,
          userId: job.reminder.userId,
          courseId: job.reminder.courseId,
          status: 'failed',
          templateId: process.env.WECHAT_SUBSCRIBE_TEMPLATE_ID || null,
          pagePath: sendPayload.page,
          courseName: sendPayload.courseName,
          startTime: sendPayload.startTime,
          location: sendPayload.location,
          remark: sendPayload.remark,
          errorMessage: error.message,
        });
      }
    }
  }
}
