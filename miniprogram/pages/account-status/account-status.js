const { getLoginToken, hasLoginSession } = require('../../utils/auth');
const { callDbQuery, resolveCurrentUserId } = require('../../utils/cloud-db');
const {
  buildRestrictionItems,
  formatDateTime,
  getAppealTypeLabel,
  getAppealStatusLabel,
} = require('../../utils/user-status');

Page({
  data: {
    isLoggedIn: true,
    loading: true,
    user: null,
    restrictions: [],
    activeCount: 0,
    appealRecords: [],
  },

  onLoad() {
    this.loadPageData();
  },

  onShow() {
    this.loadPageData();
  },

  async loadPageData() {
    if (!hasLoginSession() || !getLoginToken()) {
      this.setData({
        isLoggedIn: false,
        loading: false,
        user: null,
        restrictions: [],
        activeCount: 0,
        appealRecords: [],
      });
      return;
    }

    this.setData({ loading: true, isLoggedIn: true });

    try {
      const userId = await resolveCurrentUserId();
      const [userRows, appealRows] = await Promise.all([
        callDbQuery(
          `SELECT
              id,
              nickname,
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
        ),
        callDbQuery(
          `SELECT
              id,
              appeal_type,
              title,
              content,
              status,
              admin_note,
              created_at,
              reviewed_at
           FROM user_appeals
           WHERE user_id = ?
           ORDER BY created_at DESC, id DESC
           LIMIT 10`,
          [userId],
        ).catch(() => []),
      ]);

      const userRow = userRows[0];
      if (!userRow) {
        throw new Error('未找到当前用户状态');
      }

      const restrictions = buildRestrictionItems(userRow);
      const appealRecords = (appealRows || []).map((item) => ({
        ...item,
        typeLabel: getAppealTypeLabel(item.appeal_type),
        statusLabel: getAppealStatusLabel(item.status),
        createdText: formatDateTime(item.created_at),
        reviewedText: formatDateTime(item.reviewed_at),
      }));

      this.setData({
        loading: false,
        user: {
          id: userRow.id,
          nickname: userRow.nickname || '微信用户',
        },
        restrictions,
        activeCount: restrictions.filter((item) => item.isActive).length,
        appealRecords,
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: (error && error.message) || '加载状态失败',
        icon: 'none',
      });
    }
  },

  goToProfile() {
    wx.switchTab({ url: '/pages/profile/profile' });
  },

  goToAppeals() {
    wx.navigateTo({ url: '/pages/appeals/appeals' });
  },
});
