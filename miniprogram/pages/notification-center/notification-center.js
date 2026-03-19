const { fetchContentPage } = require('../../utils/content-page');
const { hasLoginSession } = require('../../utils/auth');
const { callDbQuery, resolveCurrentUserId } = require('../../utils/cloud-db');

Page({
  data: {
    loading: true,
    title: '',
    subtitle: '',
    content: '',
    tips: [],
    primaryActionText: '',
    primaryActionPage: '',
    isLoggedIn: false,
    unreadCount: 0,
    messageItems: [],
  },

  onLoad() {
    this.loadContent();
  },

  async loadContent() {
    this.setData({ loading: true });

    try {
      const page = await fetchContentPage('notification_management');
      const extra = page.extra || {};
      const isLoggedIn = hasLoginSession();

      this.setData({
        title: page.title,
        subtitle: page.subtitle,
        content: page.content,
        tips: Array.isArray(extra.tips) ? extra.tips : [],
        primaryActionText: extra.primaryActionText || '打开提醒设置',
        primaryActionPage: extra.primaryActionPage || '/pages/settings/settings',
        isLoggedIn,
      });

      await this.loadMessageCenter();
      this.setData({ loading: false });
    } catch (error) {
      console.error('[notification-center] load failed', error);
      this.setData({ loading: false });
      wx.showToast({ title: '页面加载失败', icon: 'none' });
    }
  },

  formatTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (number) => String(number).padStart(2, '0');
    return `${date.getMonth() + 1}-${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  },

  normalizeMessages(items = []) {
    return items.map((item) => ({
      ...item,
      message_key: `${item.message_type}-${item.message_id}`,
      badgeText:
        item.message_type === 'announcement'
          ? '公告'
          : item.message_type === 'feedback'
            ? '反馈'
            : '申诉',
      statusText:
        item.status_text ||
        (item.message_type === 'announcement' ? '最新公告' : '系统回执'),
      detailText: item.detail_text || '暂无更多说明',
      timeText: this.formatTime(item.message_time),
      isRead: Number(item.is_read || 0) === 1,
    }));
  },

  async loadMessageCenter() {
    try {
      if (!this.data.isLoggedIn) {
        const rows = await callDbQuery(
          `SELECT
              'announcement' AS message_type,
              id AS message_id,
              title,
              content AS detail_text,
              COALESCE(published_at, updated_at) AS message_time,
              '最新公告' AS status_text,
              1 AS is_read
           FROM announcements
           WHERE status = 'published'
           ORDER BY COALESCE(published_at, updated_at) DESC, id DESC
           LIMIT 10`,
        );

        this.setData({
          unreadCount: 0,
          messageItems: this.normalizeMessages(rows || []),
        });
        return;
      }

      const userId = await resolveCurrentUserId();
      const rows = await callDbQuery(
        `SELECT *
           FROM (
             SELECT
               'announcement' AS message_type,
               a.id AS message_id,
               a.title,
               a.content AS detail_text,
               COALESCE(a.published_at, a.updated_at) AS message_time,
               '最新公告' AS status_text,
               CASE WHEN mr.id IS NULL THEN 0 ELSE 1 END AS is_read
             FROM announcements a
             LEFT JOIN user_message_reads mr
               ON mr.user_id = ?
              AND mr.message_type = 'announcement'
              AND mr.message_id = a.id
             WHERE a.status = 'published'

             UNION ALL

             SELECT
               'feedback' AS message_type,
               f.id AS message_id,
               f.title,
               COALESCE(f.admin_note, '后台已经处理了你的反馈，请返回反馈页查看详情。') AS detail_text,
               COALESCE(f.reviewed_at, f.updated_at) AS message_time,
               CASE WHEN f.status = 'reviewed' THEN '反馈已处理' ELSE '反馈已归档' END AS status_text,
               CASE WHEN mr.id IS NULL THEN 0 ELSE 1 END AS is_read
             FROM user_feedback f
             LEFT JOIN user_message_reads mr
               ON mr.user_id = ?
              AND mr.message_type = 'feedback'
              AND mr.message_id = f.id
             WHERE f.user_id = ?
               AND f.status IN ('reviewed', 'archived')

             UNION ALL

             SELECT
               'appeal' AS message_type,
               a.id AS message_id,
               a.title,
               COALESCE(
                 a.admin_note,
                 CASE
                   WHEN a.status = 'approved' THEN '你的申诉已通过，对应限制已经解除。'
                   ELSE '你的申诉未通过，可以根据原因调整后再提交。'
                 END
               ) AS detail_text,
               COALESCE(a.reviewed_at, a.updated_at) AS message_time,
               CASE WHEN a.status = 'approved' THEN '申诉通过' ELSE '申诉驳回' END AS status_text,
               CASE WHEN mr.id IS NULL THEN 0 ELSE 1 END AS is_read
             FROM user_appeals a
             LEFT JOIN user_message_reads mr
               ON mr.user_id = ?
              AND mr.message_type = 'appeal'
              AND mr.message_id = a.id
             WHERE a.user_id = ?
               AND a.status IN ('approved', 'rejected')
           ) messages
          ORDER BY message_time DESC
          LIMIT 20`,
        [userId, userId, userId, userId, userId],
      );

      const messageItems = this.normalizeMessages(rows || []);
      const unreadCount = messageItems.filter((item) => !item.isRead).length;

      this.setData({
        unreadCount,
        messageItems,
      });
    } catch (error) {
      console.warn('[notification-center] load message center failed', error);
      this.setData({
        unreadCount: 0,
        messageItems: [],
      });
    }
  },

  async markMessageRead(messageType, messageId) {
    if (!this.data.isLoggedIn) {
      return;
    }

    const userId = await resolveCurrentUserId();
    await callDbQuery(
      `INSERT INTO user_message_reads (user_id, message_type, message_id, read_at, _openid)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, '')
       ON DUPLICATE KEY UPDATE
         read_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, messageType, messageId],
    );
  },

  async onMessageTap(event) {
    const messageType = event.currentTarget.dataset.type;
    const messageId = Number(event.currentTarget.dataset.id);
    const current = this.data.messageItems.find(
      (item) => item.message_type === messageType && Number(item.message_id) === messageId,
    );

    if (!current) {
      return;
    }

    if (!current.isRead) {
      try {
        await this.markMessageRead(messageType, messageId);
      } catch (error) {
        console.warn('[notification-center] mark read failed', error);
      }
    }

    wx.showModal({
      title: current.title || '系统消息',
      content: current.detailText || '暂无更多说明',
      showCancel: false,
      confirmText: '知道了',
      success: () => {
        this.loadMessageCenter();
      },
    });
  },

  async onMarkAllRead() {
    if (!this.data.isLoggedIn || !this.data.unreadCount) {
      return;
    }

    try {
      for (const item of this.data.messageItems) {
        if (!item.isRead) {
          await this.markMessageRead(item.message_type, Number(item.message_id));
        }
      }
      wx.showToast({ title: '已全部标记已读', icon: 'success' });
      await this.loadMessageCenter();
    } catch (error) {
      console.warn('[notification-center] mark all read failed', error);
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  onOpenPrimaryAction() {
    const page = this.data.primaryActionPage || '/pages/settings/settings';
    wx.navigateTo({ url: page });
  },
});
