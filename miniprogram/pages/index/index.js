Page({
  data: {
    user: {},
    todayCourses: [],
    currentWeek: 1,
    totalWeeks: 18,
    weekdayText: '',
    isLoggedIn: false,
    colors: ['#4F46E5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const user = wx.getStorageSync('user') || {};
    const token = wx.getStorageSync('token');
    const isLoggedIn = !!token;
    const weekdays = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const now = new Date();
    const weekday = now.getDay() || 7;
    const weekdayText = weekdays[weekday];

    // 计算当前周次（基于学期开始日期，默认第1周）
    const currentWeek = this.calculateCurrentWeek();

    this.setData({ user, weekdayText, currentWeek, isLoggedIn });

    if (!isLoggedIn) {
      this.setData({ todayCourses: [] });
      return;
    }

    if (user && user.id) {
      this.loadTodayCourses(user.id, weekday, currentWeek);
    } else if (token) {
      // user.id 不存在，通过 openid 查找
      wx.cloud.callFunction({
        name: 'db-query',
        data: { sql: 'SELECT id FROM users WHERE openid = ? LIMIT 1', params: [token] },
        success: (res) => {
          const result = res.result;
          if (result && result.success && result.data && result.data.length > 0) {
            const userId = result.data[0].id;
            wx.setStorageSync('user', Object.assign({}, user, { id: userId }));
            this.setData({ user: Object.assign({}, user, { id: userId }) });
            this.loadTodayCourses(userId, weekday, currentWeek);
          }
        }
      });
    }
  },

  calculateCurrentWeek() {
    // 从本地存储获取学期开始日期，默认当前为第1周
    const semesterStart = wx.getStorageSync('semesterStart');
    if (!semesterStart) return 1;

    const start = new Date(semesterStart);
    const now = new Date();
    const diffMs = now - start;
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
    return Math.max(1, Math.min(diffWeeks, this.data.totalWeeks));
  },

  loadTodayCourses(userId, weekday, week) {
    if (!userId) {
      this.setData({ todayCourses: [] });
      return;
    }

    wx.cloud.callFunction({
      name: 'db-query',
      data: {
        sql: 'SELECT * FROM courses WHERE user_id = ? AND weekday = ? AND start_week <= ? AND end_week >= ? ORDER BY start_section',
        params: [userId, weekday, week, week]
      },
      success: (res) => {
        const result = res.result;
        if (result && result.success && result.data) {
          const courses = result.data.map((c, i) => ({
            id: c.id,
            courseName: c.course_name,
            classroom: c.location,
            teacherName: c.teacher,
            startTime: this.sectionToTime(c.start_section, true),
            endTime: this.sectionToTime(c.end_section, false),
            color: c.color || this.data.colors[i % this.data.colors.length]
          }));
          this.setData({ todayCourses: courses });
        } else {
          this.setData({ todayCourses: [] });
        }
      },
      fail: (err) => {
        console.error('[Index] 加载课程失败:', err);
        this.setData({ todayCourses: [] });
      }
    });
  },

  // 节次转时间
  sectionToTime(section, isStart) {
    const timeMap = {
      1: ['08:00', '08:45'],
      2: ['08:55', '09:40'],
      3: ['10:00', '10:45'],
      4: ['10:55', '11:40'],
      5: ['14:00', '14:45'],
      6: ['14:55', '15:40'],
      7: ['16:00', '16:45'],
      8: ['16:55', '17:40'],
      9: ['19:00', '19:45'],
      10: ['19:55', '20:40'],
    };
    const t = timeMap[section];
    if (!t) return isStart ? '08:00' : '08:45';
    return isStart ? t[0] : t[1];
  },

  onWeekChange(e) {
    const week = e.currentTarget.dataset.week;
    this.setData({ currentWeek: week });
    const user = wx.getStorageSync('user') || {};
    const token = wx.getStorageSync('token');
    const weekday = new Date().getDay() || 7;
    if (user && user.id) {
      this.loadTodayCourses(user.id, weekday, week);
    } else if (token) {
      wx.cloud.callFunction({
        name: 'db-query',
        data: { sql: 'SELECT id FROM users WHERE openid = ? LIMIT 1', params: [token] },
        success: (res) => {
          const result = res.result;
          if (result && result.success && result.data && result.data.length > 0) {
            this.loadTodayCourses(result.data[0].id, weekday, week);
          }
        }
      });
    }
  },

  goToIndex() { },
  goToCourses() { wx.navigateTo({ url: '/pages/courses/courses' }); },
  goToImport() { wx.navigateTo({ url: '/pages/import/import' }); },
  goToSettings() { wx.navigateTo({ url: '/pages/settings/settings' }); },
  goToProfile() { wx.navigateTo({ url: '/pages/profile/profile' }); },
  goToLogin() { wx.navigateTo({ url: '/pages/login/login' }); },
});
