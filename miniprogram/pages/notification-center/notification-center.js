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
    feedbackUpdates: [],
    appealUpdates: [],
  },

  onLoad() {
    this.loadContent();
  },

  async loadContent() {
    this.setData({ loading: true });

    try {
      const page = await fetchContentPage('notification_management');
      const extra = page.extra || {};

      this.setData({
        title: page.title,
        subtitle: page.subtitle,
        content: page.content,
        tips: Array.isArray(extra.tips) ? extra.tips : [],
        primaryActionText: extra.primaryActionText || '打开提醒设置',
        primaryActionPage: extra.primaryActionPage || '/pages/settings/settings',
      });

      await Promise.all([this.loadFeedbackUpdates(), this.loadAppealUpdates()]);
      this.setData({ loading: false });
    } catch (error) {
      console.error('[notification-center] load failed', error);
      this.setData({ loading: false });
      wx.showToast({ title: '页面加载失败', icon: 'none' });
    }
  },

  async loadFeedbackUpdates() {
    if (!hasLoginSession()) {
      this.setData({ feedbackUpdates: [] });
      return;
    }

    try {
      const userId = await resolveCurrentUserId();
      const rows = await callDbQuery(
        `SELECT id, title, status, admin_note, reviewed_at
           FROM user_feedback
          WHERE user_id = ? AND status IN ('reviewed', 'archived')
          ORDER BY reviewed_at DESC, updated_at DESC
          LIMIT 5`,
        [userId],
      );
      this.setData({ feedbackUpdates: rows || [] });
    } catch (error) {
      console.warn('[notification-center] load feedback updates failed', error);
      this.setData({ feedbackUpdates: [] });
    }
  },

  async loadAppealUpdates() {
    if (!hasLoginSession()) {
      this.setData({ appealUpdates: [] });
      return;
    }

    try {
      const userId = await resolveCurrentUserId();
      const rows = await callDbQuery(
        `SELECT id, title, appeal_type, status, admin_note, reviewed_at
           FROM user_appeals
          WHERE user_id = ? AND status IN ('approved', 'rejected')
          ORDER BY reviewed_at DESC, updated_at DESC
          LIMIT 5`,
        [userId],
      ).catch(() => []);

      this.setData({ appealUpdates: rows || [] });
    } catch (error) {
      console.warn('[notification-center] load appeal updates failed', error);
      this.setData({ appealUpdates: [] });
    }
  },

  onOpenPrimaryAction() {
    const page = this.data.primaryActionPage || '/pages/settings/settings';
    wx.navigateTo({ url: page });
  },
});
