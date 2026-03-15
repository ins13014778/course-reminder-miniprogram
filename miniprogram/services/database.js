/**
 * CloudBase 数据库服务层
 * 使用云函数操作 MySQL 数据库
 */

/**
 * ==================== 用户相关 API ====================
 */

/**
 * 获取或创建用户
 * @param {string} openid - 微信 openid
 * @param {object} userInfo - 用户信息
 */
async function getOrCreateUser(openid, userInfo = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'user-getOrCreate',
      data: { openid, userInfo },
      success: (res) => {
        console.log('[DB] 云函数返回:', res.result);
        resolve(res.result);
      },
      fail: (err) => {
        console.error('[DB] 获取用户失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 更新用户信息
 * @param {number} userId - 用户ID
 * @param {object} data - 要更新的字段
 */
async function updateUser(userId, data) {
  const db = getDB();
  return await db.from('users').update(data).eq('id', userId);
}

/**
 * 获取用户信息
 * @param {number} userId - 用户ID
 */
async function getUserInfo(userId) {
  const db = getDB();
  const { data, error } = await db.from('users').select('*').eq('id', userId);
  return { success: !error, user: data?.[0] || null };
}

/**
 * ==================== 课程相关 API ====================
 */

/**
 * 获取用户课程列表
 * @param {number} userId - 用户ID
 * @param {number} weekday - 星期几 (1-7)
 * @param {number} week - 周次
 */
async function getCourses(userId, weekday = null, week = null) {
  const db = getDB();
  let query = db.from('courses').select('*').eq('user_id', userId);

  if (weekday) {
    query = query.eq('weekday', weekday);
  }

  if (week) {
    query = query.lte('start_week', week).gte('end_week', week);
  }

  const { data, error } = await query.order('weekday').order('start_section');
  return { success: !error, courses: data || [] };
}

/**
 * 获取今日课程
 * @param {number} userId - 用户ID
 */
async function getTodayCourses(userId) {
  const date = new Date();
  const weekday = date.getDay() || 7;

  const db = getDB();
  const { data, error } = await db.from('courses')
    .select('*')
    .eq('user_id', userId)
    .eq('weekday', weekday)
    .order('start_section');

  return { success: !error, courses: data || [] };
}

/**
 * 添加课程
 * @param {number} userId - 用户ID
 * @param {object} course - 课程信息
 */
async function addCourse(userId, course) {
  const db = getDB();
  return await db.from('courses').insert({
    user_id: userId,
    course_name: course.course_name,
    teacher_name: course.teacher_name,
    classroom: course.classroom,
    weekday: course.weekday,
    start_section: course.start_section,
    end_section: course.end_section,
    start_week: course.start_week,
    end_week: course.end_week,
    week_type: course.week_type || 'all'
  });
}

/**
 * 更新课程
 * @param {number} courseId - 课程ID
 * @param {object} data - 要更新的字段
 */
async function updateCourse(courseId, data) {
  const db = getDB();
  return await db.from('courses').update(data).eq('id', courseId);
}

/**
 * 删除课程
 * @param {number} courseId - 课程ID
 */
async function deleteCourse(courseId) {
  const db = getDB();
  return await db.from('courses').delete().eq('id', courseId);
}

/**
 * ==================== 导入任务 API ====================
 */

/**
 * 创建导入任务
 * @param {number} userId - 用户ID
 * @param {string} imageUrl - 课程表图片URL
 */
async function createImportTask(userId, imageUrl) {
  const db = getDB();
  return await db.from('import_tasks').insert({
    user_id: userId,
    image_url: imageUrl,
    status: 'pending'
  });
}

/**
 * 获取导入任务状态
 * @param {number} taskId - 任务ID
 */
async function getImportTaskStatus(taskId) {
  const db = getDB();
  const { data, error } = await db.from('import_tasks').select('*').eq('id', taskId);
  return { success: !error, task: data?.[0] || null };
}

/**
 * ==================== 云存储 API ====================
 */

/**
 * 上传文件到云存储
 * @param {string} filePath - 本地文件路径
 * @param {string} cloudPath - 云端存储路径
 */
function uploadFile(filePath, cloudPath) {
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: (res) => {
        console.log('[CloudStorage] 上传成功:', res.fileID);
        resolve(res.fileID);
      },
      fail: (err) => {
        console.error('[CloudStorage] 上传失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 获取临时文件链接
 * @param {string} fileId - 云端文件ID
 */
function getTempFileURL(fileId) {
  return new Promise((resolve, reject) => {
    wx.cloud.getTempFileURL({
      fileList: [fileId],
      success: (res) => {
        const url = res.fileList[0]?.tempFileURL;
        if (url) {
          resolve(url);
        } else {
          reject(new Error('获取临时链接失败'));
        }
      },
      fail: reject
    });
  });
}

/**
 * ==================== 工具函数 ====================
 */

/**
 * 初始化 CloudBase（已在 app.js 中初始化）
 */
function initCloud() {
  console.log('[CloudBase] 已在 app.js 中初始化');
}

/**
 * 检查登录状态并获取 openid
 */
function getOpenid() {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: (res) => {
        console.log('[Login] 获取 openid 成功:', res.result.openid);
        resolve(res.result.openid);
      },
      fail: (err) => {
        console.error('[Login] 获取 openid 失败:', err);
        reject(err);
      }
    });
  });
}

module.exports = {
  initCloud,
  getOpenid,
  // 用户
  getOrCreateUser,
  updateUser,
  getUserInfo,
  // 课程
  getCourses,
  getTodayCourses,
  addCourse,
  updateCourse,
  deleteCourse,
  // 导入
  createImportTask,
  getImportTaskStatus,
  // 云存储
  uploadFile,
  getTempFileURL
};
