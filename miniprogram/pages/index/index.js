Page({
  data: {
    user: {},
    todayCourses: [],
    currentWeek: 8,
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
    // 模拟今日课程数据（实际从API获取）
    const demoCourses = [
      { id: 1, courseName: '数据结构', classroom: 'A301', teacherName: '张老师', startTime: '08:00', endTime: '09:35', color: '#4F46E5' },
      { id: 2, courseName: '操作系统', classroom: 'B205', teacherName: '李老师', startTime: '10:00', endTime: '11:35', color: '#10b981' },
      { id: 3, courseName: '计算机网络', classroom: 'C402', teacherName: '王老师', startTime: '14:00', endTime: '15:35', color: '#f59e0b' },
    ];
    this.setData({ user, todayCourses: demoCourses });
  },

  onWeekChange(e) {
    const week = e.currentTarget.dataset.week;
    this.setData({ currentWeek: week });
    // TODO: 重新加载该周课程数据
  },

  goToIndex() { },
  goToCourses() { wx.navigateTo({ url: '/pages/courses/courses' }); },
  goToImport() { wx.navigateTo({ url: '/pages/import/import' }); },
  goToSettings() { wx.navigateTo({ url: '/pages/settings/settings' }); },
  goToProfile() { wx.navigateTo({ url: '/pages/profile/profile' }); },
});
