import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_subscriptions')
export class UserSubscription {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'template_id', length: 128 })
  templateId: string;

  @Column({ name: 'page_path', length: 255, default: 'pages/index/index' })
  pagePath: string;

  @Column({ name: 'remind_minutes', type: 'int', default: 15 })
  remindMinutes: number;

  @Column({ name: 'remind_weekends', type: 'tinyint', width: 1, default: () => '0' })
  remindWeekends: boolean;

  @Column({ name: 'remaining_count', type: 'int', default: 0 })
  remainingCount: number;

  @Column({ length: 20, default: 'active' })
  status: string;

  @Column({ name: 'last_subscribed_at', type: 'datetime', nullable: true })
  lastSubscribedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
