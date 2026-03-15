const db = require('./database');

const authService = {
  async login(userInfo = {}) {
    try {
      // 1. 获取 openid
      const openid = await db.getOpenid();

      if (!openid) {
        throw new Error('获取 openid 失败');
      }

      // 2. 获取或创建用户（传入用户信息）
      const result = await db.getOrCreateUser(openid, {
        nickname: userInfo.nickName || '',
        avatar: userInfo.avatarUrl || ''
      });

      if (!result.success || !result.user) {
        throw new Error('创建用户失败');
      }

      return {
        success: true,
        user: result.user,
        token: openid
      };
    } catch (error) {
      console.error('[Auth] 登录失败:', error);
      throw error;
    }
  }
};

module.exports = { authService };
