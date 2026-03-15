// pages/courses/courses.js
Page({
  data: {
    selectedWeekday: 1,
    courses: [],
    loading: false,
    colors: ['#4F46E5', '#07c160', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
  },

  onLoad() {
    this.checkAuth();
  },

  onShow() {
    this.checkAuth();
  },

  checkAuth() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    const now = new Date();
    const weekday = now.getDay() || 7;
    this.setData({ selectedWeekday: weekday });
    this.loadCourses();
  },

  onWeekdayChange(e) {
    const weekday = e.currentTarget.dataset.weekday;
    this.setData({ selectedWeekday: weekday });
    this.loadCourses();
  },

  loadCourses() {
    const user = wx.getStorageSync('user');
    const token = wx.getStorageSync('token');

    if (user && user.id) {
      this.fetchCourses(user.id);
    } else if (token) {
      wx.cloud.callFunction({
        name: 'db-query',
        data: { sql: 'SELECT id FROM users WHERE openid = ? LIMIT 1', params: [token] },
        success: (res) => {
          const result = res.result;
          if (result && result.success && result.data && result.data.length > 0) {
            const userId = result.data[0].id;
            wx.setStorageSync('user', Object.assign({}, user || {}, { id: userId }));
            this.fetchCourses(userId);
          } else {
            this.setData({ courses: [], loading: false });
          }
        },
        fail: () => this.setData({ courses: [], loading: false })
      });
    } else {
      this.setData({ courses: [], loading: false });
    }
  },

  fetchCourses(userId) {
    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'db-query',
      data: {
        sql: 'SELECT * FROM courses WHERE user_id = ? AND weekday = ? ORDER BY start_section',
        params: [userId, this.data.selectedWeekday]
      },
      success: (res) => {
        const result = res.result;
        if (result && result.success && result.data) {
          const courses = result.data.map((c, i) => ({
            id: c.id,
            courseName: c.course_name,
            teacherName: c.teacher,
            classroom: c.location,
            startSection: c.start_section,
            endSection: c.end_section,
            startWeek: c.start_week,
            endWeek: c.end_week,
            color: c.color || this.data.colors[i % this.data.colors.length]
          }));
          this.setData({ courses, loading: false });
        } else {
          this.setData({ courses: [], loading: false });
        }
      },
      fail: (err) => {
        console.error('[Courses] 加载课程失败:', err);
        this.setData({ courses: [], loading: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    });
  },

  onCourseClick(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/course-detail/course-detail?id=${id}` });
  },

  goToIndex() { wx.switchTab({ url: '/pages/index/index' }); },
  goToCourses() { },
  goToImport() { wx.navigateTo({ url: '/pages/import/import' }); },
  goToProfile() { wx.navigateTo({ url: '/pages/profile/profile' }); }
});
