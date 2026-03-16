const { ensureFirstLaunchGuestState } = require('./utils/auth');

App({
  globalData: {
    cloudbase: null
  },

  onLaunch() {
    // A brand new install should always start from the guest state.
    ensureFirstLaunchGuestState();

    wx.cloud.init({
      env: 'dawdawd15-8g023nsw8cb3f68a',
      traceUser: true
    });

    this.globalData.cloudbase = wx.cloud;
  }
});
