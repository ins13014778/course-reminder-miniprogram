import { courseService } from '../../services/course';

Page({
  data: {
    courses: [],
    loading: true,
  },

  onLoad() {
    this.loadCourses();
  },

  async loadCourses() {
    try {
      const res: any = await courseService.getCourses();
      this.setData({ courses: res, loading: false });
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  onAddCourse() {
    wx.navigateTo({ url: '/pages/import/import' });
  },

  onCourseClick(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/course-detail/course-detail?id=${id}` });
  },
});
