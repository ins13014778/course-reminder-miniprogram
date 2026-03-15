// 云函数: getCourses - 获取课程列表
// 部署到 CloudBase 云函数

exports.main = async (event, context) => {
  const { userId, weekday, week } = event;

  console.log('获取课程参数:', { userId, weekday, week });

  // 动态导入 mysql 模块
  const cloudbase = require('@cloudbase/node-sdk');
  const app = cloudbase.init({
    env: 'c-66-7gfze7g4075f38c7'
  });

  try {
    // 构建 SQL 查询
    let sql = 'SELECT * FROM courses WHERE user_id = ?';
    const params = [userId];

    if (weekday) {
      sql += ' AND weekday = ?';
      params.push(weekday);
    }

    if (week) {
      sql += ' AND start_week <= ? AND end_week >= ?';
      params.push(week, week);
    }

    sql += ' ORDER BY weekday, start_section';

    // 执行 SQL 查询
    const res = await app.database().executeSql({
      sql: sql,
      complete: (err, data) => {
        if (err) {
          console.error('SQL执行失败:', err);
        } else {
          console.log('SQL执行成功:', data);
        }
      }
    });

    return {
      success: true,
      data: res || [],
      message: '获取成功'
    };
  } catch (err) {
    console.error('获取课程失败:', err);
    return {
      success: false,
      error: err.message,
      message: '获取失败'
    };
  }
};
