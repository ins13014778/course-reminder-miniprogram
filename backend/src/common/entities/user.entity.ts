import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', unsigned: true })
  id: number;

  @Column({ length: 64, unique: true })
  openid: string;

  @Column({ length: 64, nullable: true })
  unionid: string;

  @Column({ length: 100, nullable: true })
  nickname: string;

  @Column({ length: 500, nullable: true })
  avatar: string;

  @Column({ name: 'school_name', length: 100, nullable: true })
  schoolName: string;

  @Column({ length: 100, nullable: true })
  major: string;

  @Column({ length: 20, nullable: true })
  grade: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
