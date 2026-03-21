import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'course_name', length: 100 })
  courseName: string;

  @Column({ name: 'teacher_name', length: 50, nullable: true })
  teacherName: string;

  @Column({ length: 100, nullable: true })
  classroom: string;

  @Column({ type: 'tinyint' })
  weekday: number;

  @Column({ name: 'start_section', type: 'tinyint' })
  startSection: number;

  @Column({ name: 'end_section', type: 'tinyint' })
  endSection: number;

  @Column({ name: 'start_week', type: 'tinyint' })
  startWeek: number;

  @Column({ name: 'end_week', type: 'tinyint' })
  endWeek: number;

  @Column({ name: 'week_type', type: 'enum', enum: ['all', 'odd', 'even'], default: 'all' })
  weekType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
