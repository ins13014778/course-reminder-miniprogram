Page({
  data: {
    user: {},
    todayCourses: [],
    currentWeek: 1,
    totalWeeks: 18,
    weekdayText: '',
    isLoggedIn: false,
    colors: ['#C96F3B', '#2E6B5B', '#7A6854', '#B65429', '#476356', '#8C7B68']
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
    const currentWeek = this.calculateCurrentWeek();

    this.setData({ user, weekdayText, currentWeek, isLoggedIn });

    if (!isLoggedIn) {
      this.setData({ todayCourses: [] });
      return;
    }

    if (user && user.id) {
      this.loadTodayCourses(user.id, weekday, currentWeek);
      return;
    }

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
          const nextUser = Object.assign({}, user, { id: userId });
          wx.setStorageSync('user', nextUser);
          this.setData({ user: nextUser });
          this.loadTodayCourses(userId, weekday, currentWeek);
        }
      }
    });
  },

  calculateCurrentWeek() {
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
          const courses = result.data.map((course, index) => ({
            id: course.id,
            courseName: course.course_name,
            classroom: course.location,
            teacherName: course.teacher,
            startTime: this.sectionToTime(course.start_section, true),
            endTime: this.sectionToTime(course.end_section, false),
            color: course.color || this.data.colors[index % this.data.colors.length]
          }));
          this.setData({ todayCourses: courses });
        } else {
          this.setData({ todayCourses: [] });
        }
      },
      fail: () => {
        this.setData({ todayCourses: [] });
      }
    });
  },

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
      10: ['19:55', '20:40']
    };
    const time = timeMap[section];
    if (!time) return isStart ? '08:00' : '08:45';
    return isStart ? time[0] : time[1];
  },

  onWeekChange(e) {
    const week = e.currentTarget.dataset.week;
    this.setData({ currentWeek: week });
    const user = wx.getStorageSync('user') || {};
    const token = wx.getStorageSync('token');
    const weekday = new Date().getDay() || 7;

    if (user && user.id) {
      this.loadTodayCourses(user.id, weekday, week);
      return;
    }

    if (token) {
      wx.cloud.callFunction({
        name: 'db-query',
        data: {
          sql: 'SELECT id FROM users WHERE openid = ? LIMIT 1',
          params: [token]
        },
        success: (res) => {
          const result = res.result;
          if (result && result.success && result.data && result.data.length > 0) {
            this.loadTodayCourses(result.data[0].id, weekday, week);
          }
        }
      });
    }
  },

  goToIndex() {},
  goToCourses() { wx.navigateTo({ url: '/pages/courses/courses' }); },
  goToImport() { wx.navigateTo({ url: '/pages/import/import' }); },
  goToSettings() { wx.navigateTo({ url: '/pages/settings/settings' }); },
  goToProfile() { wx.navigateTo({ url: '/pages/profile/profile' }); },
  goToLogin() { wx.navigateTo({ url: '/pages/login/login' }); }
});
