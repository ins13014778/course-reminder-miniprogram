// 课程云函数 - 获取课程列表（从 MySQL 数据库查询）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { userId, weekday, week } = event;

  if (!userId) {
    return { success: false, message: '缺少 userId' };
  }

  try {
    // 使用 CloudBase MySQL
    const db = cloud.database();

    // 构建查询条件
    let query = `SELECT * FROM courses WHERE user_id = ${userId}`;

    if (weekday) {
      query += ` AND weekday = ${weekday}`;
    }

    if (week) {
      query += ` AND start_week <= ${week} AND end_week >= ${week}`;
    }

    query += ' ORDER BY weekday, start_section';

    // 执行查询
    const result = await cloud.callFunction({
      name: 'db-query',
      data: { sql: query }
    });

    return {
      success: true,
      courses: result.result || []
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      courses: []
    };
  }
};
