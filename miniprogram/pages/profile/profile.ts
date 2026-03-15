Page({
  data: {
    user: null,
  },

  onLoad() {
    const user = wx.getStorageSync('user');
    this.setData({ user });
  },

  onLogout() {
    wx.clearStorageSync();
    wx.redirectTo({ url: '/pages/login/login' });
  },
});
