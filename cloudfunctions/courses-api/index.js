// 云函数: courses-api - 课程 API
// 使用 CloudBase HTTP API 访问 MySQL 数据库

exports.main = async (event, context) => {
  const { action, userId, courseId, courseData, weekday, week, HTTP_TOKEN } = event;

  // HTTP 响应头
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  // 环境 ID
  const envId = 'c-66-7gfze7g4075f38c7';

  // 使用环境变量中的 token（需要通过云函数触发器传入）
  const token = process.env.TCB_TOKEN || HTTP_TOKEN;

  try {
    let result;

    switch (action) {
      case 'list':
        result = await getCourseList(userId, weekday, week);
        break;
      case 'today':
        const today = new Date().getDay() || 7;
        result = await getCourseList(userId, today, week);
        break;
      case 'add':
        result = await addCourse(userId, courseData);
        break;
      case 'update':
        result = await updateCourse(courseId, courseData);
        break;
      case 'delete':
        result = await deleteCourse(courseId);
        break;
      default:
        result = { success: false, error: '未知操作' };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (err) {
    console.error('API 错误:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }

  // 辅助函数：执行 SQL
  async function executeSQL(sql, params = []) {
    const response = await fetch(
      `https://${envId}.service.tcloudbase.com/mysql/execute-sql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sql, params })
      }
    );

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'SQL执行失败');
    }
    return data.result;
  }

  // 获取课程列表
  async function getCourseList(userId, weekday, week) {
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

    const data = await executeSQL(sql, params);
    return { success: true, data: data || [] };
  }

  // 添加课程
  async function addCourse(userId, courseData) {
    const { courseName, teacherName, classroom, weekday, startSection, endSection, startWeek, endWeek, weekType } = courseData;

    const sql = `INSERT INTO courses (user_id, course_name, teacher_name, classroom, weekday, start_section, end_section, start_week, end_week, week_type)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    await executeSQL(sql, [userId, courseName, teacherName, classroom, weekday, startSection, endSection, startWeek, endWeek, weekType || 'all']);

    return { success: true, message: '课程添加成功' };
  }

  // 更新课程
  async function updateCourse(courseId, courseData) {
    const fields = [];
    const params = [];

    for (const [key, value] of Object.entries(courseData)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (fields.length === 0) {
      return { success: false, error: '没有要更新的字段' };
    }

    params.push(courseId);
    const sql = `UPDATE courses SET ${fields.join(', ')} WHERE id = ?`;

    await executeSQL(sql, params);
    return { success: true, message: '课程更新成功' };
  }

  // 删除课程
  async function deleteCourse(courseId) {
    await executeSQL('DELETE FROM courses WHERE id = ?', [courseId]);
    return { success: true, message: '课程删除成功' };
  }
};
