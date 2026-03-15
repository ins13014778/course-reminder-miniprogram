// pages/courses/courses.js
Page({
  data: {
    selectedWeekday: 1,
    courses: [],
    loading: false,
    colors: ['#4F46E5', '#07c160', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
  },

  onLoad() {
    const now = new Date();
    const weekday = now.getDay() || 7;
    this.setData({ selectedWeekday: weekday });
    this.loadCourses();
  },

  onShow() {
    this.loadCourses();
  },

  onWeekdayChange(e) {
    const weekday = e.currentTarget.dataset.weekday;
    this.setData({ selectedWeekday: weekday });
    this.loadCourses();
  },

  loadCourses() {
    this.setData({ loading: true });
    // TODO: 从后端API获取课程数据
    const demoCourses = [
      { id: 1, courseName: '数据结构', teacherName: '张老师', classroom: 'A301', startSection: 1, endSection: 2, startWeek: 1, endWeek: 16 },
      { id: 2, courseName: '操作系统', teacherName: '李老师', classroom: 'B205', startSection: 3, endSection: 4, startWeek: 1, endWeek: 16 },
    ];
    const filtered = demoCourses.filter(c => c.id); // 实际按 weekday 过滤
    setTimeout(() => {
      this.setData({ courses: demoCourses, loading: false });
    }, 300);
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
