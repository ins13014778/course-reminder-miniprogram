const authService = require('../../services/auth');

Page({
  data: {},

  onLogin() {
    // 1. 获取用户信息
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: async (res) => {
        const userInfo = res.userInfo;
        wx.showLoading({ title: '登录中...' });

        try {
          // 2. 调用登录服务
          const result = await authService.authService.login(userInfo);

          // 3. 保存用户信息
          wx.setStorageSync('user', result.user);
          wx.setStorageSync('token', result.token);

          wx.hideLoading();
          wx.showToast({ title: '登录成功', icon: 'success' });

          // 4. 返回上一页（如果有），否则跳转首页
          setTimeout(() => {
            const pages = getCurrentPages();
            if (pages.length > 1) {
              wx.navigateBack();
            } else {
              wx.reLaunch({ url: '/pages/index/index' });
            }
          }, 1000);
        } catch (error) {
          wx.hideLoading();
          wx.showToast({ title: '登录失败', icon: 'none' });
          console.error('[Login] 登录失败:', error);
        }
      },
      fail: (err) => {
        console.error('[Login] 获取用户信息失败:', err);
        wx.showToast({ title: '用户拒绝授权', icon: 'none' });
      }
    });
  }
});
