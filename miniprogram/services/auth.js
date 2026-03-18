const db = require('./database');

const authService = {
  async login(userInfo = {}) {
    try {
      const openid = await db.getOpenid();

      if (!openid) {
        throw new Error('获取 openid 失败');
      }

      const result = await db.getOrCreateUser(openid, {
        nickname: userInfo.nickName || '',
        avatar: userInfo.avatarUrl || '',
      });

      if (!result || result.success !== true || !result.user) {
        throw new Error((result && result.message) || '创建用户失败');
      }

      return {
        success: true,
        user: result.user,
        token: openid,
      };
    } catch (error) {
      console.error('[Auth] 登录失败:', error);
      throw error;
    }
  },
};

module.exports = { authService };
