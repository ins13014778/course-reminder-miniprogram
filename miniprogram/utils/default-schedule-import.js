const { DEFAULT_SCHEDULE_TEMPLATE_KEY, setDefaultScheduleEnabled } = require('./default-schedule');
const { getLoginToken, getStoredUser, hasLoginSession, updateStoredUser, clearLoginSession } = require('./auth');

function callDbQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'db-query',
      data: { sql, params },
      success: (res) => {
        const result = res.result;
        if (result && result.success) {
          resolve(result.data || []);
          return;
        }
        reject(new Error((result && result.message) || '数据库操作失败'));
      },
      fail: reject
    });
  });
}

async function ensureUserId() {
  const token = getLoginToken();
  if (!hasLoginSession() || !token) {
    const error = new Error('请先登录');
    error.code = 'NO_AUTH';
    throw error;
  }

  const cachedUser = getStoredUser();
  if (cachedUser.id) {
    return { userId: cachedUser.id, token };
  }

  const rows = await callDbQuery('SELECT id FROM users WHERE openid = ? LIMIT 1', [token]);
  if (!rows.length) {
    clearLoginSession();
    const error = new Error('未找到用户信息');
    error.code = 'NO_USER';
    throw error;
  }

  updateStoredUser({ id: rows[0].id });
  return { userId: rows[0].id, token };
}

async function importDefaultTemplateCourses(templateKey = DEFAULT_SCHEDULE_TEMPLATE_KEY) {
  const { userId, token } = await ensureUserId();
  const templateRows = await callDbQuery(
    `SELECT course_name, teacher_name, classroom, weekday, start_section, end_section, start_time, end_time, start_week, end_week
     FROM course_templates
     WHERE template_key = ? AND is_active = 1
     ORDER BY sort_order ASC, weekday ASC, start_section ASC`,
    [templateKey]
  );

  if (!templateRows.length) {
    const error = new Error('默认课表模板为空');
    error.code = 'EMPTY_TEMPLATE';
    throw error;
  }

  await callDbQuery('DELETE FROM courses WHERE user_id = ?', [userId]);

  const values = templateRows.map((course) => [
    userId,
    course.course_name,
    course.teacher_name || '',
    course.classroom || '',
      course.weekday,
      course.start_section,
      course.end_section,
      course.start_time || null,
      course.end_time || null,
      course.start_week,
      course.end_week,
      token
  ]);

  const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
  const params = values.reduce((all, item) => all.concat(item), []);

  await callDbQuery(
    `INSERT INTO courses
      (user_id, course_name, teacher, location, weekday, start_section, end_section, start_time, end_time, start_week, end_week, _openid)
     VALUES ${placeholders}`,
    params
  );

  setDefaultScheduleEnabled(false);

  return {
    count: templateRows.length,
    userId
  };
}

module.exports = {
  importDefaultTemplateCourses
};
