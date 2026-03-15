// 云函数: addCourse - 添加课程
// 部署到 CloudBase 云函数

exports.main = async (event, context) => {
  const { userId, courseName, teacherName, classroom, weekday, startSection, endSection, startWeek, endWeek, weekType } = event;

  console.log('添加课程参数:', event);

  const cloudbase = require('@cloudbase/node-sdk');
  const app = cloudbase.init({
    env: 'c-66-7gfze7g4075f38c7'
  });

  try {
    // 构建插入 SQL
    const sql = `INSERT INTO courses (user_id, course_name, teacher_name, classroom, weekday, start_section, end_section, start_week, end_week, week_type)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      userId,
      courseName,
      teacherName || null,
      classroom || null,
      weekday,
      startSection,
      endSection,
      startWeek,
      endWeek,
      weekType || 'all'
    ];

    // 执行 SQL 插入
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
      data: res,
      message: '课程添加成功'
    };
  } catch (err) {
    console.error('添加课程失败:', err);
    return {
      success: false,
      error: err.message,
      message: '添加失败'
    };
  }
};
