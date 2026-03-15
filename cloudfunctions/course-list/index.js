// 云函数: course-list - 获取课程列表
// 使用 tcb-admin-node 操作 MySQL 数据库

exports.main = async (event, context) => {
  const { userId, weekday, week } = event;

  // 环境 ID
  const envId = 'c-66-7gfze7g4075f38c7';

  try {
    let query = 'SELECT * FROM courses WHERE user_id = ?';
    const params = [userId];

    if (weekday) {
      query += ' AND weekday = ?';
      params.push(weekday);
    }

    if (week) {
      query += ' AND start_week <= ? AND end_week >= ?';
      params.push(week, week);
    }

    query += ' ORDER BY weekday, start_section';

    // 使用 CloudBase HTTP API 查询 MySQL
    const response = await fetch(
      `https://${envId}.service.tcloudbase.com/mysql/execute-sql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${event.token}`
        },
        body: JSON.stringify({
          sql: query,
          params: params
        })
      }
    );

    const result = await response.json();

    if (result.success) {
      return {
        success: true,
        data: result.result || []
      };
    } else {
      throw new Error(result.message || '查询失败');
    }
  } catch (err) {
    console.error('获取课程列表失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
};
