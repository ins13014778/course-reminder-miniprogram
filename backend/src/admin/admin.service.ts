import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { AdminAuditService } from './admin-audit.service';
import { ADMIN_PERMISSION_OPTIONS, AdminPermission } from './admin-permissions.decorator';
import { MessageSenderService } from '../reminders/message-sender.service';

type QueryValue = string | number | boolean | null;
type PermissionMode = 'active' | 'banned';
type PermissionKey = 'account' | 'note' | 'share' | 'avatar' | 'signature';
type AdminRole = 'super_admin' | 'operator' | 'moderator' | 'support';

type PermissionPayload = {
  mode?: PermissionMode;
  durationDays?: number | null;
  reason?: string | null;
};

type UserPermissionPayload = {
  account?: PermissionPayload;
  note?: PermissionPayload;
  share?: PermissionPayload;
  avatar?: PermissionPayload;
  signature?: PermissionPayload;
};

type HighRiskConfirmationPayload = {
  confirmationId?: number | string | null;
  confirmationCode?: string | null;
};

type HighRiskChallengePayload = {
  actionKey?: string;
  targetType?: string;
  targetIds?: Array<number | string>;
  summary?: string | null;
};

const ALL_ADMIN_PERMISSIONS = ADMIN_PERMISSION_OPTIONS.map((item) => item.key);
const USER_PERMISSION_KEYS: PermissionKey[] = ['account', 'note', 'share', 'avatar', 'signature'];

@Injectable()
export class AdminService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly adminAuditService: AdminAuditService,
    private readonly messageSender: MessageSenderService,
  ) {}

  private getAdminEmail() {
    return process.env.ADMIN_EMAIL || '478201690@qq.com';
  }

  private getAdminPassword() {
    return process.env.ADMIN_PASSWORD || 'czp123..';
  }

  private getAdminDisplayName() {
    return process.env.ADMIN_NAME || '系统管理员';
  }

  private readonly roleLabels: Record<AdminRole, string> = {
    super_admin: '超级管理员',
    operator: '运营',
    moderator: '审核员',
    support: '客服',
  };

  private getRoleLabel(role: string) {
    return this.roleLabels[(role as AdminRole) || 'support'] || role || '未知角色';
  }

  private readonly permissionLabels: Record<AdminPermission, string> = ADMIN_PERMISSION_OPTIONS.reduce(
    (map, item) => {
      map[item.key] = item.label;
      return map;
    },
    {} as Record<AdminPermission, string>,
  );

  private readonly rolePermissionDefaults: Record<AdminRole, AdminPermission[]> = {
    super_admin: [...ALL_ADMIN_PERMISSIONS],
    operator: [
      'course.view',
      'course.manage',
      'share.view',
      'share.manage',
      'subscription.view',
      'reminder_log.view',
      'feedback.view',
      'feedback.review',
      'announcement.manage',
      'content.manage',
    ],
    moderator: [
      'note.view',
      'note.moderate',
      'note_share.view',
      'note_share.manage',
      'report.view',
      'report.review',
    ],
    support: [
      'user.view',
      'course.view',
      'share.view',
      'subscription.view',
      'reminder_log.view',
      'appeal.view',
      'appeal.review',
      'feedback.view',
      'feedback.review',
    ],
  };

  private getRequestIp(request: any) {
    const forwarded = request?.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }

    return request?.ip || null;
  }

  private buildAdminSummary(admin: any) {
    return {
      email: admin?.email || null,
      name: admin?.name || null,
      role: admin?.role || null,
      roleLabel: this.getRoleLabel(admin?.role),
      permissions: Array.isArray(admin?.permissions) ? admin.permissions : [],
    };
  }

  private getPermissionLabel(permission: string) {
    return this.permissionLabels[permission as AdminPermission] || permission;
  }

  private getRoleDefaultPermissions(role: AdminRole) {
    return [...(this.rolePermissionDefaults[role] || [])];
  }

  private normalizeAdminPermissions(value: unknown, role: AdminRole) {
    if (role === 'super_admin') {
      return this.getRoleDefaultPermissions('super_admin');
    }

    const source = Array.isArray(value)
      ? value
      : typeof value === 'string' && value.trim()
        ? (() => {
            try {
              return JSON.parse(value);
            } catch {
              return [];
            }
          })()
        : [];

    const allowed = new Set<AdminPermission>(ALL_ADMIN_PERMISSIONS);
    const unique = new Set<AdminPermission>();

    if (Array.isArray(source)) {
      source.forEach((item) => {
        if (typeof item === 'string' && allowed.has(item as AdminPermission)) {
          unique.add(item as AdminPermission);
        }
      });
    }

    return Array.from(unique);
  }

  private stringifyAdminPermissions(role: AdminRole, permissions: AdminPermission[]) {
    return JSON.stringify(this.normalizeAdminPermissions(permissions, role));
  }

  private mapAdminAccountRow(row: any) {
    const role = (row?.role || 'support') as AdminRole;
    const permissions = this.normalizeAdminPermissions(row?.permission_json, role);

    return {
      ...row,
      roleLabel: this.getRoleLabel(role),
      permissions,
      permissionLabels: permissions.map((permission) => this.getPermissionLabel(permission)),
      isSystemProtected: this.isPrimarySuperAdminAccount(row),
    };
  }

  private isPrimarySuperAdminAccount(account: any) {
    const expectedEmail = this.getAdminEmail().trim().toLowerCase();
    return String(account?.email || '').trim().toLowerCase() === expectedEmail;
  }

  private async tableExists(tableName: string) {
    const rows = await this.dataSource.query('SHOW TABLES LIKE ?', [tableName]);
    return rows.length > 0;
  }

  private async ensureTableExists(tableName: string, message: string) {
    const exists = await this.tableExists(tableName).catch(() => false);
    if (!exists) {
      throw new BadRequestException(message);
    }
  }

  private isBanActive(status?: string | null, bannedUntil?: Date | string | null) {
    if (status !== 'banned') {
      return false;
    }

    if (!bannedUntil) {
      return true;
    }

    const time = new Date(bannedUntil).getTime();
    if (Number.isNaN(time)) {
      return true;
    }

    return time > Date.now();
  }

  private normalizePermission(prefix: PermissionKey, row: any) {
    const status = row[`${prefix}_status`];
    const bannedUntil = row[`${prefix}_banned_until`];
    const reason = row[`${prefix}_ban_reason`];

    return {
      status: this.isBanActive(status, bannedUntil) ? 'banned' : 'active',
      rawStatus: status || 'active',
      bannedUntil,
      reason: reason || '',
    };
  }

  private attachPermissionSummary(row: any) {
    const permissions = USER_PERMISSION_KEYS.reduce(
      (map, key) => {
        map[key] = this.normalizePermission(key, row);
        return map;
      },
      {} as Record<PermissionKey, ReturnType<AdminService['normalizePermission']>>,
    );

    return {
      ...row,
      permissions,
    };
  }

  private buildPermissionUpdate(
    prefix: PermissionKey,
    payload: PermissionPayload | undefined,
    sets: string[],
    params: QueryValue[],
  ) {
    if (!payload || !payload.mode) {
      return;
    }

    if (payload.mode !== 'active' && payload.mode !== 'banned') {
      throw new BadRequestException(`Invalid ${prefix} mode`);
    }

    if (payload.mode === 'active') {
      sets.push(
        `${prefix}_status = ?`,
        `${prefix}_ban_reason = ?`,
        `${prefix}_banned_until = ?`,
      );
      params.push('active', null, null);
      return;
    }

    const durationDays =
      payload.durationDays === null || typeof payload.durationDays === 'undefined'
        ? null
        : Number(payload.durationDays);

    if (durationDays !== null && (!Number.isFinite(durationDays) || durationDays <= 0)) {
      throw new BadRequestException(`${prefix} durationDays must be a positive number`);
    }

    const bannedUntil =
      durationDays === null
        ? null
        : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 19)
            .replace('T', ' ');

    sets.push(
      `${prefix}_status = ?`,
      `${prefix}_ban_reason = ?`,
      `${prefix}_banned_until = ?`,
    );
    params.push('banned', (payload.reason || '').trim() || null, bannedUntil);
  }

  private async columnExists(tableName: string, columnName: string) {
    const rows = await this.dataSource.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE ?`, [columnName]);
    return rows.length > 0;
  }

  private normalizeIdList(ids: unknown) {
    if (!Array.isArray(ids)) {
      return [];
    }

    const unique = new Set<number>();
    ids.forEach((item) => {
      const value = Number(item);
      if (Number.isInteger(value) && value > 0) {
        unique.add(value);
      }
    });

    return Array.from(unique);
  }

  private buildChallengeTargetFingerprint(targetIds: Array<number | string>) {
    return JSON.stringify(
      targetIds
        .map((item) => String(item))
        .sort((left, right) => left.localeCompare(right)),
    );
  }

  private buildHighRiskCode() {
    return String(randomInt(100000, 999999));
  }

  private normalizeHighRiskPayload(payload: unknown): HighRiskConfirmationPayload {
    return {
      confirmationId: payload && typeof payload === 'object' ? (payload as any).confirmationId : null,
      confirmationCode: payload && typeof payload === 'object' ? (payload as any).confirmationCode : null,
    };
  }

  private requiresHighRiskForPermissions(payload: UserPermissionPayload) {
    return USER_PERMISSION_KEYS.some((key) => payload?.[key]?.mode === 'banned');
  }

  private requiresHighRiskForShareStatus(status?: string) {
    return status === 'blocked';
  }

  private requiresHighRiskForNoteModeration(status?: string) {
    return status === 'blocked';
  }

  private requiresHighRiskForReport(payload: { status?: string; action?: string }) {
    return payload?.status === 'resolved' && ['block_note', 'block_share'].includes(payload?.action || 'none');
  }

  private requiresHighRiskForAdminAccountUpdate(payload: {
    role?: string;
    status?: string;
    permissions?: unknown;
  }) {
    return (
      payload?.role !== undefined ||
      payload?.status === 'disabled' ||
      payload?.permissions !== undefined
    );
  }

  private async getViolationStats(userId: number) {
    const exists = await this.tableExists('user_violation_records').catch(() => false);
    if (!exists) {
      return {
        total: 0,
        active: 0,
        lifted: 0,
        lastCreatedAt: null,
      };
    }

    const rows = await this.dataSource.query(
      `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN record_status = 'active' THEN 1 ELSE 0 END) AS active_total,
          SUM(CASE WHEN record_status = 'lifted' THEN 1 ELSE 0 END) AS lifted_total,
          MAX(created_at) AS last_created_at
       FROM user_violation_records
       WHERE user_id = ?`,
      [userId],
    );

    return {
      total: Number(rows[0]?.total || 0),
      active: Number(rows[0]?.active_total || 0),
      lifted: Number(rows[0]?.lifted_total || 0),
      lastCreatedAt: rows[0]?.last_created_at || null,
    };
  }

  private async getViolationRecords(userId: number) {
    const exists = await this.tableExists('user_violation_records').catch(() => false);
    if (!exists) {
      return [];
    }

    return this.dataSource.query(
      `SELECT
          id,
          user_id,
          violation_type,
          source_type,
          source_id,
          action_type,
          reason,
          duration_days,
          expires_at,
          record_status,
          related_report_id,
          related_appeal_id,
          operator_email,
          metadata_json,
          created_at
       FROM user_violation_records
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 20`,
      [userId],
    );
  }

  private async recordViolation(payload: {
    userId?: number | null;
    violationType: PermissionKey | 'report';
    sourceType: string;
    sourceId?: number | string | null;
    actionType: string;
    reason?: string | null;
    durationDays?: number | null;
    expiresAt?: string | Date | null;
    recordStatus?: 'active' | 'lifted';
    relatedReportId?: number | null;
    relatedAppealId?: number | null;
    operator?: any;
    metadata?: any;
  }) {
    if (!payload.userId) {
      return;
    }

    const exists = await this.tableExists('user_violation_records').catch(() => false);
    if (!exists) {
      return;
    }

    const expiresAt =
      payload.expiresAt instanceof Date
        ? payload.expiresAt.toISOString().slice(0, 19).replace('T', ' ')
        : payload.expiresAt || null;

    await this.dataSource.query(
      `INSERT INTO user_violation_records
        (user_id, violation_type, source_type, source_id, action_type, reason, duration_days, expires_at, record_status, related_report_id, related_appeal_id, operator_email, metadata_json, _openid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '')`,
      [
        payload.userId,
        payload.violationType,
        payload.sourceType,
        payload.sourceId == null ? null : String(payload.sourceId),
        payload.actionType,
        payload.reason || null,
        payload.durationDays == null ? null : Number(payload.durationDays),
        expiresAt,
        payload.recordStatus || 'active',
        payload.relatedReportId || null,
        payload.relatedAppealId || null,
        payload.operator?.email || null,
        payload.metadata ? JSON.stringify(payload.metadata) : null,
      ],
    );
  }

  private async consumeHighRiskConfirmation(options: {
    required: boolean;
    admin: any;
    actionKey: string;
    targetType: string;
    targetIds: Array<number | string>;
    payload?: HighRiskConfirmationPayload;
  }) {
    if (!options.required) {
      return;
    }

    await this.ensureTableExists(
      'admin_action_confirmations',
      'admin_action_confirmations table is not ready yet',
    );

    const confirmationId = Number(options.payload?.confirmationId || 0);
    const confirmationCode = String(options.payload?.confirmationCode || '').trim();

    if (!confirmationId || !confirmationCode) {
      throw new BadRequestException('High-risk confirmation required');
    }

    const rows = await this.dataSource.query(
      `SELECT id, admin_email, action_key, target_type, target_ids_json, confirmation_code, expires_at, used_at
         FROM admin_action_confirmations
        WHERE id = ?
        LIMIT 1`,
      [confirmationId],
    );

    if (!rows.length) {
      throw new BadRequestException('High-risk confirmation not found');
    }

    const challenge = rows[0];
    const expiresAt = challenge.expires_at ? new Date(challenge.expires_at).getTime() : 0;

    if (challenge.used_at) {
      throw new BadRequestException('High-risk confirmation already used');
    }

    if (!expiresAt || Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
      throw new BadRequestException('High-risk confirmation expired');
    }

    if (String(challenge.admin_email || '').trim().toLowerCase() !== String(options.admin?.email || '').trim().toLowerCase()) {
      throw new BadRequestException('High-risk confirmation does not belong to current admin');
    }

    if (challenge.action_key !== options.actionKey || challenge.target_type !== options.targetType) {
      throw new BadRequestException('High-risk confirmation does not match this action');
    }

    if (
      String(challenge.target_ids_json || '') !==
      this.buildChallengeTargetFingerprint(options.targetIds)
    ) {
      throw new BadRequestException('High-risk confirmation target mismatch');
    }

    if (String(challenge.confirmation_code || '').trim() !== confirmationCode) {
      throw new BadRequestException('High-risk confirmation code mismatch');
    }

    await this.dataSource.query(
      `UPDATE admin_action_confirmations
          SET used_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [confirmationId],
    );
  }

  async createHighRiskChallenge(payload: HighRiskChallengePayload, admin?: any) {
    await this.ensureTableExists(
      'admin_action_confirmations',
      'admin_action_confirmations table is not ready yet',
    );

    const actionKey = String(payload?.actionKey || '').trim();
    const targetType = String(payload?.targetType || '').trim();
    const targetIds = this.normalizeIdList(payload?.targetIds);

    if (!actionKey || !targetType || !targetIds.length) {
      throw new BadRequestException('actionKey, targetType and targetIds are required');
    }

    const confirmationCode = this.buildHighRiskCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');

    const result = await this.dataSource.query(
      `INSERT INTO admin_action_confirmations
        (admin_id, admin_email, action_key, target_type, target_ids_json, summary, confirmation_code, expires_at, _openid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '')`,
      [
        Number(admin?.adminId || 0) || null,
        admin?.email || null,
        actionKey,
        targetType,
        this.buildChallengeTargetFingerprint(targetIds),
        (payload?.summary || '').trim() || null,
        confirmationCode,
        expiresAt,
      ],
    );

    await this.adminAuditService.log({
      ...this.buildAdminSummary(admin),
      action: 'admin.high_risk.challenge',
      targetType,
      targetId: targetIds.join(','),
      summary: `High-risk confirmation challenge created: ${actionKey}`,
      detail: { actionKey, targetType, targetIds },
    });

    return {
      confirmationId: Number(result?.insertId || 0),
      confirmationCode,
      expiresAt,
    };
  }

  async getReminderLogSummary() {
    const exists = await this.tableExists('reminder_send_logs').catch(() => false);
    if (!exists) {
      return {
        sentCount: 0,
        failedCount: 0,
        failedLast24h: 0,
        retriedCount: 0,
        criticalCount: 0,
        latestAlerts: [],
      };
    }

    const hasRetryCount = await this.columnExists('reminder_send_logs', 'retry_count').catch(() => false);
    const counts = await this.dataSource.query(
      `SELECT
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent_total,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_total,
          SUM(CASE WHEN status = 'failed' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) AS failed_last_24h,
          SUM(CASE WHEN status = 'failed' ${hasRetryCount ? 'AND retry_count > 0' : 'AND 1 = 0'} THEN 1 ELSE 0 END) AS retried_total,
          SUM(CASE WHEN status = 'failed' ${hasRetryCount ? 'AND retry_count >= 2' : 'AND 1 = 0'} THEN 1 ELSE 0 END) AS critical_total
       FROM reminder_send_logs`,
    );

    const latestAlerts = await this.dataSource.query(
      `SELECT
          l.id,
          l.status,
          l.course_name,
          l.start_time,
          l.location,
          l.error_message,
          ${hasRetryCount ? 'l.retry_count' : '0 AS retry_count'},
          ${hasRetryCount ? 'l.last_retry_at' : 'NULL AS last_retry_at'},
          u.nickname,
          u.openid,
          l.created_at
       FROM reminder_send_logs l
       LEFT JOIN users u ON u.id = l.user_id
       WHERE l.status = 'failed'
       ORDER BY ${hasRetryCount ? 'l.retry_count DESC,' : ''} l.created_at DESC, l.id DESC
       LIMIT 8`,
    );

    return {
      sentCount: Number(counts[0]?.sent_total || 0),
      failedCount: Number(counts[0]?.failed_total || 0),
      failedLast24h: Number(counts[0]?.failed_last_24h || 0),
      retriedCount: Number(counts[0]?.retried_total || 0),
      criticalCount: Number(counts[0]?.critical_total || 0),
      latestAlerts,
    };
  }

  async login(payload: { email?: string; password?: string; request?: any }) {
    const email = String(payload?.email || '').trim().toLowerCase();
    const password = String(payload?.password || '');
    const expectedEmail = this.getAdminEmail().trim().toLowerCase();
    const request = payload?.request;

    if (!email || !password) {
      throw new BadRequestException('请输入管理员账号和密码');
    }

    const adminRows = await this.dataSource.query(
      `SELECT id, email, password_hash, name, role, status, permission_json
         FROM admin_accounts
        WHERE email = ?
        LIMIT 1`,
      [email],
    ).catch(() => []);

    if (adminRows.length) {
      const adminAccount = adminRows[0];
      const resolvedPermissions = this.normalizeAdminPermissions(adminAccount.permission_json, adminAccount.role);
      const matched = await bcrypt.compare(password, adminAccount.password_hash || '');

      if (!matched) {
        throw new BadRequestException('管理员账号或密码错误');
      }

      if (adminAccount.status !== 'active') {
        throw new BadRequestException('该管理员账号已停用');
      }

      const token = this.jwtService.sign({
        role: adminAccount.role,
        email: adminAccount.email,
        name: adminAccount.name,
        adminId: Number(adminAccount.id),
        permissions: resolvedPermissions,
      });

      const profile = {
        role: adminAccount.role,
        roleLabel: this.getRoleLabel(adminAccount.role),
        email: adminAccount.email,
        name: adminAccount.name,
        adminId: Number(adminAccount.id),
        permissions: resolvedPermissions,
        permissionLabels: resolvedPermissions.map((permission) => this.getPermissionLabel(permission)),
        isSystemProtected: this.isPrimarySuperAdminAccount(adminAccount),
      };

      await this.adminAuditService.log({
        adminEmail: adminAccount.email,
        adminName: adminAccount.name,
        adminRole: adminAccount.role,
        action: 'admin.login',
        targetType: 'admin_account',
        targetId: adminAccount.id,
        summary: `管理员登录：${adminAccount.email}`,
        detail: { loginSource: 'admin_accounts' },
        ipAddress: this.getRequestIp(request),
      });

      return { token, profile };
    }

    let passwordMatched = false;
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;

    if (passwordHash) {
      passwordMatched = await bcrypt.compare(password, passwordHash);
    } else {
      passwordMatched = password === this.getAdminPassword();
    }

    if (email !== expectedEmail || !passwordMatched) {
      throw new BadRequestException('管理员账号或密码错误');
    }

    const token = this.jwtService.sign({
      role: 'super_admin',
      email: expectedEmail,
      name: this.getAdminDisplayName(),
      permissions: this.getRoleDefaultPermissions('super_admin'),
    });

    const profile = {
      role: 'super_admin',
      roleLabel: this.getRoleLabel('super_admin'),
      email: expectedEmail,
      name: this.getAdminDisplayName(),
      permissions: this.getRoleDefaultPermissions('super_admin'),
      permissionLabels: this.getRoleDefaultPermissions('super_admin').map((permission) =>
        this.getPermissionLabel(permission),
      ),
      isSystemProtected: true,
    };

    await this.adminAuditService.log({
      adminEmail: expectedEmail,
      adminName: this.getAdminDisplayName(),
      adminRole: 'super_admin',
      action: 'admin.login',
      targetType: 'admin_account',
      targetId: expectedEmail,
      summary: `系统超级管理员登录：${expectedEmail}`,
      detail: { loginSource: passwordHash ? 'env_hash' : 'env_plain' },
      ipAddress: this.getRequestIp(request),
    });

    return {
      token,
      profile,
    };
  }

  async getOverview() {
    const feedbackTableExists = await this.tableExists('user_feedback');
    const appealTableExists = await this.tableExists('user_appeals');
    const violationTableExists = await this.tableExists('user_violation_records').catch(() => false);
    const [
      users,
      courses,
      notes,
      subscriptions,
      shares,
      templates,
      announcements,
      bannedUsers,
      noteBans,
      shareBans,
      blockedNotes,
      blockedKeys,
      sharedNotes,
      pendingReports,
      pendingAppeals,
      pendingFeedback,
      totalViolations,
      activeViolations,
    ] =
      await Promise.all([
        this.dataSource.query('SELECT COUNT(*) AS total FROM users'),
        this.dataSource.query('SELECT COUNT(*) AS total FROM courses'),
        this.dataSource.query('SELECT COUNT(*) AS total FROM notes'),
        this.dataSource.query("SELECT COUNT(*) AS total FROM user_subscriptions WHERE status = 'active'"),
        this.dataSource.query('SELECT COUNT(*) AS total FROM schedule_share_keys WHERE is_active = 1'),
        this.dataSource.query('SELECT COUNT(*) AS total FROM course_templates WHERE is_active = 1'),
        this.dataSource.query("SELECT COUNT(*) AS total FROM announcements WHERE status = 'published'"),
        this.dataSource.query(
          "SELECT COUNT(*) AS total FROM users WHERE account_status = 'banned' AND (account_banned_until IS NULL OR account_banned_until > NOW())",
        ),
        this.dataSource.query(
          "SELECT COUNT(*) AS total FROM users WHERE note_status = 'banned' AND (note_banned_until IS NULL OR note_banned_until > NOW())",
        ),
        this.dataSource.query(
          "SELECT COUNT(*) AS total FROM users WHERE share_status = 'banned' AND (share_banned_until IS NULL OR share_banned_until > NOW())",
        ),
        this.dataSource.query("SELECT COUNT(*) AS total FROM notes WHERE status = 'blocked'"),
        this.dataSource.query("SELECT COUNT(*) AS total FROM schedule_share_keys WHERE status = 'blocked'"),
        this.dataSource.query("SELECT COUNT(*) AS total FROM note_shares WHERE status = 'active'"),
        this.dataSource.query("SELECT COUNT(*) AS total FROM content_reports WHERE status = 'pending'"),
        appealTableExists
          ? this.dataSource.query("SELECT COUNT(*) AS total FROM user_appeals WHERE status = 'pending'")
          : Promise.resolve([{ total: 0 }]),
        feedbackTableExists
          ? this.dataSource.query("SELECT COUNT(*) AS total FROM user_feedback WHERE status = 'pending'")
          : Promise.resolve([{ total: 0 }]),
        violationTableExists
          ? this.dataSource.query('SELECT COUNT(*) AS total FROM user_violation_records')
          : Promise.resolve([{ total: 0 }]),
        violationTableExists
          ? this.dataSource.query("SELECT COUNT(*) AS total FROM user_violation_records WHERE record_status = 'active'")
          : Promise.resolve([{ total: 0 }]),
      ]);

    const [recentUsers, recentNotes, recentCourses, reminderSummary] = await Promise.all([
      this.dataSource.query(
        `SELECT id, nickname, school, major, grade, created_at
           FROM users
          ORDER BY created_at DESC
          LIMIT 6`,
      ),
      this.dataSource.query(
        `SELECT n.id, n.content, n.status, n.updated_at, u.nickname
           FROM notes n
           LEFT JOIN users u ON u.id = n.user_id
          ORDER BY n.updated_at DESC, n.id DESC
          LIMIT 5`,
      ),
      this.dataSource.query(
        `SELECT c.id, c.course_name, c.teacher, c.location, c.weekday, c.start_section, c.end_section, u.nickname
           FROM courses c
           LEFT JOIN users u ON u.id = c.user_id
          ORDER BY c.id DESC
          LIMIT 6`,
      ),
      this.getReminderLogSummary(),
    ]);

    return {
      metrics: {
        users: Number(users[0]?.total || 0),
        courses: Number(courses[0]?.total || 0),
        notes: Number(notes[0]?.total || 0),
        activeSubscriptions: Number(subscriptions[0]?.total || 0),
        activeShares: Number(shares[0]?.total || 0),
        templateCourses: Number(templates[0]?.total || 0),
        publishedAnnouncements: Number(announcements[0]?.total || 0),
        bannedUsers: Number(bannedUsers[0]?.total || 0),
        noteBans: Number(noteBans[0]?.total || 0),
        shareBans: Number(shareBans[0]?.total || 0),
        blockedNotes: Number(blockedNotes[0]?.total || 0),
        blockedKeys: Number(blockedKeys[0]?.total || 0),
        sharedNotes: Number(sharedNotes[0]?.total || 0),
        pendingReports: Number(pendingReports[0]?.total || 0),
        pendingAppeals: Number(pendingAppeals[0]?.total || 0),
        pendingFeedback: Number(pendingFeedback[0]?.total || 0),
        totalViolations: Number(totalViolations[0]?.total || 0),
        activeViolations: Number(activeViolations[0]?.total || 0),
        failedReminders24h: Number(reminderSummary.failedLast24h || 0),
        criticalReminderAlerts: Number(reminderSummary.criticalCount || 0),
      },
      recentUsers,
      recentNotes,
      recentCourses,
      reminderSummary,
      featureHealth: {
        remindersTable: await this.tableExists('reminders'),
        importTasksTable: await this.tableExists('import_tasks'),
        notesTable: await this.tableExists('notes'),
        announcementTable: await this.tableExists('announcements'),
        appealTable: appealTableExists,
        feedbackTable: feedbackTableExists,
        violationTable: violationTableExists,
      },
    };
  }

  async getCurrentAdminProfile(admin: any) {
    const email = String(admin?.email || '').trim().toLowerCase();
    const adminId = Number(admin?.adminId || 0);

    if (await this.tableExists('admin_accounts').catch(() => false)) {
      const rows = await this.dataSource
        .query(
          `SELECT id, email, name, role, status, permission_json
             FROM admin_accounts
            WHERE id = ? OR email = ?
            ORDER BY id ASC
            LIMIT 1`,
          [adminId || 0, email],
        )
        .catch(() => []);

      if (rows.length) {
        const row = this.mapAdminAccountRow(rows[0]);
        return {
          adminId: Number(row.id),
          email: row.email,
          name: row.name,
          role: row.role,
          roleLabel: row.roleLabel,
          permissions: row.permissions,
          permissionLabels: row.permissionLabels,
          isSystemProtected: row.isSystemProtected,
        };
      }
    }

    return {
      adminId: adminId || null,
      email: email || this.getAdminEmail().trim().toLowerCase(),
      name: admin?.name || this.getAdminDisplayName(),
      role: 'super_admin',
      roleLabel: this.getRoleLabel('super_admin'),
      permissions: this.getRoleDefaultPermissions('super_admin'),
      permissionLabels: this.getRoleDefaultPermissions('super_admin').map((permission) =>
        this.getPermissionLabel(permission),
      ),
      isSystemProtected: true,
    };
  }

  async getUsers(keyword?: string) {
    const params: QueryValue[] = [];
    let where = '';

    if (keyword) {
      const fuzzy = `%${keyword}%`;
      where = `
        WHERE (
          u.nickname LIKE ?
          OR u.school LIKE ?
          OR u.major LIKE ?
          OR u.openid LIKE ?
        )
      `;
      params.push(fuzzy, fuzzy, fuzzy, fuzzy);
    }

    const rows = await this.dataSource.query(
      `SELECT
          u.id,
          u.openid,
          u.nickname,
          u.signature,
          u.avatar_url,
          u.school,
          u.major,
          u.grade,
          u.account_status,
          u.account_ban_reason,
          u.account_banned_until,
          u.note_status,
          u.note_ban_reason,
          u.note_banned_until,
          u.share_status,
          u.share_ban_reason,
          u.share_banned_until,
          u.avatar_status,
          u.avatar_ban_reason,
          u.avatar_banned_until,
          u.signature_status,
          u.signature_ban_reason,
          u.signature_banned_until,
          u.created_at,
          u.updated_at,
          COUNT(DISTINCT c.id) AS course_count,
          COUNT(DISTINCT n.id) AS note_count,
          COUNT(DISTINCT CASE WHEN ss.is_active = 1 THEN ss.id END) AS share_count,
          COUNT(DISTINCT CASE WHEN us.status = 'active' THEN us.id END) AS active_subscription_count
       FROM users u
       LEFT JOIN courses c ON c.user_id = u.id
       LEFT JOIN notes n ON n.user_id = u.id
       LEFT JOIN schedule_share_keys ss ON ss.user_id = u.id
       LEFT JOIN user_subscriptions us ON us.user_id = u.id
       ${where}
       GROUP BY
           u.id, u.openid, u.nickname, u.signature, u.avatar_url, u.school, u.major, u.grade,
           u.account_status, u.account_ban_reason, u.account_banned_until,
           u.note_status, u.note_ban_reason, u.note_banned_until,
           u.share_status, u.share_ban_reason, u.share_banned_until,
           u.avatar_status, u.avatar_ban_reason, u.avatar_banned_until,
           u.signature_status, u.signature_ban_reason, u.signature_banned_until,
           u.created_at, u.updated_at
       ORDER BY u.created_at DESC`,
      params,
    );

    return rows.map((row: any) => this.attachPermissionSummary(row));
  }

  async getUserDetail(id: number) {
    const [users, courses, notes, shareKeys, subscriptions, violationStats, violationRecords] = await Promise.all([
      this.dataSource.query(
        `SELECT
            u.*,
            COUNT(DISTINCT c.id) AS course_count,
            COUNT(DISTINCT n.id) AS note_count,
            COUNT(DISTINCT ss.id) AS share_count,
            COUNT(DISTINCT us.id) AS subscription_count
         FROM users u
         LEFT JOIN courses c ON c.user_id = u.id
         LEFT JOIN notes n ON n.user_id = u.id
         LEFT JOIN schedule_share_keys ss ON ss.user_id = u.id
         LEFT JOIN user_subscriptions us ON us.user_id = u.id
         WHERE u.id = ?
         GROUP BY u.id`,
        [id],
      ),
      this.dataSource.query(
        `SELECT
            id, course_name, teacher, location, weekday,
            start_section, end_section, start_time, end_time,
            start_week, end_week, created_at
         FROM courses
         WHERE user_id = ?
         ORDER BY weekday ASC, start_section ASC, id ASC`,
        [id],
      ),
      this.dataSource.query(
        `SELECT
            id, content, image_url, status, moderation_reason, moderated_at, updated_at, created_at
         FROM notes
         WHERE user_id = ?
         ORDER BY updated_at DESC, id DESC`,
        [id],
      ),
      this.dataSource.query(
        `SELECT
            id, share_key, is_active, status, ban_reason, banned_at, last_imported_at, updated_at, created_at
         FROM schedule_share_keys
         WHERE user_id = ?
         ORDER BY updated_at DESC, id DESC`,
        [id],
      ),
      this.dataSource.query(
        `SELECT
            id, template_id, page_path, remind_minutes, remind_weekends,
            remaining_count, status, last_subscribed_at, updated_at
         FROM user_subscriptions
         WHERE user_id = ?
         ORDER BY updated_at DESC, id DESC`,
        [id],
      ),
      this.getViolationStats(id),
      this.getViolationRecords(id),
    ]);

    if (!users.length) {
      throw new NotFoundException('User not found');
    }

    return {
      user: this.attachPermissionSummary(users[0]),
      courses,
      notes,
      shareKeys,
      subscriptions,
      violationStats,
      violationRecords,
    };
  }

  async updateUserPermissions(id: number, payload: UserPermissionPayload & HighRiskConfirmationPayload, admin?: any) {
    const rows = await this.dataSource.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) {
      throw new NotFoundException('User not found');
    }

    await this.consumeHighRiskConfirmation({
      required: !(payload as any)?.__skipHighRiskConfirmation && this.requiresHighRiskForPermissions(payload),
      admin,
      actionKey: 'user.permissions.update',
      targetType: 'user',
      targetIds: [id],
      payload: this.normalizeHighRiskPayload(payload),
    });

    const sets: string[] = [];
    const params: QueryValue[] = [];

    this.buildPermissionUpdate('account', payload?.account, sets, params);
    this.buildPermissionUpdate('note', payload?.note, sets, params);
    this.buildPermissionUpdate('share', payload?.share, sets, params);
    this.buildPermissionUpdate('avatar', payload?.avatar, sets, params);
    this.buildPermissionUpdate('signature', payload?.signature, sets, params);

    if (!sets.length) {
      throw new BadRequestException('No permission changes provided');
    }

    params.push(id);
    await this.dataSource.query(
      `UPDATE users
          SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      params,
    );

    await this.adminAuditService.log({
      ...this.buildAdminSummary(admin),
      action: 'user.permissions.update',
      targetType: 'user',
      targetId: id,
      summary: `更新用户权限：#${id}`,
      detail: payload,
    });

    const detail = await this.getUserDetail(id);

    for (const key of USER_PERMISSION_KEYS) {
      const item = payload?.[key];
      if (!item?.mode) {
        continue;
      }

      await this.recordViolation({
        userId: id,
        violationType: key,
        sourceType: 'user_permission',
        sourceId: id,
        actionType: item.mode === 'banned' ? 'ban' : 'lift',
        reason:
          item.mode === 'banned'
            ? (item.reason || '').trim() || null
            : rows[0]?.[`${key}_ban_reason`] || (item.reason || '').trim() || null,
        durationDays: item.mode === 'banned' ? item.durationDays ?? null : null,
        expiresAt:
          item.mode === 'banned'
            ? detail?.user?.permissions?.[key]?.bannedUntil || null
            : null,
        recordStatus: item.mode === 'banned' ? 'active' : 'lifted',
        operator: admin,
        metadata: {
          currentStatus: detail?.user?.permissions?.[key]?.status || null,
        },
      });
    }

    return detail;
  }

  async batchUpdateUserPermissions(
    payload: {
      ids?: Array<number | string>;
      permissions?: UserPermissionPayload;
    } & HighRiskConfirmationPayload,
    admin?: any,
  ) {
    const ids = this.normalizeIdList(payload?.ids);
    if (!ids.length) {
      throw new BadRequestException('No users selected');
    }

    if (!payload?.permissions) {
      throw new BadRequestException('permissions is required');
    }

    await this.consumeHighRiskConfirmation({
      required: this.requiresHighRiskForPermissions(payload.permissions),
      admin,
      actionKey: 'user.permissions.batch',
      targetType: 'user',
      targetIds: ids,
      payload: this.normalizeHighRiskPayload(payload),
    });

    const items = [];
    for (const id of ids) {
      items.push(
        await this.updateUserPermissions(
          id,
          { ...(payload.permissions as any), __skipHighRiskConfirmation: true } as any,
          admin,
        ),
      );
    }

    await this.adminAuditService.log({
      ...this.buildAdminSummary(admin),
      action: 'user.permissions.batch',
      targetType: 'user',
      targetId: ids.join(','),
      summary: `Batch update user permissions (${ids.length})`,
      detail: { ids, permissions: payload.permissions },
    });

    return {
      success: true,
      total: items.length,
      items,
    };
  }

  async getCourses(keyword?: string, weekday?: number) {
    const params: QueryValue[] = [];
    const clauses: string[] = [];

    if (keyword) {
      const fuzzy = `%${keyword}%`;
      clauses.push('(c.course_name LIKE ? OR c.teacher LIKE ? OR c.location LIKE ? OR u.nickname LIKE ?)');
      params.push(fuzzy, fuzzy, fuzzy, fuzzy);
    }

    if (weekday) {
      clauses.push('c.weekday = ?');
      params.push(weekday);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    return this.dataSource.query(
      `SELECT
          c.id,
          c.user_id,
          c.course_name,
          c.teacher,
          c.location,
          c.weekday,
          c.start_section,
          c.end_section,
          c.start_time,
          c.end_time,
          c.start_week,
          c.end_week,
          c.color,
          c.created_at,
          u.nickname,
          u.school
       FROM courses c
       LEFT JOIN users u ON u.id = c.user_id
       ${where}
       ORDER BY c.weekday ASC, c.start_section ASC, c.id DESC`,
      params,
    );
  }

  async deleteCourse(id: number, admin?: any) {
    const rows = await this.dataSource.query(
      `SELECT id, user_id, course_name, teacher, location, weekday, start_section, end_section
         FROM courses
        WHERE id = ?
        LIMIT 1`,
      [id],
    );

    if (!rows.length) {
      throw new NotFoundException('Course not found');
    }

    await this.dataSource.query('DELETE FROM courses WHERE id = ?', [id]);

    await this.adminAuditService.log({
      ...this.buildAdminSummary(admin),
      action: 'course.delete',
      targetType: 'course',
      targetId: id,
      summary: `删除课程：#${id} ${rows[0]?.course_name || ''}`.trim(),
      detail: rows[0],
    });

    return { success: true };
  }

  async getTemplateCourses(templateKey?: string) {
    const params: QueryValue[] = [];
    const where = templateKey ? 'WHERE ct.template_key = ?' : '';
    if (templateKey) {
      params.push(templateKey);
    }

    return this.dataSource.query(
      `SELECT
          ct.id,
          ct.template_key,
          ct.template_name,
          ct.course_name,
          ct.teacher_name,
          ct.classroom,
          ct.weekday,
          ct.start_section,
          ct.end_section,
          ct.start_time,
          ct.end_time,
          ct.start_week,
          ct.end_week,
          ct.week_type,
          ct.sort_order,
          ct.is_active,
          ct.updated_at
       FROM course_templates ct
       ${where}
       ORDER BY ct.template_key ASC, ct.weekday ASC, ct.sort_order ASC, ct.start_section ASC`,
      params,
    );
  }

  async getShareKeys() {
    return this.dataSource.query(
      `SELECT
          s.id,
          s.user_id,
          s.share_key,
          s.is_active,
          s.status,
          s.ban_reason,
          s.banned_at,
          s.last_imported_at,
          s.created_at,
          s.updated_at,
          u.nickname,
          u.school,
          u.share_status AS owner_share_status,
          u.share_banned_until AS owner_share_banned_until,
          (
            SELECT COUNT(*)
              FROM courses c
             WHERE c.user_id = s.user_id
          ) AS course_count
       FROM schedule_share_keys s
       LEFT JOIN users u ON u.id = s.user_id
       ORDER BY s.updated_at DESC, s.id DESC`,
    );
  }

  async updateShareKeyStatus(
    id: number,
    payload: { status?: 'active' | 'blocked'; reason?: string } & HighRiskConfirmationPayload,
    admin?: any,
  ) {
    if (payload?.status !== 'active' && payload?.status !== 'blocked') {
      throw new BadRequestException('Invalid share key status');
    }

    await this.consumeHighRiskConfirmation({
      required: !(payload as any)?.__skipHighRiskConfirmation && this.requiresHighRiskForShareStatus(payload?.status),
      admin,
      actionKey: 'share_key.status.update',
      targetType: 'share_key',
      targetIds: [id],
      payload: this.normalizeHighRiskPayload(payload),
    });

    await this.dataSource.query(
      `UPDATE schedule_share_keys
          SET status = ?, is_active = ?, ban_reason = ?, banned_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [
        payload.status,
        payload.status === 'active' ? 1 : 0,
        payload.status === 'blocked' ? (payload.reason || '').trim() || null : null,
        payload.status === 'blocked'
          ? new Date().toISOString().slice(0, 19).replace('T', ' ')
          : null,
        id,
      ],
    );

    const rows = await this.dataSource.query(
      `SELECT
          s.id,
          s.user_id,
          s.share_key,
          s.is_active,
          s.status,
          s.ban_reason,
          s.banned_at,
          s.last_imported_at,
          s.created_at,
          s.updated_at,
          u.nickname,
          u.school
       FROM schedule_share_keys s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.id = ?
       LIMIT 1`,
      [id],
    );

    if (!rows.length) {
      throw new NotFoundException('Share key not found');
    }

    await this.adminAuditService.log({
      ...this.buildAdminSummary(admin),
      action: 'share_key.status.update',
      targetType: 'share_key',
      targetId: id,
      summary: `更新课表分享密钥状态：#${id} -> ${payload.status}`,
      detail: payload,
    });

    await this.recordViolation({
      userId: Number(rows[0]?.user_id || 0) || null,
      violationType: 'share',
      sourceType: 'schedule_share_key',
      sourceId: id,
      actionType: payload.status === 'blocked' ? 'block_share_key' : 'restore_share_key',
      reason: payload.status === 'blocked' ? (payload.reason || '').trim() || null : rows[0]?.ban_reason || null,
      recordStatus: payload.status === 'blocked' ? 'active' : 'lifted',
      operator: admin,
    });

    return rows[0];
  }

  async batchUpdateShareKeyStatus(
    payload: {
      ids?: Array<number | string>;
      status?: 'active' | 'blocked';
      reason?: string;
    } & HighRiskConfirmationPayload,
    admin?: any,
  ) {
    const ids = this.normalizeIdList(payload?.ids);
    if (!ids.length) {
      throw new BadRequestException('No share keys selected');
    }

    await this.consumeHighRiskConfirmation({
      required: this.requiresHighRiskForShareStatus(payload?.status),
      admin,
      actionKey: 'share_key.status.batch',
      targetType: 'share_key',
      targetIds: ids,
      payload: this.normalizeHighRiskPayload(payload),
    });

    const items = [];
    for (const id of ids) {
      items.push(await this.updateShareKeyStatus(id, { ...(payload as any), __skipHighRiskConfirmation: true }, admin));
    }

    await this.adminAuditService.log({
      ...this.buildAdminSummary(admin),
      action: 'share_key.status.batch',
      targetType: 'share_key',
      targetId: ids.join(','),
      summary: `Batch update share keys (${ids.length}) -> ${payload.status}`,
      detail: { ids, status: payload.status, reason: payload.reason || null },
    });

    return {
      success: true,
      total: items.length,
      items,
    };
  }

  async getSubscriptions() {
    return this.dataSource.query(
      `SELECT
          us.id,
          us.user_id,
          us.template_id,
          us.page_path,
          us.remind_minutes,
          us.remind_weekends,
          us.remaining_count,
          us.status,
          us.last_subscribed_at,
          us.created_at,
          us.updated_at,
          u.nickname,
          u.school,
          u.openid
       FROM user_subscriptions us
       LEFT JOIN users u ON u.id = us.user_id
       ORDER BY us.updated_at DESC, us.id DESC`,
    );
  }

  async getNotes(keyword?: string) {
    const params: QueryValue[] = [];
    let where = '';

    if (keyword) {
      const fuzzy = `%${keyword}%`;
      where = 'WHERE (n.content LIKE ? OR u.nickname LIKE ? OR u.school LIKE ?)';
      params.push(fuzzy, fuzzy, fuzzy);
    }

    return this.dataSource.query(
      `SELECT
          n.id,
          n.user_id,
          n.content,
          n.image_url,
          n.status,
          n.moderation_reason,
          n.moderated_at,
          n.created_at,
          n.updated_at,
          u.nickname,
          u.avatar_url,
          u.school
       FROM notes n
       LEFT JOIN users u ON u.id = n.user_id
       ${where}
       ORDER BY n.updated_at DESC, n.id DESC`,
      params,
    );
  }

  async moderateNote(
    id: number,
    payload: { status?: 'visible' | 'blocked'; reason?: string } & HighRiskConfirmationPayload,
    admin?: any,
  ) {
    if (payload?.status !== 'visible' && payload?.status !== 'blocked') {
      throw new BadRequestException('Invalid note moderation status');
    }

    await this.consumeHighRiskConfirmation({
      required: !(payload as any)?.__skipHighRiskConfirmation && this.requiresHighRiskForNoteModeration(payload?.status),
      admin,
      actionKey: 'note.moderate',
      targetType: 'note',
      targetIds: [id],
      payload: this.normalizeHighRiskPayload(payload),
    });

    await this.dataSource.query(
      `UPDATE notes
          SET status = ?, moderation_reason = ?, moderated_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [
        payload.status,
        payload.status === 'blocked' ? (payload.reason || '').trim() || null : null,
        payload.status === 'blocked'
          ? new Date().toISOString().slice(0, 19).replace('T', ' ')
          : null,
        id,
      ],
    );

    const rows = await this.dataSource.query(
      `SELECT
          n.id,
          n.user_id,
          n.content,
          n.image_url,
          n.status,
          n.moderation_reason,
          n.moderated_at,
          n.created_at,
          n.updated_at,
          u.nickname,
          u.school
       FROM notes n
       LEFT JOIN users u ON u.id = n.user_id
       WHERE n.id = ?
       LIMIT 1`,
      [id],
    );

    if (!rows.length) {
      throw new NotFoundException('Note not found');
    }

    await this.adminAuditService.log({
      ...this.buildAdminSummary(admin),
      action: 'note.moderate',
      targetType: 'note',
      targetId: id,
      summary: `审核笔记：#${id} -> ${payload.status}`,
      detail: payload,
    });

    await this.recordViolation({
      userId: Number(rows[0]?.user_id || 0) || null,
      violationType: 'note',
      sourceType: 'note',
      sourceId: id,
      actionType: payload.status === 'blocked' ? 'block_note' : 'restore_note',
      reason:
        payload.status === 'blocked'
          ? (payload.reason || '').trim() || null
          : rows[0]?.moderation_reason || null,
      recordStatus: payload.status === 'blocked' ? 'active' : 'lifted',
      operator: admin,
    });

    return rows[0];
  }

  async batchModerateNotes(
    payload: {
      ids?: Array<number | string>;
      status?: 'visible' | 'blocked';
      reason?: string;
    } & HighRiskConfirmationPayload,
    admin?: any,
  ) {
    const ids = this.normalizeIdList(payload?.ids);
    if (!ids.length) {
      throw new BadRequestException('No notes selected');
    }

    await this.consumeHighRiskConfirmation({
      required: this.requiresHighRiskForNoteModeration(payload?.status),
      admin,
      actionKey: 'note.moderate.batch',
      targetType: 'note',
      targetIds: ids,
      payload: this.normalizeHighRiskPayload(payload),
    });

    const items = [];
    for (const id of ids) {
      items.push(await this.moderateNote(id, { ...(payload as any), __skipHighRiskConfirmation: true }, admin));
    }

    await this.adminAuditService.log({
      ...this.buildAdminSummary(admin),
      action: 'note.moderate.batch',
      targetType: 'note',
      targetId: ids.join(','),
      summary: `Batch moderate notes (${ids.length}) -> ${payload.status}`,
      detail: { ids, status: payload.status, reason: payload.reason || null },
    });

    return {
      success: true,
      total: items.length,
      items,
    };
  }

  async getNoteShares(keyword?: string) {
    const params: QueryValue[] = [];
    let where = '';

    if (keyword) {
      const fuzzy = `%${keyword}%`;
      where = `
        WHERE (
          ns.share_code LIKE ?
          OR n.content LIKE ?
          OR u.nickname LIKE ?
          OR u.school LIKE ?
        )
      `;
      params.push(fuzzy, fuzzy, fuzzy, fuzzy);
    }

    return this.dataSource.query(
      `SELECT
          ns.id,
          ns.note_id,
          ns.user_id,
          ns.share_code,
          ns.status,
          ns.view_count,
          ns.last_viewed_at,
          ns.ban_reason,
          ns.banned_at,
          ns.created_at,
          ns.updated_at,
          n.content,
          n.image_url,
          n.status AS note_status,
          n.moderation_reason,
          u.nickname,
          u.school
       FROM note_shares ns
       LEFT JOIN notes n ON n.id = ns.note_id
       LEFT JOIN users u ON u.id = ns.user_id
       ${where}
       ORDER BY ns.updated_at DESC, ns.id DESC`,
      params,
    );
  }

  async updateNoteShareStatus(
    id: number,
    payload: { status?: 'active' | 'blocked'; reason?: string } & HighRiskConfirmationPayload,
    admin?: any,
  ) {
    if (payload?.status !== 'active' && payload?.status !== 'blocked') {
      throw new BadRequestException('Invalid note share status');
    }

    await this.consumeHighRiskConfirmation({
      required: !(payload as any)?.__skipHighRiskConfirmation && this.requiresHighRiskForShareStatus(payload?.status),
      admin,
      actionKey: 'note_share.status.update',
      targetType: 'note_share',
      targetIds: [id],
      payload: this.normalizeHighRiskPayload(payload),
    });

    await this.dataSource.query(
      `UPDATE note_shares
          SET status = ?, ban_reason = ?, banned_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [
        payload.status,
        payload.status === 'blocked' ? (payload.reason || '').trim() || null : null,
        payload.status === 'blocked'
          ? new Date().toISOString().slice(0, 19).replace('T', ' ')
          : null,
        id,
      ],
    );

    const rows = await this.dataSource.query(
      `SELECT
          ns.id,
          ns.note_id,
          ns.user_id,
          ns.share_code,
          ns.status,
          ns.view_count,
          ns.last_viewed_at,
          ns.ban_reason,
          ns.banned_at,
          ns.created_at,
          ns.updated_at,
          n.content,
          u.nickname,
          u.school
       FROM note_shares ns
       LEFT JOIN notes n ON n.id = ns.note_id
       LEFT JOIN users u ON u.id = ns.user_id
       WHERE ns.id = ?
       LIMIT 1`,
      [id],
    );

    if (!rows.length) {
      throw new NotFoundException('Note share not found');
    }

    await this.adminAuditService.log({
      ...this.buildAdminSummary(admin),
      action: 'note_share.status.update',
      targetType: 'note_share',
      targetId: id,
      summary: `更新笔记分享状态：#${id} -> ${payload.status}`,
      detail: payload,
    });

    await this.recordViolation({
      userId: Number(rows[0]?.user_id || 0) || null,
      violationType: 'share',
      sourceType: 'note_share',
      sourceId: id,
      actionType: payload.status === 'blocked' ? 'block_note_share' : 'restore_note_share',
      reason: payload.status === 'blocked' ? (payload.reason || '').trim() || null : rows[0]?.ban_reason || null,
      recordStatus: payload.status === 'blocked' ? 'active' : 'lifted',
      operator: admin,
    });

    return rows[0];
  }

  async batchUpdateNoteShareStatus(
    payload: {
      ids?: Array<number | string>;
      status?: 'active' | 'blocked';
      reason?: string;
    } & HighRiskConfirmationPayload,
    admin?: any,
  ) {
    const ids = this.normalizeIdList(payload?.ids);
    if (!ids.length) {
      throw new BadRequestException('No note shares selected');
    }

    await this.consumeHighRiskConfirmation({
      required: this.requiresHighRiskForShareStatus(payload?.status),
      admin,
      actionKey: 'note_share.status.batch',
      targetType: 'note_share',
      targetIds: ids,
      payload: this.normalizeHighRiskPayload(payload),
    });

    const items = [];
    for (const id of ids) {
      items.push(
        await this.updateNoteShareStatus(id, { ...(payload as any), __skipHighRiskConfirmation: true }, admin),
      );
    }

    await this.adminAuditService.log({
      ...this.buildAdminSummary(admin),
      action: 'note_share.status.batch',
      targetType: 'note_share',
      targetId: ids.join(','),
      summary: `Batch update note share status (${ids.length}) -> ${payload.status}`,
      detail: { ids, status: payload.status, reason: payload.reason || null },
    });

    return {
      success: true,
      total: items.length,
      items,
    };
  }

  async getReports(keyword?: string, status?: string) {
    const params: QueryValue[] = [];
    const clauses: string[] = [];

    if (keyword) {
      const fuzzy = `%${keyword}%`;
      clauses.push(
        `(
          r.reason LIKE ?
          OR r.description LIKE ?
          OR reporter.nickname LIKE ?
          OR reported.nickname LIKE ?
          OR n.content LIKE ?
          OR ns.share_code LIKE ?
        )`,
      );
      params.push(fuzzy, fuzzy, fuzzy, fuzzy, fuzzy, fuzzy);
    }

    if (status) {
      clauses.push('r.status = ?');
      params.push(status);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    return this.dataSource.query(
      `SELECT
          r.id,
          r.reporter_user_id,
          r.reported_user_id,
          r.target_type,
          r.target_id,
          r.reason,
          r.description,
          r.status,
          r.action_taken,
          r.review_note,
          r.reviewed_at,
          r.created_at,
          r.updated_at,
          reporter.nickname AS reporter_nickname,
          reporter.school AS reporter_school,
          reported.nickname AS reported_nickname,
          reported.school AS reported_school,
          n.id AS note_id,
          n.content AS note_content,
          n.image_url AS note_image_url,
          n.status AS note_status,
          ns.id AS note_share_id,
          ns.share_code,
          ns.status AS share_status,
          ns.view_count
       FROM content_reports r
       LEFT JOIN users reporter ON reporter.id = r.reporter_user_id
       LEFT JOIN users reported ON reported.id = r.reported_user_id
       LEFT JOIN note_shares ns ON r.target_type = 'note_share' AND ns.id = r.target_id
       LEFT JOIN notes n ON (
         (r.target_type = 'note' AND n.id = r.target_id)
         OR (r.target_type = 'note_share' AND n.id = ns.note_id)
       )
       ${where}
       ORDER BY
         CASE r.status WHEN 'pending' THEN 0 ELSE 1 END ASC,
         r.created_at DESC,
         r.id DESC`,
      params,
    );
  }

  async reviewReport(
    id: number,
    payload: {
      status?: 'resolved' | 'rejected';
      action?: 'none' | 'block_note' | 'block_share';
      reviewNote?: string;
    } & HighRiskConfirmationPayload,
    admin?: any,
  ) {
    if (payload?.status !== 'resolved' && payload?.status !== 'rejected') {
      throw new BadRequestException('Invalid report status');
    }

    const action = payload.action || 'none';
    if (!['none', 'block_note', 'block_share'].includes(action)) {
      throw new BadRequestException('Invalid report action');
    }

    await this.consumeHighRiskConfirmation({
      required: !(payload as any)?.__skipHighRiskConfirmation && this.requiresHighRiskForReport(payload),
      admin,
      actionKey: 'report.review',
      targetType: 'content_report',
      targetIds: [id],
      payload: this.normalizeHighRiskPayload(payload),
    });

    await this.dataSource.transaction(async (manager) => {
      const reports = await manager.query(
        `SELECT
            r.*,
            ns.note_id AS share_note_id
         FROM content_reports r
         LEFT JOIN note_shares ns ON r.target_type = 'note_share' AND ns.id = r.target_id
         WHERE r.id = ?
         LIMIT 1`,
        [id],
      );

      if (!reports.length) {
        throw new NotFoundException('Report not found');
      }

      const report = reports[0];
      const reviewNote = (payload.reviewNote || '').trim();

      if (payload.status === 'resolved' && action === 'block_share') {
        if (report.target_type !== 'note_share') {
          throw new BadRequestException('Only note share reports can block shares');
        }

        await manager.query(
          `UPDATE note_shares
              SET status = 'blocked',
                  ban_reason = ?,
                  banned_at = CURRENT_TIMESTAMP,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
          [reviewNote || report.reason, report.target_id],
        );
      }

      if (payload.status === 'resolved' && action === 'block_note') {
        const noteId = report.target_type === 'note_share' ? report.share_note_id : report.target_id;
        if (!noteId) {
          throw new BadRequestException('Report target note not found');
        }

        await manager.query(
          `UPDATE notes
              SET status = 'blocked',
                  moderation_reason = ?,
                  moderated_at = CURRENT_TIMESTAMP,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
          [reviewNote || report.reason, noteId],
        );
      }

      await manager.query(
        `UPDATE content_reports
            SET status = ?,
                action_taken = ?,
                review_note = ?,
                reviewed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [payload.status, payload.status === 'resolved' ? action : 'none', reviewNote, id],
      );
    });

    const rows = await this.getReports();
    const target = rows.find((item: any) => Number(item.id) === Number(id));
    if (!target) {
      throw new NotFoundException('Report not found');
    }

    await this.adminAuditService.log({
      ...this.buildAdminSummary(admin),
      action: 'report.review',
      targetType: 'content_report',
      targetId: id,
      summary: `处理举报：#${id} -> ${payload.status}/${payload.action || 'none'}`,
      detail: payload,
    });

    if (payload.status === 'resolved' && action !== 'none') {
      await this.recordViolation({
        userId: Number(target.reported_user_id || 0) || null,
        violationType: action === 'block_note' ? 'note' : 'share',
        sourceType: 'content_report',
        sourceId: id,
        actionType: action,
        reason: (payload.reviewNote || '').trim() || target.reason || null,
        recordStatus: 'active',
        relatedReportId: id,
        operator: admin,
        metadata: {
          targetType: target.target_type,
          targetId: target.target_id,
        },
      });
    }

    return target;
  }

  async batchReviewReports(
    payload: {
      ids?: Array<number | string>;
      status?: 'resolved' | 'rejected';
      action?: 'none' | 'block_note' | 'block_share';
      reviewNote?: string;
    } & HighRiskConfirmationPayload,
    admin?: any,
  ) {
    const ids = this.normalizeIdList(payload?.ids);
    if (!ids.length) {
      throw new BadRequestException('No reports selected');
    }

    await this.consumeHighRiskConfirmation({
      required: this.requiresHighRiskForReport(payload),
      admin,
      actionKey: 'report.review.batch',
      targetType: 'content_report',
      targetIds: ids,
      payload: this.normalizeHighRiskPayload(payload),
    });

    const items = [];
    for (const id of ids) {
      items.push(await this.reviewReport(id, { ...(payload as any), __skipHighRiskConfirmation: true }, admin));
    }

    await this.adminAuditService.log({
      ...this.buildAdminSummary(admin),
      action: 'report.review.batch',
      targetType: 'content_report',
      targetId: ids.join(','),
      summary: `Batch review reports (${ids.length}) -> ${payload.status}/${payload.action || 'none'}`,
      detail: { ids, status: payload.status, action: payload.action || 'none', reviewNote: payload.reviewNote || null },
    });

    return {
      success: true,
      total: items.length,
      items,
    };
  }

  async getAppeals(keyword?: string, status?: string, appealType?: string) {
    const exists = await this.tableExists('user_appeals').catch(() => false);
    if (!exists) {
      return [];
    }

    const params: QueryValue[] = [];
    const clauses: string[] = [];

    if (keyword) {
      const fuzzy = `%${keyword}%`;
      clauses.push(
        `(
          a.title LIKE ?
          OR a.content LIKE ?
          OR a.contact LIKE ?
          OR a.restriction_reason LIKE ?
          OR u.nickname LIKE ?
          OR u.school LIKE ?
        )`,
      );
      params.push(fuzzy, fuzzy, fuzzy, fuzzy, fuzzy, fuzzy);
    }

    if (status) {
      clauses.push('a.status = ?');
      params.push(status);
    }

    if (appealType) {
      clauses.push('a.appeal_type = ?');
      params.push(appealType);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    return this.dataSource.query(
      `SELECT
          a.id,
          a.user_id,
          a.appeal_type,
          a.title,
          a.content,
          a.contact,
          a.restriction_reason,
          a.restriction_expires_at,
          a.status,
          a.review_action,
          a.admin_note,
          a.reviewed_at,
          a.created_at,
          a.updated_at,
          u.nickname,
          u.school,
          u.major,
          u.grade
       FROM user_appeals a
       LEFT JOIN users u ON u.id = a.user_id
       ${where}
       ORDER BY
         CASE a.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END ASC,
         a.created_at DESC,
         a.id DESC`,
      params,
    );
  }

  async reviewAppeal(
    id: number,
    payload: { status?: 'approved' | 'rejected'; adminNote?: string },
    admin?: any,
  ) {
    if (!['approved', 'rejected'].includes(payload?.status || '')) {
      throw new BadRequestException('Invalid appeal status');
    }

    await this.ensureTableExists('user_appeals', 'user_appeals table is not ready yet');

    await this.dataSource.transaction(async (manager) => {
      const appeals = await manager.query(
        `SELECT *
           FROM user_appeals
          WHERE id = ?
          LIMIT 1`,
        [id],
      );

      if (!appeals.length) {
        throw new NotFoundException('Appeal not found');
      }

      const appeal = appeals[0];
      if (appeal.status !== 'pending') {
        throw new BadRequestException('Only pending appeals can be reviewed');
      }

      let reviewAction: 'none' | 'lift_restriction' = 'none';
      if (payload.status === 'approved') {
        const prefixMap: Record<string, PermissionKey> = {
          account: 'account',
          note: 'note',
          share: 'share',
          avatar: 'avatar',
          signature: 'signature',
        };
        const prefix = prefixMap[String(appeal.appeal_type || '')];

        if (!prefix) {
          throw new BadRequestException('Invalid appeal type');
        }

        await manager.query(
          `UPDATE users
              SET ${prefix}_status = 'active',
                  ${prefix}_ban_reason = NULL,
                  ${prefix}_banned_until = NULL,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
          [appeal.user_id],
        );
        reviewAction = 'lift_restriction';
      }

      await manager.query(
        `UPDATE user_appeals
            SET status = ?,
                review_action = ?,
                admin_note = ?,
                reviewed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [
          payload.status,
          reviewAction,
          (payload.adminNote || '').trim() || null,
          id,
        ],
      );
    });

    const rows = await this.dataSource.query(
      `SELECT
          a.id,
          a.user_id,
          a.appeal_type,
          a.title,
          a.content,
          a.contact,
          a.restriction_reason,
          a.restriction_expires_at,
          a.status,
          a.review_action,
          a.admin_note,
          a.reviewed_at,
          a.created_at,
          a.updated_at,
          u.nickname,
          u.school,
          u.major,
          u.grade
       FROM user_appeals a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.id = ?
       LIMIT 1`,
      [id],
    );

    if (!rows.length) {
      throw new NotFoundException('Appeal not found');
    }

    await this.adminAuditService.log({
      ...this.buildAdminSummary(admin),
      action: 'appeal.review',
      targetType: 'user_appeal',
      targetId: id,
      summary: `review user appeal #${id} -> ${payload.status}`,
      detail: payload,
    });

    if (payload.status === 'approved') {
      await this.recordViolation({
        userId: Number(rows[0]?.user_id || 0) || null,
        violationType: (rows[0]?.appeal_type || 'account') as PermissionKey,
        sourceType: 'user_appeal',
        sourceId: id,
        actionType: 'appeal_relief',
        reason: rows[0]?.admin_note || rows[0]?.restriction_reason || null,
        recordStatus: 'lifted',
        relatedAppealId: id,
        operator: admin,
      });
    }

    return rows[0];
  }

  async getFeedback(keyword?: string, status?: string, category?: string) {
    const params: QueryValue[] = [];
    const clauses: string[] = [];

    if (keyword) {
      const fuzzy = `%${keyword}%`;
      clauses.push(
        `(
          f.title LIKE ?
          OR f.content LIKE ?
          OR f.contact LIKE ?
          OR u.nickname LIKE ?
          OR u.school LIKE ?
        )`,
      );
      params.push(fuzzy, fuzzy, fuzzy, fuzzy, fuzzy);
    }

    if (status) {
      clauses.push('f.status = ?');
      params.push(status);
    }

    if (category) {
      clauses.push('f.category = ?');
      params.push(category);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    return this.dataSource.query(
      `SELECT
          f.id,
          f.user_id,
          f.category,
          f.title,
          f.content,
          f.contact,
          f.status,
          f.admin_note,
          f.reviewed_at,
          f.created_at,
          f.updated_at,
          u.nickname,
          u.school,
          u.major,
          u.grade
       FROM user_feedback f
       LEFT JOIN users u ON u.id = f.user_id
       ${where}
       ORDER BY
         CASE f.status WHEN 'pending' THEN 0 WHEN 'reviewed' THEN 1 ELSE 2 END ASC,
         f.created_at DESC,
         f.id DESC`,
      params,
    );
  }

  async reviewFeedback(
    id: number,
    payload: { status?: 'pending' | 'reviewed' | 'archived'; adminNote?: string },
    admin?: any,
  ) {
    if (!['pending', 'reviewed', 'archived'].includes(payload?.status || '')) {
      throw new BadRequestException('Invalid feedback status');
    }

    await this.dataSource.query(
      `UPDATE user_feedback
          SET status = ?,
              admin_note = ?,
              reviewed_at = CASE WHEN ? = 'pending' THEN NULL ELSE CURRENT_TIMESTAMP END,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [
        payload.status,
        (payload.adminNote || '').trim() || null,
        payload.status,
        id,
      ],
    );

    const rows = await this.dataSource.query(
      `SELECT
          f.id,
          f.user_id,
          f.category,
          f.title,
          f.content,
          f.contact,
          f.status,
          f.admin_note,
          f.reviewed_at,
          f.created_at,
          f.updated_at,
          u.nickname,
          u.school,
          u.major,
          u.grade
       FROM user_feedback f
       LEFT JOIN users u ON u.id = f.user_id
       WHERE f.id = ?
       LIMIT 1`,
      [id],
    );

    if (!rows.length) {
      throw new NotFoundException('Feedback not found');
    }

    await this.adminAuditService.log({
      ...this.buildAdminSummary(admin),
      action: 'feedback.review',
      targetType: 'user_feedback',
      targetId: id,
      summary: `处理用户反馈：#${id} -> ${payload.status}`,
      detail: payload,
    });

    return rows[0];
  }

  async getReminderLogs(keyword?: string, status?: string) {
    const exists = await this.tableExists('reminder_send_logs').catch(() => false);
    if (!exists) {
      return [];
    }

    const hasRetryCount = await this.columnExists('reminder_send_logs', 'retry_count').catch(() => false);

    const params: QueryValue[] = [];
    const clauses: string[] = [];

    if (keyword) {
      const fuzzy = `%${keyword}%`;
      clauses.push(
        `(
          l.course_name LIKE ?
          OR l.location LIKE ?
          OR l.error_message LIKE ?
          OR u.nickname LIKE ?
          OR u.openid LIKE ?
        )`,
      );
      params.push(fuzzy, fuzzy, fuzzy, fuzzy, fuzzy);
    }

    if (status) {
      clauses.push('l.status = ?');
      params.push(status);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    return this.dataSource.query(
      `SELECT
          l.id,
          l.reminder_id,
          l.user_id,
          l.course_id,
          l.status,
          l.template_id,
          l.page_path,
          l.course_name,
          l.start_time,
          l.location,
          l.remark,
          l.error_message,
          l.response_json,
          l.sent_at,
          l.created_at,
          ${hasRetryCount ? 'l.retry_count,' : '0 AS retry_count,'}
          ${hasRetryCount ? 'l.retried_from_log_id,' : 'NULL AS retried_from_log_id,'}
          ${hasRetryCount ? 'l.last_retry_at,' : 'NULL AS last_retry_at,'}
          u.nickname,
          u.openid,
          u.school
       FROM reminder_send_logs l
       LEFT JOIN users u ON u.id = l.user_id
       ${where}
       ORDER BY l.created_at DESC, l.id DESC`,
      params,
    );
  }

  async retryReminderLogs(payload: { ids?: Array<number | string> }, admin?: any) {
    const ids = this.normalizeIdList(payload?.ids);
    if (!ids.length) {
      throw new BadRequestException('No reminder logs selected');
    }

    await this.ensureTableExists('reminder_send_logs', 'reminder_send_logs table is not ready yet');

    const hasRetryCount = await this.columnExists('reminder_send_logs', 'retry_count').catch(() => false);
    const logs = await this.dataSource.query(
      `SELECT
          l.*,
          u.openid,
          u.nickname
       FROM reminder_send_logs l
       LEFT JOIN users u ON u.id = l.user_id
       WHERE l.id IN (${ids.map(() => '?').join(',')})
         AND l.status = 'failed'
       ORDER BY l.id ASC`,
      ids,
    );

    if (!logs.length) {
      throw new BadRequestException('No failed reminder logs found');
    }

    const items = [];

    for (const log of logs) {
      if (!log.openid) {
        items.push({
          id: Number(log.id),
          status: 'failed',
          message: 'Missing user openid',
        });
        continue;
      }

      const nextRetryCount = Number(log.retry_count || 0) + 1;
      const retryAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

      try {
        const response = await this.messageSender.sendReminder(log.openid, {
          courseName: log.course_name || 'Course reminder',
          startTime: log.start_time || '08:30',
          location: log.location || 'TBD',
          remark: log.remark || 'Manual retry from admin console',
          page: log.page_path || 'pages/index/index',
        });

        if (hasRetryCount) {
          await this.dataSource.query(
            `UPDATE reminder_send_logs
                SET retry_count = ?, last_retry_at = ?
              WHERE id = ?`,
            [nextRetryCount, retryAt, log.id],
          );
        }

        await this.dataSource.query(
          `INSERT INTO reminder_send_logs
            (reminder_id, user_id, course_id, status, template_id, page_path, course_name, start_time, location, remark, error_message, response_json, sent_at, created_at${
              hasRetryCount ? ', retry_count, retried_from_log_id, last_retry_at' : ''
            }, _openid)
           VALUES (?, ?, ?, 'sent', ?, ?, ?, ?, ?, ?, NULL, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP${
             hasRetryCount ? ', ?, ?, ?' : ''
           }, '')`,
          [
            log.reminder_id,
            log.user_id,
            log.course_id,
            log.template_id || null,
            log.page_path || null,
            log.course_name || null,
            log.start_time || null,
            log.location || null,
            log.remark || null,
            response ? JSON.stringify(response) : null,
            ...(hasRetryCount ? [nextRetryCount, log.id, retryAt] : []),
          ],
        );

        items.push({
          id: Number(log.id),
          status: 'sent',
          message: 'Reminder retried successfully',
        });
      } catch (error: any) {
        if (hasRetryCount) {
          await this.dataSource.query(
            `UPDATE reminder_send_logs
                SET retry_count = ?, last_retry_at = ?
              WHERE id = ?`,
            [nextRetryCount, retryAt, log.id],
          );
        }

        await this.dataSource.query(
          `INSERT INTO reminder_send_logs
            (reminder_id, user_id, course_id, status, template_id, page_path, course_name, start_time, location, remark, error_message, response_json, sent_at, created_at${
              hasRetryCount ? ', retry_count, retried_from_log_id, last_retry_at' : ''
            }, _openid)
           VALUES (?, ?, ?, 'failed', ?, ?, ?, ?, ?, ?, ?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP${
             hasRetryCount ? ', ?, ?, ?' : ''
           }, '')`,
          [
            log.reminder_id,
            log.user_id,
            log.course_id,
            log.template_id || null,
            log.page_path || null,
            log.course_name || null,
            log.start_time || null,
            log.location || null,
            log.remark || null,
            error?.message || 'Manual retry failed',
            ...(hasRetryCount ? [nextRetryCount, log.id, retryAt] : []),
          ],
        );

        items.push({
          id: Number(log.id),
          status: 'failed',
          message: error?.message || 'Manual retry failed',
        });
      }
    }

    await this.adminAuditService.log({
      ...this.buildAdminSummary(admin),
      action: 'reminder_log.retry',
      targetType: 'reminder_send_log',
      targetId: ids.join(','),
      summary: `Retry reminder logs (${ids.length})`,
      detail: { ids, items },
    });

    return {
      success: true,
      total: items.length,
      items,
      summary: await this.getReminderLogSummary(),
    };
  }

  async getAuditLogs(keyword?: string, action?: string) {
    const exists = await this.tableExists('admin_audit_logs').catch(() => false);
    if (!exists) {
      return [];
    }

    const params: QueryValue[] = [];
    const clauses: string[] = [];

    if (keyword) {
      const fuzzy = `%${keyword}%`;
      clauses.push(
        `(
          l.admin_email LIKE ?
          OR l.admin_name LIKE ?
          OR l.summary LIKE ?
          OR l.target_type LIKE ?
          OR l.target_id LIKE ?
        )`,
      );
      params.push(fuzzy, fuzzy, fuzzy, fuzzy, fuzzy);
    }

    if (action) {
      clauses.push('l.action = ?');
      params.push(action);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    return this.dataSource.query(
      `SELECT
          l.id,
          l.admin_email,
          l.admin_name,
          l.admin_role,
          l.action,
          l.target_type,
          l.target_id,
          l.summary,
          l.detail_json,
          l.ip_address,
          l.created_at
       FROM admin_audit_logs l
       ${where}
       ORDER BY l.created_at DESC, l.id DESC`,
      params,
    );
  }

  async getAdminAccounts() {
    const exists = await this.tableExists('admin_accounts').catch(() => false);
    if (!exists) {
      return [];
    }

    const rows = await this.dataSource.query(
      `SELECT
          id,
          email,
          name,
          role,
          status,
          permission_json,
          created_at,
          updated_at
       FROM admin_accounts
       ORDER BY
         CASE role WHEN 'super_admin' THEN 0 ELSE 1 END ASC,
         created_at ASC,
         id ASC`,
    ).catch(() => []);

    return rows.map((row: any) => this.mapAdminAccountRow(row));
  }

  async createAdminAccount(
    admin: any,
    payload: {
      email?: string;
      password?: string;
      name?: string;
      role?: AdminRole;
      status?: 'active' | 'disabled';
      permissions?: AdminPermission[];
    },
  ) {
    await this.ensureTableExists('admin_accounts', 'admin_accounts table is not ready yet');

    const email = String(payload?.email || '').trim().toLowerCase();
    const password = String(payload?.password || '');
    const name = String(payload?.name || '').trim();
    const role = (payload?.role || 'operator') as AdminRole;
    const status = payload?.status || 'active';

    if (!email || !password || !name) {
      throw new BadRequestException('请填写管理员邮箱、姓名和密码');
    }

    if (!['super_admin', 'operator', 'moderator', 'support'].includes(role)) {
      throw new BadRequestException('无效的管理员角色');
    }

    if (!['active', 'disabled'].includes(status)) {
      throw new BadRequestException('无效的管理员状态');
    }

    const permissions = this.normalizeAdminPermissions(payload?.permissions, role);

    const exists = await this.dataSource.query('SELECT id FROM admin_accounts WHERE email = ? LIMIT 1', [email]);
    if (exists.length) {
      throw new BadRequestException('该管理员邮箱已存在');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await this.dataSource.query(
      `INSERT INTO admin_accounts (email, password_hash, name, role, status, permission_json, _openid)
       VALUES (?, ?, ?, ?, ?, ?, '')`,
      [email, passwordHash, name, role, status, this.stringifyAdminPermissions(role, permissions)],
    );

    await this.adminAuditService.log({
      ...this.buildAdminSummary(admin),
      action: 'admin_account.create',
      targetType: 'admin_account',
      targetId: result?.insertId,
      summary: `创建管理员账号：${email} (${this.getRoleLabel(role)})`,
      detail: { email, name, role, status, permissions },
    });

    const rows = await this.dataSource.query(
      `SELECT id, email, name, role, status, permission_json, created_at, updated_at
         FROM admin_accounts
        WHERE id = ?
        LIMIT 1`,
      [result?.insertId],
    );
    return this.mapAdminAccountRow(rows[0]);
  }

  async updateAdminAccount(
    admin: any,
    id: number,
    payload: {
      name?: string;
      role?: AdminRole;
      status?: 'active' | 'disabled';
      password?: string;
      permissions?: AdminPermission[];
    } & HighRiskConfirmationPayload,
  ) {
    await this.ensureTableExists('admin_accounts', 'admin_accounts table is not ready yet');

    const rows = await this.dataSource.query('SELECT * FROM admin_accounts WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) {
      throw new NotFoundException('Admin account not found');
    }

    const current = rows[0];
    const currentRole = (current.role || 'support') as AdminRole;
    const sets: string[] = [];
    const params: QueryValue[] = [];

    if (this.isPrimarySuperAdminAccount(current)) {
      throw new BadRequestException('系统默认超级管理员不可在后台修改，请只新增其他管理员账号');
    }

    if (
      Number(admin?.adminId) === Number(id) &&
      (payload?.role !== undefined || payload?.status === 'disabled')
    ) {
      throw new BadRequestException('不能修改自己账号的角色或停用自己');
    }

    await this.consumeHighRiskConfirmation({
      required: !(payload as any)?.__skipHighRiskConfirmation && this.requiresHighRiskForAdminAccountUpdate(payload),
      admin,
      actionKey: 'admin_account.update',
      targetType: 'admin_account',
      targetIds: [id],
      payload: this.normalizeHighRiskPayload(payload),
    });

    if (payload?.name !== undefined) {
      sets.push('name = ?');
      params.push(String(payload.name || '').trim() || current.name);
    }

    const nextRole = (payload?.role || currentRole) as AdminRole;

    if (payload?.role !== undefined) {
      if (!['super_admin', 'operator', 'moderator', 'support'].includes(payload.role)) {
        throw new BadRequestException('无效的管理员角色');
      }
      sets.push('role = ?');
      params.push(payload.role);
    }

    if (payload?.status !== undefined) {
      if (!['active', 'disabled'].includes(payload.status)) {
        throw new BadRequestException('无效的管理员状态');
      }
      sets.push('status = ?');
      params.push(payload.status);
    }

    if (payload?.password) {
      sets.push('password_hash = ?');
      params.push(await bcrypt.hash(String(payload.password), 10));
    }

    const nextPermissions =
      payload?.permissions !== undefined
        ? this.normalizeAdminPermissions(payload.permissions, nextRole)
        : payload?.role !== undefined
          ? this.getRoleDefaultPermissions(nextRole)
          : this.normalizeAdminPermissions(current.permission_json, currentRole);

    if (payload?.permissions !== undefined || payload?.role !== undefined) {
      sets.push('permission_json = ?');
      params.push(this.stringifyAdminPermissions(nextRole, nextPermissions));
    }

    if (!sets.length) {
      throw new BadRequestException('没有可更新的管理员字段');
    }

    params.push(id);
    await this.dataSource.query(
      `UPDATE admin_accounts
          SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      params,
    );

    await this.adminAuditService.log({
      ...this.buildAdminSummary(admin),
      action: 'admin_account.update',
      targetType: 'admin_account',
      targetId: id,
      summary: `更新管理员账号：${current.email}`,
      detail: {
        name: payload?.name,
        role: payload?.role,
        status: payload?.status,
        permissions: nextPermissions,
        passwordChanged: !!payload?.password,
      },
    });

    const nextRows = await this.dataSource.query(
      `SELECT id, email, name, role, status, permission_json, created_at, updated_at
         FROM admin_accounts
        WHERE id = ?
        LIMIT 1`,
      [id],
    );

    return this.mapAdminAccountRow(nextRows[0]);
  }
}
