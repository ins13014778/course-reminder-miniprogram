// 用户云函数 - 获取或创建用户（使用 MySQL）
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || event.openid;
  const userInfo = event.userInfo || {};

  if (!openid) {
    return { success: false, message: '缺少 openid' };
  }

  try {
    // 查询用户
    const selectResult = await cloud.callFunction({
      name: 'db-query',
      data: {
        sql: 'SELECT * FROM users WHERE openid = ? LIMIT 1',
        params: [openid]
      }
    });

    if (selectResult.result && selectResult.result.success && selectResult.result.data && selectResult.result.data.length > 0) {
      return { success: true, user: selectResult.result.data[0] };
    }

    // 创建用户
    await cloud.callFunction({
      name: 'db-query',
      data: {
        sql: 'INSERT INTO users (openid, nickname, avatar_url, _openid) VALUES (?, ?, ?, ?)',
        params: [openid, userInfo.nickname || '用户', userInfo.avatar || '', openid]
      }
    });

    // 返回新创建的用户
    const newUserResult = await cloud.callFunction({
      name: 'db-query',
      data: {
        sql: 'SELECT * FROM users WHERE openid = ? LIMIT 1',
        params: [openid]
      }
    });

    return {
      success: true,
      user: newUserResult.result.data[0]
    };
  } catch (error) {
    console.error('[user-getOrCreate] 错误:', error);
    return { success: false, message: error.message };
  }
};
