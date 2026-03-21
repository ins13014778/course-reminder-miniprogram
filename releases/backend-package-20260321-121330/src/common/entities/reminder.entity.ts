import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('reminders')
export class Reminder {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'course_id', type: 'bigint', unsigned: true })
  courseId: number;

  @Column({ name: 'remind_time', type: 'datetime' })
  remindTime: Date;

  @Column({ type: 'enum', enum: ['pending', 'sent', 'failed'], default: 'pending' })
  status: string;

  @Column({ name: 'error_msg', type: 'text', nullable: true })
  errorMsg: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
