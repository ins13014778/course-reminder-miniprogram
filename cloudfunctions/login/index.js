// 云函数: login - 获取用户 openid
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  // 获取微信调用上下文
  const wxContext = cloud.getWxContext();

  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID || null,
    success: true
  };
};
