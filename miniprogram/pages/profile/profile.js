const authService = require('../../services/auth');
const {
  getLoginToken,
  hasLoginSession,
  updateStoredUser,
  clearLoginSession,
  setLoginSession,
} = require('../../utils/auth');
const { promptRestrictionAppeal } = require('../../utils/restriction');
const { callDbQuery } = require('../../utils/cloud-db');

const RESTRICTION_OPTIONS = [
  { key: 'account', label: '账号功能受限', statusField: 'account_status', reasonField: 'account_ban_reason', untilField: 'account_banned_until' },
  { key: 'note', label: '笔记功能受限', statusField: 'note_status', reasonField: 'note_ban_reason', untilField: 'note_banned_until' },
  { key: 'share', label: '分享功能受限', statusField: 'share_status', reasonField: 'share_ban_reason', untilField: 'share_banned_until' },
  { key: 'avatar', label: '头像功能受限', statusField: 'avatar_status', reasonField: 'avatar_ban_reason', untilField: 'avatar_banned_until' },
  { key: 'signature', label: '个签功能受限', statusField: 'signature_status', reasonField: 'signature_ban_reason', untilField: 'signature_banned_until' },
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

function formatRestrictionUntil(value) {
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

function buildRestrictionSummary(row) {
  return RESTRICTION_OPTIONS
    .map((item) => ({
      key: item.key,
      label: item.label,
      reason: row[item.reasonField] || '',
      bannedUntil: row[item.untilField] || null,
      status: row[item.statusField],
    }))
    .filter((item) => isRestrictionActive(item.status, item.bannedUntil))
    .map((item) => ({
      ...item,
      detail: `${item.reason || '后台未填写原因'} · ${formatRestrictionUntil(item.bannedUntil)}`,
    }));
}

Page({
  data: {
    user: {},
    isLoggedIn: false,
    restrictions: [],
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
        restrictions: buildRestrictionSummary(row),
      });
    } catch (error) {
      clearLoginSession();
      this.setData({ user: {}, isLoggedIn: false, restrictions: [] });
    }
  },

  getRestrictionByKey(key) {
    return (this.data.restrictions || []).find((item) => item.key === key) || null;
  },

  async ensureRestrictionAllowed(key, fallbackMessage) {
    const restriction = this.getRestrictionByKey(key);
    if (!restriction) {
      return true;
    }

    await promptRestrictionAppeal({
      message: fallbackMessage || `${restriction.label}，请先申诉后再修改。`,
      reason: restriction.reason,
      bannedUntil: restriction.bannedUntil,
      restrictionType: restriction.key,
      canAppeal: true,
    });
    return false;
  },

  goToLogin() {
    wx.getUserProfile({
      desc: '用于保存你的个人资料与课表信息',
      success: async (res) => {
        wx.showLoading({ title: '登录中...' });

        try {
          const result = await authService.authService.login(res.userInfo || {});
          setLoginSession(result.user, result.token);

          wx.hideLoading();
          wx.showToast({ title: '登录成功', icon: 'success' });
          this.loadUserInfo();
        } catch (error) {
          wx.hideLoading();
          if (error && error.canAppeal && error.token) {
            setLoginSession(error.user || {}, error.token);
            await promptRestrictionAppeal(error);
            return;
          }

          wx.showToast({
            title: (error && error.message) || '登录失败',
            icon: 'none',
          });
          console.error('[Profile] 登录失败:', error);
        }
      },
      fail: (err) => {
        console.error('[Profile] 获取用户信息失败:', err);
        wx.showToast({ title: '用户拒绝授权', icon: 'none' });
      },
    });
  },

  promptField(title, placeholderText, field, currentValue) {
    wx.showModal({
      title,
      editable: true,
      placeholderText,
      content: currentValue || '',
      success: (res) => {
        const value = (res.content || '').trim();
        if (res.confirm && value) {
          this.updateUserInfo({ [field]: value });
        }
      },
    });
  },

  async onSetNickname() {
    if (!(await this.ensureRestrictionAllowed('account', '账号功能受限，请先申诉后再修改昵称。'))) return;
    this.promptField('设置用户名', '请输入用户名', 'nickname', this.data.user.nickname);
  },

  async onSetSignature() {
    if (!(await this.ensureRestrictionAllowed('signature', '个性签名功能受限，请先申诉后再修改。'))) return;
    this.promptField('设置个性签名', '请输入个性签名', 'signature', this.data.user.signature);
  },

  async onSetSchool() {
    if (!(await this.ensureRestrictionAllowed('account', '账号功能受限，请先申诉后再修改资料。'))) return;
    this.promptField('设置学校', '请输入学校名称', 'school', this.data.user.school);
  },

  async onSetMajor() {
    if (!(await this.ensureRestrictionAllowed('account', '账号功能受限，请先申诉后再修改资料。'))) return;
    this.promptField('设置专业', '请输入专业名称', 'major', this.data.user.major);
  },

  async onSetGrade() {
    if (!(await this.ensureRestrictionAllowed('account', '账号功能受限，请先申诉后再修改资料。'))) return;
    this.promptField('设置年级', '例如 2025 级', 'grade', this.data.user.grade);
  },

  async onChooseAvatar() {
    if (!(await this.ensureRestrictionAllowed('avatar', '头像功能受限，请先申诉后再修改头像。'))) return;

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFiles?.[0]?.tempFilePath;
        if (!tempFilePath) {
          wx.showToast({ title: '未选择图片', icon: 'none' });
          return;
        }

        wx.showLoading({ title: '上传头像中...' });
        try {
          const ext = tempFilePath.split('.').pop() || 'png';
          const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: tempFilePath,
          });

          await this.updateUserInfo({ avatar_url: uploadRes.fileID }, '头像已更新');
        } catch (error) {
          wx.hideLoading();
          wx.showToast({ title: '头像上传失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '已取消选择', icon: 'none' });
      },
    });
  },

  async updateUserInfo(fields, successTitle = '保存成功') {
    const token = getLoginToken();
    if (!token) return;

    const updates = Object.keys(fields).map((key) => `${key} = ?`).join(', ');
    const values = [...Object.values(fields), token];

    wx.showLoading({ title: '保存中...' });
    try {
      await callDbQuery(`UPDATE users SET ${updates} WHERE openid = ?`, values);
      wx.hideLoading();
      wx.showToast({ title: successTitle, icon: 'success' });
      this.loadUserInfo();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: (error && error.message) || '保存失败', icon: 'none' });
    }
  },

  async onClearCourses() {
    if (!(await this.ensureRestrictionAllowed('account', '账号功能受限，请先申诉后再执行清空课表。'))) return;

    wx.showModal({
      title: '清空课表',
      content: '确定要清空当前账号下的所有课程吗？此操作无法恢复。',
      confirmText: '确认清空',
      confirmColor: '#d25c2f',
      success: async (res) => {
        if (!res.confirm) return;

        const user = this.data.user;
        if (!user.id) {
          wx.showToast({ title: '未找到用户信息', icon: 'none' });
          return;
        }

        wx.showLoading({ title: '清空中...' });
        try {
          await callDbQuery('DELETE FROM courses WHERE user_id = ?', [user.id]);
          wx.hideLoading();
          wx.showToast({ title: '课表已清空', icon: 'success' });
        } catch (error) {
          wx.hideLoading();
          wx.showToast({ title: (error && error.message) || '清空失败', icon: 'none' });
        }
      },
    });
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

  goToIndex() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  goToCourses() {
    wx.switchTab({ url: '/pages/courses/courses' });
  },

  goToImport() {
    wx.switchTab({ url: '/pages/import/import' });
  },

  goToProfile() {},

  goToNotes() {
    wx.navigateTo({ url: '/pages/notes/notes' });
  },

  goToSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  goToNotificationCenter() {
    wx.navigateTo({ url: '/pages/notification-center/notification-center' });
  },

  goToAppeals() {
    wx.navigateTo({ url: '/pages/appeals/appeals' });
  },

  goToAboutUs() {
    wx.navigateTo({ url: '/pages/about-us/about-us' });
  },

  goToFeedback() {
    wx.navigateTo({ url: '/pages/feedback/feedback' });
  },
});
