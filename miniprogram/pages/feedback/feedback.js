const { callDbQuery, resolveCurrentUserId } = require('../../utils/cloud-db');

const CATEGORY_OPTIONS = [
  { label: '功能建议', value: 'feature' },
  { label: '体验优化', value: 'ux' },
  { label: '问题反馈', value: 'bug' },
  { label: '其他', value: 'other' },
];

Page({
  data: {
    categories: CATEGORY_OPTIONS.map((item) => item.label),
    categoryIndex: 0,
    title: '',
    content: '',
    contact: '',
    loading: false,
    records: [],
  },

  onLoad() {
    this.loadRecords();
  },

  async loadRecords() {
    try {
      const userId = await resolveCurrentUserId();
      const rows = await callDbQuery(
        `SELECT id, category, title, content, contact, status, admin_note, created_at
           FROM user_feedback
          WHERE user_id = ?
          ORDER BY created_at DESC, id DESC
          LIMIT 10`,
        [userId],
      );
      this.setData({ records: rows || [] });
    } catch (error) {
      console.warn('[feedback] load records failed', error);
    }
  },

  onCategoryChange(e) {
    this.setData({ categoryIndex: Number(e.detail.value) || 0 });
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
    const category = CATEGORY_OPTIONS[this.data.categoryIndex]?.value || 'feature';
    const title = String(this.data.title || '').trim();
    const content = String(this.data.content || '').trim();
    const contact = String(this.data.contact || '').trim();

    if (!title) {
      wx.showToast({ title: '请先填写反馈标题', icon: 'none' });
      return;
    }

    if (content.length < 5) {
      wx.showToast({ title: '反馈内容至少 5 个字', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const userId = await resolveCurrentUserId();
      await callDbQuery(
        `INSERT INTO user_feedback (user_id, category, title, content, contact, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [userId, category, title, content, contact || null],
      );

      this.setData({
        title: '',
        content: '',
        contact: '',
        categoryIndex: 0,
        loading: false,
      });

      wx.showToast({ title: '反馈已提交', icon: 'success' });
      this.loadRecords();
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: (error && error.message) || '提交失败',
        icon: 'none',
      });
    }
  },

  statusLabel(status) {
    if (status === 'reviewed') return '已处理';
    if (status === 'archived') return '已归档';
    return '待处理';
  },

  categoryLabel(category) {
    const found = CATEGORY_OPTIONS.find((item) => item.value === category);
    return found ? found.label : '其他';
  },
});
