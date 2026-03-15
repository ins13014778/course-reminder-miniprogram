import { authService } from '../../services/auth';

Page({
  data: {},

  async onLogin() {
    try {
      const { code } = await wx.login();
      const res: any = await authService.login(code);

      wx.setStorageSync('token', res.token);
      wx.setStorageSync('user', res.user);

      wx.switchTab({ url: '/pages/courses/courses' });
    } catch (error) {
      wx.showToast({ title: '登录失败', icon: 'none' });
    }
  },
});
