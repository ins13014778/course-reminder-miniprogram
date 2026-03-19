const { getLoginToken, getStoredUser, hasLoginSession, updateStoredUser } = require('./auth');
const { handleRestrictionFailure } = require('./restriction');

function callDbQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'db-query',
      data: { sql, params },
      success: (res) => {
        const result = res && res.result;
        if (result && result.success) {
          resolve(result.data || []);
          return;
        }

        handleRestrictionFailure(result).then((handledError) => {
          if (handledError) {
            reject(handledError);
            return;
          }

          reject(new Error((result && result.message) || '数据库操作失败'));
        });
      },
      fail: (error) => reject(error),
    });
  });
}

async function resolveCurrentUserId() {
  if (!hasLoginSession()) {
    throw new Error('请先登录');
  }

  const storedUser = getStoredUser();
  if (storedUser && storedUser.id) {
    return storedUser.id;
  }

  const token = getLoginToken();
  if (!token) {
    throw new Error('登录状态已失效');
  }

  const rows = await callDbQuery('SELECT id FROM users WHERE openid = ? LIMIT 1', [token]);
  if (!rows.length) {
    throw new Error('未找到当前用户');
  }

  const userId = Number(rows[0].id);
  updateStoredUser({ id: userId });
  return userId;
}

module.exports = {
  callDbQuery,
  resolveCurrentUserId,
};
