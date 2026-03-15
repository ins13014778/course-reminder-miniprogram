App({
  globalData: {
    cloudbase: null
  },

  onLaunch() {
    // 初始化云开发
    wx.cloud.init({
      env: 'dawdawd15-8g023nsw8cb3f68a',
      traceUser: true
    });

    // 初始化 cloudbase 实例
    this.globalData.cloudbase = wx.cloud;

    console.log('小程序启动，云开发已初始化');
  }
});
