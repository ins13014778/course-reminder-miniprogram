import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { AdminAuditService } from './admin-audit.service';
import { ADMIN_PERMISSION_OPTIONS, AdminPermission } from './admin-permissions.decorator';

type QueryValue = string | number | boolean | null;
type PermissionMode = 'active' | 'banned';
type PermissionKey = 'account' | 'note' | 'share';
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
};

const ALL_ADMIN_PERMISSIONS = ADMIN_PERMISSION_OPTIONS.map((item) => item.key);

@Injectable()
export class AdminService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly adminAuditService: AdminAuditService,
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
    return {
      ...row,
      permissions: {
        account: this.normalizePermission('account', row),
        note: this.normalizePermission('note', row),
        share: this.normalizePermission('share', row),
      },
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
      pendingFeedback,
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
        feedbackTableExists
          ? this.dataSource.query("SELECT COUNT(*) AS total FROM user_feedback WHERE status = 'pending'")
          : Promise.resolve([{ total: 0 }]),
      ]);

    const [recentUsers, recentNotes, recentCourses] = await Promise.all([
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
        pendingFeedback: Number(pendingFeedback[0]?.total || 0),
      },
      recentUsers,
      recentNotes,
      recentCourses,
      featureHealth: {
        remindersTable: await this.tableExists('reminders'),
        importTasksTable: await this.tableExists('import_tasks'),
        notesTable: await this.tableExists('notes'),
        announcementTable: await this.tableExists('announcements'),
        feedbackTable: feedbackTableExists,
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
          u.created_at, u.updated_at
       ORDER BY u.created_at DESC`,
      params,
    );

    return rows.map((row: any) => this.attachPermissionSummary(row));
  }

  async getUserDetail(id: number) {
    const [users, courses, notes, shareKeys, subscriptions] = await Promise.all([
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
    };
  }

  async updateUserPermissions(id: number, payload: UserPermissionPayload, admin?: any) {
    const rows = await this.dataSource.query('SELECT id FROM users WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) {
      throw new NotFoundException('User not found');
    }

    const sets: string[] = [];
    const params: QueryValue[] = [];

    this.buildPermissionUpdate('account', payload?.account, sets, params);
    this.buildPermissionUpdate('note', payload?.note, sets, params);
    this.buildPermissionUpdate('share', payload?.share, sets, params);

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

    return this.getUserDetail(id);
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

  async updateShareKeyStatus(id: number, payload: { status?: 'active' | 'blocked'; reason?: string }, admin?: any) {
    if (payload?.status !== 'active' && payload?.status !== 'blocked') {
      throw new BadRequestException('Invalid share key status');
    }

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

    return rows[0];
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

  async moderateNote(id: number, payload: { status?: 'visible' | 'blocked'; reason?: string }, admin?: any) {
    if (payload?.status !== 'visible' && payload?.status !== 'blocked') {
      throw new BadRequestException('Invalid note moderation status');
    }

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

    return rows[0];
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

  async updateNoteShareStatus(id: number, payload: { status?: 'active' | 'blocked'; reason?: string }, admin?: any) {
    if (payload?.status !== 'active' && payload?.status !== 'blocked') {
      throw new BadRequestException('Invalid note share status');
    }

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

    return rows[0];
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
    payload: { status?: 'resolved' | 'rejected'; action?: 'none' | 'block_note' | 'block_share'; reviewNote?: string },
    admin?: any,
  ) {
    if (payload?.status !== 'resolved' && payload?.status !== 'rejected') {
      throw new BadRequestException('Invalid report status');
    }

    const action = payload.action || 'none';
    if (!['none', 'block_note', 'block_share'].includes(action)) {
      throw new BadRequestException('Invalid report action');
    }

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

    return target;
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
    },
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
