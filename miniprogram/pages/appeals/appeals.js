const { callDbQuery, resolveCurrentUserId } = require('../../utils/cloud-db');

const APPEAL_TYPE_OPTIONS = [
  { type: 'account', label: '账号申诉', statusField: 'account_status', reasonField: 'account_ban_reason', untilField: 'account_banned_until' },
  { type: 'note', label: '笔记申诉', statusField: 'note_status', reasonField: 'note_ban_reason', untilField: 'note_banned_until' },
  { type: 'share', label: '分享申诉', statusField: 'share_status', reasonField: 'share_ban_reason', untilField: 'share_banned_until' },
  { type: 'avatar', label: '头像申诉', statusField: 'avatar_status', reasonField: 'avatar_ban_reason', untilField: 'avatar_banned_until' },
  { type: 'signature', label: '个签申诉', statusField: 'signature_status', reasonField: 'signature_ban_reason', untilField: 'signature_banned_until' },
];

function isRestrictionActive(status, bannedUntil) {
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

function formatUntil(value) {
  if (!value) {
    return '永久限制';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatMySqlDateTime(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string'
      ? value.replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '')
      : null;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(
    2,
    '0',
  )}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function buildRestrictions(row) {
  return APPEAL_TYPE_OPTIONS
    .map((item) => ({
      type: item.type,
      label: item.label,
      status: row[item.statusField],
      reason: row[item.reasonField] || '',
      expiresAt: row[item.untilField] || null,
    }))
    .filter((item) => isRestrictionActive(item.status, item.expiresAt))
    .map((item) => ({
      ...item,
      reasonText: item.reason || '后台未填写限制原因',
      expiresText: formatUntil(item.expiresAt),
    }));
}

function appealTypeLabel(type) {
  const matched = APPEAL_TYPE_OPTIONS.find((item) => item.type === type);
  return matched ? matched.label : '未知类型';
}

Page({
  data: {
    restrictionLabels: [],
    restrictions: [],
    restrictionIndex: 0,
    title: '',
    content: '',
    contact: '',
    loading: false,
    records: [],
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const userId = await resolveCurrentUserId();
      await Promise.all([this.loadRestrictions(userId), this.loadRecords(userId)]);
    } catch (error) {
      wx.showToast({ title: (error && error.message) || '加载失败', icon: 'none' });
    }
  },

  async loadRestrictions(userId) {
    const rows = await callDbQuery(
      `SELECT
          account_status,
          account_ban_reason,
          account_banned_until,
          note_status,
          note_ban_reason,
          note_banned_until,
          share_status,
          share_ban_reason,
          share_banned_until,
          avatar_status,
          avatar_ban_reason,
          avatar_banned_until,
          signature_status,
          signature_ban_reason,
          signature_banned_until
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId],
    );

    const restrictions = rows.length ? buildRestrictions(rows[0]) : [];
    this.setData({
      restrictions,
      restrictionLabels: restrictions.map((item) => item.label),
      restrictionIndex: 0,
    });
  },

  async loadRecords(userId) {
    const rows = await callDbQuery(
      `SELECT
          id,
          appeal_type,
          title,
          content,
          contact,
          status,
          review_action,
          admin_note,
          created_at,
          reviewed_at
       FROM user_appeals
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 10`,
      [userId],
    ).catch(() => []);

    this.setData({ records: rows || [] });
  },

  onRestrictionChange(e) {
    this.setData({ restrictionIndex: Number(e.detail.value) || 0 });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value || '' });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value || '' });
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value || '' });
  },

  async onSubmit() {
    const restrictions = this.data.restrictions || [];
    const target = restrictions[this.data.restrictionIndex];
    const title = String(this.data.title || '').trim();
    const content = String(this.data.content || '').trim();
    const contact = String(this.data.contact || '').trim();

    if (!target) {
      wx.showToast({ title: '当前没有可申诉的限制', icon: 'none' });
      return;
    }

    if (!title) {
      wx.showToast({ title: '请先填写申诉标题', icon: 'none' });
      return;
    }

    if (content.length < 8) {
      wx.showToast({ title: '申诉内容至少 8 个字', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const userId = await resolveCurrentUserId();
      const existing = await callDbQuery(
        `SELECT id
           FROM user_appeals
          WHERE user_id = ? AND appeal_type = ? AND status = 'pending'
          LIMIT 1`,
        [userId, target.type],
      );

      if (existing.length) {
        throw new Error('该类型已有待处理申诉，请等待后台审核');
      }

      await callDbQuery(
        `INSERT INTO user_appeals
          (user_id, appeal_type, title, content, contact, restriction_reason, restriction_expires_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          userId,
          target.type,
          title,
          content,
          contact || null,
          target.reasonText,
          formatMySqlDateTime(target.expiresAt),
        ],
      );

      this.setData({
        title: '',
        content: '',
        contact: '',
        restrictionIndex: 0,
        loading: false,
      });

      wx.showToast({ title: '申诉已提交', icon: 'success' });
      await this.loadData();
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: (error && error.message) || '提交失败',
        icon: 'none',
      });
    }
  },

  statusLabel(status) {
    if (status === 'approved') return '已通过';
    if (status === 'rejected') return '已驳回';
    return '待处理';
  },

  appealTypeLabel,
});
