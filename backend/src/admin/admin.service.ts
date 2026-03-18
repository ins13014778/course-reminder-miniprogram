import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

type QueryValue = string | number | boolean | null;

@Injectable()
export class AdminService {
  constructor(private readonly dataSource: DataSource) {}

  private async tableExists(tableName: string) {
    const rows = await this.dataSource.query('SHOW TABLES LIKE ?', [tableName]);
    return rows.length > 0;
  }

  async getOverview() {
    const [users, courses, notes, subscriptions, shares, templates, announcements] =
      await Promise.all([
        this.dataSource.query('SELECT COUNT(*) AS total FROM users'),
        this.dataSource.query('SELECT COUNT(*) AS total FROM courses'),
        this.dataSource.query('SELECT COUNT(*) AS total FROM notes'),
        this.dataSource.query("SELECT COUNT(*) AS total FROM user_subscriptions WHERE status = 'active'"),
        this.dataSource.query('SELECT COUNT(*) AS total FROM schedule_share_keys WHERE is_active = 1'),
        this.dataSource.query('SELECT COUNT(*) AS total FROM course_templates WHERE is_active = 1'),
        this.dataSource.query("SELECT COUNT(*) AS total FROM announcements WHERE status = 'published'"),
      ]);

    const [recentUsers, recentNotes, recentCourses] = await Promise.all([
      this.dataSource.query(
        `SELECT id, nickname, school, major, grade, created_at
           FROM users
          ORDER BY created_at DESC
          LIMIT 6`,
      ),
      this.dataSource.query(
        `SELECT n.id, n.content, n.updated_at, u.nickname
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

    const featureHealth = {
      remindersTable: await this.tableExists('reminders'),
      importTasksTable: await this.tableExists('import_tasks'),
      notesTable: await this.tableExists('notes'),
      announcementTable: await this.tableExists('announcements'),
    };

    return {
      metrics: {
        users: Number(users[0]?.total || 0),
        courses: Number(courses[0]?.total || 0),
        notes: Number(notes[0]?.total || 0),
        activeSubscriptions: Number(subscriptions[0]?.total || 0),
        activeShares: Number(shares[0]?.total || 0),
        templateCourses: Number(templates[0]?.total || 0),
        publishedAnnouncements: Number(announcements[0]?.total || 0),
      },
      recentUsers,
      recentNotes,
      recentCourses,
      featureHealth,
    };
  }

  async getUsers(keyword?: string) {
    const params: QueryValue[] = [];
    let where = '';

    if (keyword) {
      where = `
        WHERE (
          u.nickname LIKE ?
          OR u.school LIKE ?
          OR u.major LIKE ?
          OR u.openid LIKE ?
        )
      `;
      const fuzzy = `%${keyword}%`;
      params.push(fuzzy, fuzzy, fuzzy, fuzzy);
    }

    return this.dataSource.query(
      `SELECT
          u.id,
          u.openid,
          u.nickname,
          u.signature,
          u.avatar_url,
          u.school,
          u.major,
          u.grade,
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
          u.id, u.openid, u.nickname, u.signature, u.avatar_url,
          u.school, u.major, u.grade, u.created_at, u.updated_at
       ORDER BY u.created_at DESC`,
      params,
    );
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
    if (templateKey) params.push(templateKey);

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
          s.last_imported_at,
          s.created_at,
          s.updated_at,
          u.nickname,
          u.school,
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

  async getSubscriptions() {
    return this.dataSource.query(
      `SELECT
          us.id,
          us.user_id,
          us.template_id,
          us.page_path,
          us.remind_minutes,
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
      where = 'WHERE (n.content LIKE ? OR u.nickname LIKE ? OR u.school LIKE ?)';
      const fuzzy = `%${keyword}%`;
      params.push(fuzzy, fuzzy, fuzzy);
    }

    return this.dataSource.query(
      `SELECT
          n.id,
          n.user_id,
          n.content,
          n.image_url,
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
}
