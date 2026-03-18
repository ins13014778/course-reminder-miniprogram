import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ length: 100, unique: true })
  openid: string;

  @Column({ length: 100, nullable: true })
  nickname: string | null;

  @Column({ length: 255, nullable: true, default: '' })
  signature: string | null;

  @Column({ name: 'avatar_url', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ length: 100, nullable: true, default: '' })
  school: string | null;

  @Column({ length: 100, nullable: true, default: '' })
  major: string | null;

  @Column({ length: 50, nullable: true, default: '' })
  grade: string | null;

  @Column({ name: 'account_status', length: 20, default: 'active' })
  accountStatus: string;

  @Column({ name: 'account_ban_reason', length: 255, nullable: true })
  accountBanReason: string | null;

  @Column({ name: 'account_banned_until', type: 'datetime', nullable: true })
  accountBannedUntil: Date | null;

  @Column({ name: 'note_status', length: 20, default: 'active' })
  noteStatus: string;

  @Column({ name: 'note_ban_reason', length: 255, nullable: true })
  noteBanReason: string | null;

  @Column({ name: 'note_banned_until', type: 'datetime', nullable: true })
  noteBannedUntil: Date | null;

  @Column({ name: 'share_status', length: 20, default: 'active' })
  shareStatus: string;

  @Column({ name: 'share_ban_reason', length: 255, nullable: true })
  shareBanReason: string | null;

  @Column({ name: 'share_banned_until', type: 'datetime', nullable: true })
  shareBannedUntil: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
