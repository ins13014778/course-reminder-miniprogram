import { courseService } from '../../services/course';

Page({
  data: {
    course: null,
    editing: false,
  },

  onLoad(options: any) {
    if (options.id) {
      this.loadCourse(options.id);
    }
  },

  async loadCourse(id: string) {
    const res: any = await courseService.getCourses();
    const course = res.find((c: any) => c.id == id);
    this.setData({ course });
  },

  onEdit() {
    this.setData({ editing: true });
  },

  async onSave() {
    const { course } = this.data;
    await courseService.updateCourse(course.id, course);
    wx.showToast({ title: '保存成功', icon: 'success' });
    this.setData({ editing: false });
  },

  async onDelete() {
    const res = await wx.showModal({ title: '确认删除？' });
    if (res.confirm) {
      await courseService.deleteCourse(this.data.course.id);
      wx.navigateBack();
    }
  },
});
