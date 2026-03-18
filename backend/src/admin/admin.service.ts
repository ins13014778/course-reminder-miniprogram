import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

type QueryValue = string | number | boolean | null;
type PermissionMode = 'active' | 'banned';
type PermissionKey = 'account' | 'note' | 'share';

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

@Injectable()
export class AdminService {
  constructor(private readonly dataSource: DataSource) {}

  private async tableExists(tableName: string) {
    const rows = await this.dataSource.query('SHOW TABLES LIKE ?', [tableName]);
    return rows.length > 0;
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

  async getOverview() {
    const [users, courses, notes, subscriptions, shares, templates, announcements, bannedUsers, noteBans, shareBans, blockedNotes, blockedKeys] =
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
      },
      recentUsers,
      recentNotes,
      recentCourses,
      featureHealth: {
        remindersTable: await this.tableExists('reminders'),
        importTasksTable: await this.tableExists('import_tasks'),
        notesTable: await this.tableExists('notes'),
        announcementTable: await this.tableExists('announcements'),
      },
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

  async updateUserPermissions(id: number, payload: UserPermissionPayload) {
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

  async deleteCourse(id: number) {
    await this.dataSource.query('DELETE FROM courses WHERE id = ?', [id]);
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

  async updateShareKeyStatus(id: number, payload: { status?: 'active' | 'blocked'; reason?: string }) {
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

  async moderateNote(id: number, payload: { status?: 'visible' | 'blocked'; reason?: string }) {
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

    return rows[0];
  }
}
