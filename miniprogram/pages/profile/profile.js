const {
  getLoginToken,
  hasLoginSession,
  updateStoredUser,
  clearLoginSession,
} = require('../../utils/auth');
const { callDbQuery } = require('../../utils/cloud-db');
const { buildActiveRestrictionSummary } = require('../../utils/user-status');

Page({
  data: {
    user: {},
    isLoggedIn: false,
    restrictions: [],
    agreedGuest: false,
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
  },

  async loadUserInfo() {
    const token = getLoginToken();
    if (!hasLoginSession() || !token) {
      this.setData({ user: {}, isLoggedIn: false, restrictions: [] });
      return;
    }

    try {
      const rows = await callDbQuery(
        `SELECT
            id,
            nickname,
            signature,
            avatar_url,
            school,
            major,
            grade,
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
          WHERE openid = ?
          LIMIT 1`,
        [token],
      );

      const row = rows[0];
      if (!row) {
        clearLoginSession();
        this.setData({ user: {}, isLoggedIn: false, restrictions: [] });
        return;
      }

      const nickname = row.nickname || '微信用户';
      const user = {
        id: row.id,
        nickname,
        signature: row.signature || '',
        avatar: row.avatar_url || '',
        avatar_url: row.avatar_url || '',
        school: row.school || '',
        major: row.major || '',
        grade: row.grade || '',
        avatarLetter: nickname.trim().charAt(0) || '我',
      };

      updateStoredUser(user);
      this.setData({
        user,
        isLoggedIn: true,
        restrictions: buildActiveRestrictionSummary(row),
      });
    } catch (error) {
      console.error('[Profile] loadUserInfo failed:', error);
      clearLoginSession();
      this.setData({ user: {}, isLoggedIn: false, restrictions: [] });
    }
  },

  openLegalPage(key) {
    wx.navigateTo({ url: `/pages/legal-document/legal-document?key=${key}` });
  },

  onToggleGuestAgreement() {
    this.setData({ agreedGuest: !this.data.agreedGuest });
  },

  goToLogin() {
    if (!this.data.agreedGuest) {
      wx.showToast({
        title: '请先阅读并同意用户协议和隐私政策',
        icon: 'none',
      });
      return;
    }

    wx.navigateTo({ url: '/pages/login/login' });
  },

  onSetNickname() {
    wx.showToast({ title: '请先完成当前版本整改后再编辑', icon: 'none' });
  },

  onSetSignature() {
    wx.showToast({ title: '请先完成当前版本整改后再编辑', icon: 'none' });
  },

  onSetSchool() {
    wx.showToast({ title: '请先完成当前版本整改后再编辑', icon: 'none' });
  },

  onSetMajor() {
    wx.showToast({ title: '请先完成当前版本整改后再编辑', icon: 'none' });
  },

  onSetGrade() {
    wx.showToast({ title: '请先完成当前版本整改后再编辑', icon: 'none' });
  },

  onChooseAvatar() {
    wx.showToast({ title: '请先完成当前版本整改后再编辑', icon: 'none' });
  },

  onClearCourses() {
    wx.showToast({ title: '请在后续版本中操作', icon: 'none' });
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          clearLoginSession();
          this.setData({ user: {}, isLoggedIn: false, restrictions: [] });
          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      },
    });
  },

  goToNotes() {
    wx.navigateTo({ url: '/pages/notes/notes' });
  },

  goToSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  goToNotificationCenter() {
    wx.navigateTo({ url: '/pages/notification-center/notification-center' });
  },

  goToAccountStatus() {
    wx.navigateTo({ url: '/pages/account-status/account-status' });
  },

  goToAppeals() {
    wx.navigateTo({ url: '/pages/appeals/appeals' });
  },

  goToAboutUs() {
    wx.navigateTo({ url: '/pages/about-us/about-us' });
  },

  goToUserAgreement() {
    this.openLegalPage('user_agreement');
  },

  goToPrivacyPolicy() {
    this.openLegalPage('privacy_policy');
  },

  goToFeedback() {
    wx.navigateTo({ url: '/pages/feedback/feedback' });
  },
});
