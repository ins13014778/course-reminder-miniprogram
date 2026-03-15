// pages/profile/profile.js
Page({
  data: {
    user: {},
    isLoggedIn: false,
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
  },

  loadUserInfo() {
    const token = wx.getStorageSync('token');
    const isLoggedIn = !!token;

    if (isLoggedIn) {
      // 从数据库加载完整用户信息
      wx.cloud.callFunction({
        name: 'db-query',
        data: {
          sql: 'SELECT id, nickname, avatar_url, school, major, grade FROM users WHERE openid = ? LIMIT 1',
          params: [token]
        },
        success: (res) => {
          if (res.result?.success && res.result.data?.length > 0) {
            const user = res.result.data[0];
            wx.setStorageSync('user', user);
            this.setData({ user, isLoggedIn: true });
          }
        }
      });
    } else {
      this.setData({ user: {}, isLoggedIn: false });
    }
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  // 设置学校
  onSetSchool() {
    wx.showModal({
      title: '设置学校',
      editable: true,
      placeholderText: '请输入学校名称',
      content: this.data.user.school || '',
      success: (res) => {
        if (res.confirm && res.content) {
          this.updateUserInfo({ school: res.content.trim() });
        }
      }
    });
  },

  // 设置专业
  onSetMajor() {
    wx.showModal({
      title: '设置专业',
      editable: true,
      placeholderText: '请输入专业名称',
      content: this.data.user.major || '',
      success: (res) => {
        if (res.confirm && res.content) {
          this.updateUserInfo({ major: res.content.trim() });
        }
      }
    });
  },

  // 设置年级
  onSetGrade() {
    wx.showModal({
      title: '设置年级',
      editable: true,
      placeholderText: '如：2025级',
      content: this.data.user.grade || '',
      success: (res) => {
        if (res.confirm && res.content) {
          this.updateUserInfo({ grade: res.content.trim() });
        }
      }
    });
  },

  // 更新用户信息
  updateUserInfo(fields) {
    const token = wx.getStorageSync('token');
    if (!token) return;

    const updates = Object.keys(fields).map(k => `${k} = ?`).join(', ');
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
          wx.showToast({ title: '保存成功', icon: 'success' });
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

  // 清空课程表
  onClearCourses() {
    wx.showModal({
      title: '清空课程表',
      content: '确定要清空所有已导入的课程吗？此操作不可恢复！',
      confirmText: '确定清空',
      confirmColor: '#ff4444',
      success: (res) => {
        if (res.confirm) {
          const token = wx.getStorageSync('token');
          const user = this.data.user;

          wx.showLoading({ title: '清空中...' });
          wx.cloud.callFunction({
            name: 'db-query',
            data: {
              sql: 'DELETE FROM courses WHERE user_id = ?',
              params: [user.id]
            },
            success: (res) => {
              wx.hideLoading();
              if (res.result?.success) {
                wx.showToast({ title: '已清空课程表', icon: 'success' });
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
      }
    });
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          this.setData({ user: {}, isLoggedIn: false });
          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  },

  // 底部导航
  goToIndex() { wx.navigateTo({ url: '/pages/index/index' }); },
  goToCourses() { wx.navigateTo({ url: '/pages/courses/courses' }); },
  goToImport() { wx.navigateTo({ url: '/pages/import/import' }); },
  goToProfile() { },
  goToSettings() { wx.navigateTo({ url: '/pages/settings/settings' }); },
});
