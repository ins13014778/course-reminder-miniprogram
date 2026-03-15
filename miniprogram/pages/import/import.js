const config = require('../../config/index');

// OCR API配置
const OCR_CONFIG = {
  baseUrl: 'https://api.scnet.cn/api/llm/v1',
  recognizeEndpoint: '/ocr/recognize',
  maxFileSize: 10 * 1024 * 1024,
  supportedFormats: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp'],
  defaultApiKey: 'sk-NjEwLTExMTk0NDQzMzA3LTE3NzMzMTM3MjA5NTM=',
};

Page({
  data: {
    status: 'idle',       // idle | uploading | success | failed | saving
    recognizedText: '',
    parsedCourses: [],     // 解析出的课程列表
    errorMsg: '',
    savedCount: 0,
  },

  _rawOcrText: '',

  onLoad() {
    this.checkAuth();
  },

  onShow() {},

  checkAuth() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.reLaunch({ url: '/pages/login/login' });
    }
  },

  getApiKey() {
    return OCR_CONFIG.defaultApiKey;
  },

  // ==================== 图片选择与上传 ====================

  onChooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        const tempFileSize = res.tempFiles[0].size;
        if (tempFileSize > 1024 * 1024) {
          this.compressImage(tempFilePath);
        } else {
          this.uploadImage(tempFilePath);
        }
      },
      fail: () => {
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
  },

  compressImage(filePath) {
    wx.compressImage({
      src: filePath,
      quality: 80,
      success: (res) => this.uploadImage(res.tempFilePath),
      fail: () => this.uploadImage(filePath)
    });
  },

  uploadImage(filePath) {
    // 验证
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    if (!OCR_CONFIG.supportedFormats.includes(ext)) {
      wx.showToast({ title: '不支持的图片格式', icon: 'none' });
      return;
    }

    const apiKey = this.getApiKey();
    this.setData({ status: 'uploading', errorMsg: '', parsedCourses: [], recognizedText: '' });

    wx.uploadFile({
      url: `${OCR_CONFIG.baseUrl}${OCR_CONFIG.recognizeEndpoint}`,
      filePath,
      name: 'file',
      formData: { ocrType: 'GENERAL' },
      header: { 'Authorization': `Bearer ${apiKey}` },
      timeout: 120000,
      success: (res) => this.handleResponse(res),
      fail: (err) => {
        console.error('上传失败:', err);
        this.setData({ status: 'failed', errorMsg: '上传失败: ' + (err.errMsg || '网络错误') });
      }
    });
  },

  // ==================== OCR 响应处理 ====================

  handleResponse(res) {
    try {
      const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;

      if (data.error) {
        this.setData({ status: 'failed', errorMsg: data.error.message || '识别失败' });
        return;
      }

      const successCodes = ['0', '200', 0, 200, 'success'];
      if (!successCodes.includes(data.code) && data.code !== undefined) {
        this.setData({ status: 'failed', errorMsg: (data.msg || '识别失败') + ' (错误码: ' + data.code + ')' });
        return;
      }

      // 提取所有识别文本
      let allText = '';
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach(item => {
          if (item.result && Array.isArray(item.result)) {
            item.result.forEach(r => {
              if (r.elements && r.elements.text && Array.isArray(r.elements.text)) {
                r.elements.text.forEach(t => {
                  allText += t.text + '\n';
                });
              }
            });
          }
        });
      }

      this._rawOcrText = allText;
      const parsedCourses = this.parseScheduleText(allText);

      this.setData({
        status: 'success',
        recognizedText: allText || '(无文字识别结果)',
        parsedCourses
      });

      if (parsedCourses.length > 0) {
        wx.showToast({ title: `识别到 ${parsedCourses.length} 门课程`, icon: 'success' });
      } else {
        wx.showToast({ title: '未能解析出课程，请检查图片', icon: 'none', duration: 2500 });
      }
    } catch (e) {
      console.error('解析响应失败:', e);
      this.setData({ status: 'failed', errorMsg: '响应解析失败: ' + e.message });
    }
  },

  // ==================== 课表文本解析 ====================

  parseScheduleText(text) {
    if (!text) return [];

    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const courses = [];
    const coursePattern = /^(.{2,20}?)$/; // 课程名一般2-20字
    const teacherPattern = /老师|教授|讲师|博士/;
    const roomPattern = /^[A-Za-z]?\d{2,4}$|教室|实验室|机房|楼/;
    const weekPattern = /(\d+)-(\d+)周/;
    const sectionPattern = /第?(\d+)-(\d+)节/;
    const weekdayPattern = /周([一二三四五六日天])/;

    const weekdayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7 };

    // 策略1: 尝试按"课程名\n老师\n教室"的块模式解析
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // 跳过表头行（星期一、星期二、节次等）
      if (/^(星期|周[一二三四五六日天]|第?\d+节|上午|下午|晚上|时间)/.test(line)) {
        i++;
        continue;
      }

      // 跳过纯数字行
      if (/^\d+$/.test(line)) {
        i++;
        continue;
      }

      // 检测是否是课程名（不是老师名、不是教室号）
      if (line.length >= 2 && !teacherPattern.test(line) && !roomPattern.test(line) && !/^\d/.test(line)) {
        const course = {
          course_name: line,
          teacher_name: '',
          classroom: '',
          weekday: 1,
          start_section: 1,
          end_section: 2,
          start_week: 1,
          end_week: 16,
          week_type: 'all'
        };

        // 向后看几行，提取老师和教室
        for (let j = 1; j <= 3 && (i + j) < lines.length; j++) {
          const next = lines[i + j];
          if (teacherPattern.test(next) && !course.teacher_name) {
            course.teacher_name = next;
          } else if ((roomPattern.test(next) || /^[A-Za-z]\d/.test(next)) && !course.classroom) {
            course.classroom = next;
          }
          // 提取周次信息
          const wm = next.match(weekPattern);
          if (wm) {
            course.start_week = parseInt(wm[1]);
            course.end_week = parseInt(wm[2]);
          }
          // 提取节次信息
          const sm = next.match(sectionPattern);
          if (sm) {
            course.start_section = parseInt(sm[1]);
            course.end_section = parseInt(sm[2]);
          }
          // 提取星期信息
          const dm = next.match(weekdayPattern);
          if (dm) {
            course.weekday = weekdayMap[dm[1]] || 1;
          }
        }

        // 也检查课程名本身是否包含附加信息（如 "高等数学 周一1-2节"）
        const wm2 = line.match(weekPattern);
        if (wm2) {
          course.start_week = parseInt(wm2[1]);
          course.end_week = parseInt(wm2[2]);
          course.course_name = line.replace(weekPattern, '').trim();
        }
        const dm2 = line.match(weekdayPattern);
        if (dm2) {
          course.weekday = weekdayMap[dm2[1]] || 1;
          course.course_name = course.course_name.replace(weekdayPattern, '').trim();
        }

        // 添加中文星期用于显示
        const weekdayNames = ['', '一', '二', '三', '四', '五', '六', '日'];
        course.weekdayName = weekdayNames[course.weekday] || '一';

        // 避免重复添加同名课程（同一天同一节次）
        const dup = courses.find(c =>
          c.course_name === course.course_name &&
          c.weekday === course.weekday &&
          c.start_section === course.start_section
        );
        if (!dup && course.course_name.length >= 2) {
          courses.push(course);
        }

        i += 2; // 跳过已处理的行
        continue;
      }

      i++;
    }

    // 如果块模式没解析出来，尝试按单行"课程名/老师/教室"格式
    if (courses.length === 0) {
      lines.forEach(line => {
        const parts = line.split(/[\/\\|,，、\t]+/).map(p => p.trim()).filter(p => p);
        if (parts.length >= 1 && parts[0].length >= 2 && !teacherPattern.test(parts[0]) && !/^\d/.test(parts[0])) {
          const course = {
            course_name: parts[0],
            teacher_name: parts.find(p => teacherPattern.test(p)) || '',
            classroom: parts.find(p => roomPattern.test(p) || /^[A-Za-z]\d/.test(p)) || '',
            weekday: 1,
            start_section: 1,
            end_section: 2,
            start_week: 1,
            end_week: 16,
            week_type: 'all'
          };
          const weekdayNames2 = ['', '一', '二', '三', '四', '五', '六', '日'];
          course.weekdayName = weekdayNames2[course.weekday] || '一';
          if (course.course_name.length >= 2) {
            courses.push(course);
          }
        }
      });
    }

    // 如果有多门课但都是weekday=1，尝试按顺序分配星期
    const allSameDay = courses.length > 1 && courses.every(c => c.weekday === 1);
    if (allSameDay) {
      // 按每天2门课分配
      const weekdayNames3 = ['', '一', '二', '三', '四', '五', '六', '日'];
      courses.forEach((c, idx) => {
        c.weekday = Math.min(Math.floor(idx / 2) + 1, 7);
        c.start_section = (idx % 2) * 2 + 1;
        c.end_section = c.start_section + 1;
        c.weekdayName = weekdayNames3[c.weekday] || '一';
      });
    }

    return courses;
  },

  // ==================== 确认导入（存入数据库） ====================

  onConfirm() {
    const courses = this.data.parsedCourses;
    if (!courses || courses.length === 0) {
      wx.showToast({ title: '没有可导入的课程', icon: 'none' });
      return;
    }

    const token = wx.getStorageSync('token');
    if (!token) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }

    const user = wx.getStorageSync('user');
    if (user && user.id) {
      // 直接使用缓存的 user.id
      this.saveCourses(user.id, courses);
    } else {
      // user.id 不存在，通过 openid 从数据库查找
      this.setData({ status: 'saving' });
      wx.showLoading({ title: '正在导入...' });

      wx.cloud.callFunction({
        name: 'db-query',
        data: {
          sql: 'SELECT id FROM users WHERE openid = ? LIMIT 1',
          params: [token]
        },
        success: (res) => {
          const result = res.result;
          if (result && result.success && result.data && result.data.length > 0) {
            const userId = result.data[0].id;
            // 同时更新本地缓存
            wx.setStorageSync('user', Object.assign({}, user || {}, { id: userId }));
            wx.hideLoading();
            this.saveCourses(userId, courses);
          } else {
            wx.hideLoading();
            wx.showToast({ title: '用户信息异常，请重新登录', icon: 'none' });
            setTimeout(() => wx.reLaunch({ url: '/pages/login/login' }), 1500);
          }
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({ title: '查询用户失败', icon: 'none' });
          this.setData({ status: 'success' });
        }
      });
    }
  },

  saveCourses(userId, courses) {
    this.setData({ status: 'saving' });
    wx.showLoading({ title: '正在导入...' });

    const token = wx.getStorageSync('token') || '';

    // 构建批量插入 SQL（包含 _openid 字段，NOT NULL）
    const values = courses.map(c => {
      return [
        userId,
        c.course_name,
        c.teacher_name || '',
        c.classroom || '',
        c.weekday,
        c.start_section,
        c.end_section,
        c.start_week,
        c.end_week,
        token
      ];
    });

    const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const flatParams = values.flat();

    wx.cloud.callFunction({
      name: 'db-query',
      data: {
        sql: `INSERT INTO courses (user_id, course_name, teacher, location, weekday, start_section, end_section, start_week, end_week, _openid) VALUES ${placeholders}`,
        params: flatParams
      },
      success: (res) => {
        wx.hideLoading();
        const result = res.result;
        if (result && result.success) {
          const count = courses.length;
          this.setData({ status: 'idle', savedCount: count, parsedCourses: [], recognizedText: '' });
          wx.showModal({
            title: '导入成功',
            content: `已成功导入 ${count} 门课程到你的课表`,
            showCancel: false,
            success: () => {
              wx.navigateTo({ url: '/pages/courses/courses' });
            }
          });
        } else {
          this.setData({ status: 'failed', errorMsg: '保存失败: ' + (result?.message || '数据库错误') });
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('[Import] 保存课程失败:', err);
        this.setData({ status: 'failed', errorMsg: '保存失败: ' + (err.errMsg || '云函数调用失败') });
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    });
  },

  onRetry() {
    this.setData({ status: 'idle', errorMsg: '', parsedCourses: [], recognizedText: '' });
  },

  // 底部导航
  goToIndex() { wx.navigateTo({ url: '/pages/index/index' }); },
  goToCourses() { wx.navigateTo({ url: '/pages/courses/courses' }); },
  goToImport() { },
  goToProfile() { wx.navigateTo({ url: '/pages/profile/profile' }); },
});
