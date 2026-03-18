import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Reminder } from '../common/entities/reminder.entity';
import { Course } from '../common/entities/course.entity';
import { UserSubscription } from '../common/entities/user-subscription.entity';

type DueJob = {
  reminder: Reminder;
  subscription: {
    id: number;
    remindMinutes: number;
    remindWeekends: boolean;
    pagePath: string;
  };
  user: {
    openid: string;
  };
  course: any;
};

@Injectable()
export class RemindersService {
  constructor(
    @InjectRepository(Reminder)
    private reminderRepository: Repository<Reminder>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(UserSubscription)
    private subscriptionRepository: Repository<UserSubscription>,
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

  getCourseStartTime(course: Course | any) {
    const customStartTime = course.startTime || course.start_time;
    if (customStartTime) return String(customStartTime);

    const sectionMap: Record<number, string> = {
      1: '08:30',
      2: '09:25',
      3: '10:25',
      4: '11:20',
      5: '14:00',
      6: '14:55',
      7: '16:00',
      8: '16:55',
      9: '19:00',
      10: '19:45',
    };

    return sectionMap[course.startSection ?? course.start_section] || '08:30';
  }

  getCurrentWeek() {
    const semesterStart = process.env.SEMESTER_START_DATE;
    if (!semesterStart) {
      return 1;
    }

    const start = new Date(semesterStart);
    if (Number.isNaN(start.getTime())) {
      return 1;
    }

    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
    return Math.max(1, diffWeeks);
  }

  async getDueReminderJobs(): Promise<DueJob[]> {
    const subscriptions = await this.subscriptionRepository.query(
      `SELECT
          us.id,
          us.user_id,
          us.template_id,
          us.page_path,
          us.remind_minutes,
          us.remind_weekends,
          us.remaining_count,
          us.status,
          u.openid
       FROM user_subscriptions us
       INNER JOIN users u ON u.id = us.user_id
       WHERE us.status = 'active'
         AND us.remaining_count > 0
         AND u.openid IS NOT NULL`,
    );

    if (!subscriptions.length) {
      return [];
    }

    const now = new Date();
    const dateText = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const weekday = now.getDay() === 0 ? 7 : now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentWeek = this.getCurrentWeek();
    const jobs: DueJob[] = [];

    for (const subscription of subscriptions) {
      const remindWeekends = !!Number(subscription.remind_weekends || 0);
      if ((weekday === 6 || weekday === 7) && !remindWeekends) {
        continue;
      }

      let availableCount = Number(subscription.remaining_count || 0);
      if (availableCount <= 0) {
        continue;
      }

      const courses = await this.courseRepository.query(
        `SELECT
            id,
            course_name,
            teacher,
            location,
            weekday,
            start_section,
            end_section,
            start_time,
            end_time,
            start_week,
            end_week
         FROM courses
         WHERE user_id = ?
           AND weekday = ?
           AND start_week <= ?
           AND end_week >= ?
         ORDER BY start_section ASC, id ASC`,
        [subscription.user_id, weekday, currentWeek, currentWeek],
      );

      for (const course of courses) {
        if (availableCount <= 0) {
          break;
        }

        const startTime = this.getCourseStartTime(course);
        const [hour, minute] = startTime.split(':').map(Number);
        const dueMinutes = hour * 60 + minute - Number(subscription.remind_minutes || 0);

        if (currentMinutes !== dueMinutes) {
          continue;
        }

        const remindHour = String(Math.floor(dueMinutes / 60)).padStart(2, '0');
        const remindMinute = String(dueMinutes % 60).padStart(2, '0');
        const remindTime = new Date(`${dateText}T${remindHour}:${remindMinute}:00`);

        const existing = await this.reminderRepository.findOne({
          where: {
            userId: Number(subscription.user_id),
            courseId: Number(course.id),
            remindTime,
          },
        });

        if (existing) {
          continue;
        }

        const reminder = this.reminderRepository.create({
          userId: Number(subscription.user_id),
          courseId: Number(course.id),
          remindTime,
          status: 'pending',
        });
        const savedReminder = await this.reminderRepository.save(reminder);
        availableCount -= 1;

        jobs.push({
          reminder: savedReminder,
          subscription: {
            id: Number(subscription.id),
            remindMinutes: Number(subscription.remind_minutes || 0),
            remindWeekends,
            pagePath: subscription.page_path || 'pages/index/index',
          },
          user: {
            openid: subscription.openid,
          },
          course,
        });
      }
    }

    return jobs;
  }

  async consumeSubscription(id: number) {
    const record = await this.subscriptionRepository.findOne({ where: { id } });
    if (!record) return;

    const nextCount = Math.max(0, Number(record.remainingCount || 0) - 1);
    await this.subscriptionRepository.update(id, {
      remainingCount: nextCount,
      status: nextCount > 0 ? 'active' : 'used',
    });
  }
}
