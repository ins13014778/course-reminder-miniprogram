const authService = require('../../services/auth');
const { setLoginSession } = require('../../utils/auth');

Page({
  data: {},

  onLogin() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: async (res) => {
        const userInfo = res.userInfo;
        wx.showLoading({ title: '登录中...' });

        try {
          const result = await authService.authService.login(userInfo);
          setLoginSession(result.user, result.token);

          wx.hideLoading();
          wx.showToast({ title: '登录成功', icon: 'success' });

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
          wx.showToast({ title: (error && error.message) || '登录失败', icon: 'none' });
          console.error('[Login] 登录失败:', error);
        }
      },
      fail: (err) => {
        console.error('[Login] 获取用户信息失败:', err);
        wx.showToast({ title: '用户拒绝授权', icon: 'none' });
      },
    });
  },
});
