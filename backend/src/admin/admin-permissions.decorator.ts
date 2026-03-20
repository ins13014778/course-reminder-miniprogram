import { SetMetadata } from '@nestjs/common';

export const ADMIN_PERMISSIONS_KEY = 'admin:permissions';

export const ADMIN_PERMISSION_OPTIONS = [
  { key: 'user.view', label: '查看用户' },
  { key: 'user.ban', label: '封禁账号/笔记/分享/头像/个签' },
  { key: 'course.view', label: '查看课表' },
  { key: 'course.manage', label: '管理课表' },
  { key: 'share.view', label: '查看课表分享' },
  { key: 'share.manage', label: '管理课表分享' },
  { key: 'subscription.view', label: '查看订阅提醒' },
  { key: 'reminder_log.view', label: '查看提醒日志' },
  { key: 'note.view', label: '查看笔记' },
  { key: 'note.moderate', label: '审核笔记' },
  { key: 'note_share.view', label: '查看笔记分享' },
  { key: 'note_share.manage', label: '管理笔记分享' },
  { key: 'report.view', label: '查看举报' },
  { key: 'report.review', label: '处理举报' },
  { key: 'appeal.view', label: '查看用户申诉' },
  { key: 'appeal.review', label: '处理用户申诉' },
  { key: 'feedback.view', label: '查看反馈' },
  { key: 'feedback.review', label: '处理反馈' },
  { key: 'announcement.manage', label: '管理公告' },
  { key: 'content.manage', label: '管理页面内容' },
  { key: 'system.manage', label: '管理系统配置' },
  { key: 'audit.view', label: '查看审计日志' },
  { key: 'admin.manage', label: '管理管理员账号' },
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSION_OPTIONS)[number]['key'];

export const AdminPermissions = (...permissions: AdminPermission[]) =>
  SetMetadata(ADMIN_PERMISSIONS_KEY, permissions);
