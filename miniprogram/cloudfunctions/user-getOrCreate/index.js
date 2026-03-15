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
    // 使用 CloudBase 的 callFunction 调用 SQL 执行
    // 由于 wx-server-sdk 不直接支持 MySQL，我们使用 HTTP API
    const tcb = require('tcb-admin-node');
    const app = tcb.init({ env: cloud.DYNAMIC_CURRENT_ENV });

    // 查询用户
    const selectSql = `SELECT * FROM users WHERE openid = '${openid}' LIMIT 1`;
    const selectResult = await app.callFunction({
      name: 'db-query',
      data: { sql: selectSql }
    });

    if (selectResult.result && selectResult.result.data && selectResult.result.data.length > 0) {
      return { success: true, user: selectResult.result.data[0] };
    }

    // 创建用户
    const insertSql = `INSERT INTO users (openid, nickname, avatar_url, _openid) VALUES ('${openid}', '${userInfo.nickname || '用户'}', '${userInfo.avatar || ''}', '${openid}')`;
    await app.callFunction({
      name: 'db-query',
      data: { sql: insertSql }
    });

    // 返回新创建的用户
    const newUserResult = await app.callFunction({
      name: 'db-query',
      data: { sql: selectSql }
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
