const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || event.openid;
  const userInfo = event.userInfo || {};

  if (!openid) {
    return { success: false, message: 'missing openid' };
  }

  try {
    const selectResult = await cloud.callFunction({
      name: 'db-query',
      data: {
        sql: 'SELECT * FROM users WHERE openid = ? LIMIT 1',
        params: [openid]
      }
    });

    if (selectResult.result?.success && selectResult.result.data?.length > 0) {
      return { success: true, user: selectResult.result.data[0] };
    }

    await cloud.callFunction({
      name: 'db-query',
      data: {
        sql: 'INSERT INTO users (openid, nickname, signature, avatar_url, school, major, grade, _openid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        params: [
          openid,
          userInfo.nickname || '用户',
          userInfo.signature || '',
          userInfo.avatar || '',
          userInfo.school || '',
          userInfo.major || '',
          userInfo.grade || '',
          openid
        ]
      }
    });

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
    console.error('[user-getOrCreate] error:', error);
    return { success: false, message: error.message };
  }
};
