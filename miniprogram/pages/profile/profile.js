const authService = require('../../services/auth');
const {
  getLoginToken,
  hasLoginSession,
  updateStoredUser,
  clearLoginSession,
  setLoginSession,
} = require('../../utils/auth');

Page({
  data: {
    user: {},
    isLoggedIn: false
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
  },

  loadUserInfo() {
    const token = getLoginToken();
    if (!hasLoginSession() || !token) {
      this.setData({ user: {}, isLoggedIn: false });
      return;
    }

    wx.cloud.callFunction({
      name: 'db-query',
      data: {
        sql: 'SELECT id, nickname, signature, avatar_url, school, major, grade FROM users WHERE openid = ? LIMIT 1',
        params: [token]
      },
      success: (res) => {
        const row = res.result?.data?.[0];
        if (!res.result?.success || !row) {
          clearLoginSession();
          this.setData({ user: {}, isLoggedIn: false });
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
          avatarLetter: nickname.trim().charAt(0) || '我'
        };

        updateStoredUser(user);
        this.setData({ user, isLoggedIn: true });
      },
      fail: () => {
        clearLoginSession();
        this.setData({ user: {}, isLoggedIn: false });
      }
    });
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
      }
    });
  },

  onSetNickname() {
    this.promptField('设置用户名', '请输入用户名', 'nickname', this.data.user.nickname);
  },

  onSetSignature() {
    this.promptField('设置个性签名', '请输入个性签名', 'signature', this.data.user.signature);
  },

  onSetSchool() {
    this.promptField('设置学校', '请输入学校名称', 'school', this.data.user.school);
  },

  onSetMajor() {
    this.promptField('设置专业', '请输入专业名称', 'major', this.data.user.major);
  },

  onSetGrade() {
    this.promptField('设置年级', '例如 2025 级', 'grade', this.data.user.grade);
  },

  onChooseAvatar() {
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
            filePath: tempFilePath
          });

          this.updateUserInfo({ avatar_url: uploadRes.fileID }, '头像已更新');
        } catch (error) {
          wx.hideLoading();
          wx.showToast({ title: '头像上传失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '已取消选择', icon: 'none' });
      }
    });
  },

  updateUserInfo(fields, successTitle = '保存成功') {
    const token = getLoginToken();
    if (!token) return;

    const updates = Object.keys(fields).map((key) => `${key} = ?`).join(', ');
    const values = [...Object.values(fields), token];

    wx.showLoading({ title: '保存中...' });
    wx.cloud.callFunction({
      name: 'db-query',
      data: {
        sql: `UPDATE users SET ${updates} WHERE openid = ?`,
        params: values
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result?.success) {
          wx.showToast({ title: successTitle, icon: 'success' });
          this.loadUserInfo();
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    });
  },

  onClearCourses() {
    wx.showModal({
      title: '清空课表',
      content: '确定要清空当前账号下的所有课程吗？此操作无法恢复。',
      confirmText: '确认清空',
      confirmColor: '#d25c2f',
      success: (res) => {
        if (!res.confirm) return;

        const user = this.data.user;
        if (!user.id) {
          wx.showToast({ title: '未找到用户信息', icon: 'none' });
          return;
        }

        wx.showLoading({ title: '清空中...' });
        wx.cloud.callFunction({
          name: 'db-query',
          data: {
            sql: 'DELETE FROM courses WHERE user_id = ?',
            params: [user.id]
          },
          success: (result) => {
            wx.hideLoading();
            if (result.result?.success) {
              wx.showToast({ title: '课表已清空', icon: 'success' });
            } else {
              wx.showToast({ title: '清空失败', icon: 'none' });
            }
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '清空失败', icon: 'none' });
          }
        });
      }
    });
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出当前账号吗？',
      success: (res) => {
        if (res.confirm) {
          clearLoginSession();
          this.setData({ user: {}, isLoggedIn: false });
          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  },

  goToIndex() { wx.switchTab({ url: '/pages/index/index' }); },
  goToCourses() { wx.switchTab({ url: '/pages/courses/courses' }); },
  goToImport() { wx.switchTab({ url: '/pages/import/import' }); },
  goToProfile() {},
  goToNotes() { wx.navigateTo({ url: '/pages/notes/notes' }); },
  goToSettings() { wx.navigateTo({ url: '/pages/settings/settings' }); },
  goToNotificationCenter() { wx.navigateTo({ url: '/pages/notification-center/notification-center' }); },
  goToAboutUs() { wx.navigateTo({ url: '/pages/about-us/about-us' }); },
  goToFeedback() { wx.navigateTo({ url: '/pages/feedback/feedback' }); }
});
