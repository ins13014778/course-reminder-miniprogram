// pages/profile/profile.js
Page({
  data: {
    user: {}
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
  },

  loadUserInfo() {
    const user = wx.getStorageSync('user') || {};
    this.setData({ user });
  },

  goToSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.reLaunch({ url: '/pages/login/login' });
        }
      }
    });
  },

  // 底部导航
  goToIndex() { wx.navigateTo({ url: '/pages/index/index' }); },
  goToCourses() { wx.navigateTo({ url: '/pages/courses/courses' }); },
  goToImport() { wx.navigateTo({ url: '/pages/import/import' }); },
  goToProfile() { },
});
