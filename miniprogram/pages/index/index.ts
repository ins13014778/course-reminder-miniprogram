Page({
  data: {
    user: {},
    todayCourses: [],
    currentDate: '',
  },

  onLoad() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    this.loadData();
  },

  loadData() {
    const user = wx.getStorageSync('user') || {};
    const date = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;

    this.setData({ user, currentDate, todayCourses: [] });
  },

  goToCourses() {
    wx.navigateTo({ url: '/pages/courses/courses' });
  },

  goToImport() {
    wx.navigateTo({ url: '/pages/import/import' });
  },

  goToSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  goToProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  },
});
