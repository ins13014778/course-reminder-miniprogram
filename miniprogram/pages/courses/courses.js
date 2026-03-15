const TIME_SLOT_GROUPS = [
  {
    key: 'morning',
    label: '上午',
    slots: [
      { start: 1, end: 2, label: '第1-2节', time: '08:00-09:40' },
      { start: 3, end: 4, label: '第3-4节', time: '10:00-11:40' }
    ]
  },
  {
    key: 'afternoon',
    label: '下午',
    slots: [
      { start: 5, end: 6, label: '第5-6节', time: '14:00-15:40' },
      { start: 7, end: 8, label: '第7-8节', time: '16:00-17:40' }
    ]
  },
  {
    key: 'evening',
    label: '晚上',
    slots: [
      { start: 9, end: 10, label: '第9-10节', time: '19:00-20:40' }
    ]
  }
];

function getDefaultSlot(startSection, endSection) {
  for (const group of TIME_SLOT_GROUPS) {
    const found = group.slots.find((slot) => slot.start === startSection && slot.end === endSection);
    if (found) {
      return { periodKey: group.key, periodLabel: group.label, slot: found };
    }
  }

  return {
    periodKey: 'custom',
    periodLabel: '自定义',
    slot: {
      start: startSection || 1,
      end: endSection || 2,
      label: `第${startSection || 1}-${endSection || 2}节`,
      time: '自定义时间'
    }
  };
}

function formatCourseForView(course, color) {
  const slotInfo = getDefaultSlot(course.start_section, course.end_section);
  return {
    id: course.id,
    courseName: course.course_name,
    teacherName: course.teacher || '',
    classroom: course.location || '',
    startSection: course.start_section,
    endSection: course.end_section,
    startWeek: course.start_week,
    endWeek: course.end_week,
    color,
    periodKey: slotInfo.periodKey,
    periodLabel: slotInfo.periodLabel,
    timeLabel: slotInfo.slot.time,
    sectionLabel: slotInfo.slot.label
  };
}

function createEditorState(course) {
  const slotInfo = getDefaultSlot(course ? course.startSection : 1, course ? course.endSection : 2);
  return {
    id: course ? course.id : null,
    courseName: course ? course.courseName : '',
    teacherName: course ? course.teacherName : '',
    classroom: course ? course.classroom : '',
    periodKey: slotInfo.periodKey === 'custom' ? 'morning' : slotInfo.periodKey,
    startSection: slotInfo.slot.start,
    endSection: slotInfo.slot.end,
    startWeek: course ? course.startWeek : 1,
    endWeek: course ? course.endWeek : 18
  };
}

Page({
  data: {
    selectedWeekday: 1,
    courses: [],
    loading: false,
    isLoggedIn: false,
    colors: ['#C96F3B', '#2E6B5B', '#7A6854', '#B65429', '#476356', '#8C7B68'],
    periodGroups: TIME_SLOT_GROUPS,
    editorVisible: false,
    editorMode: 'add',
    editorTitle: '添加课程',
    editorCourse: createEditorState(null)
  },

  onLoad() {
    const weekday = new Date().getDay() || 7;
    this.setData({ selectedWeekday: weekday });
    this.loadCourses();
  },

  onShow() {
    this.loadCourses();
  },

  onWeekdayChange(e) {
    this.setData({ selectedWeekday: Number(e.currentTarget.dataset.weekday) });
    this.loadCourses();
  },

  loadCourses() {
    const user = wx.getStorageSync('user');
    const token = wx.getStorageSync('token');
    const isLoggedIn = !!token;
    this.setData({ isLoggedIn });

    if (!isLoggedIn) {
      this.setData({ courses: [], loading: false });
      return;
    }

    if (user && user.id) {
      this.fetchCourses(user.id);
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
          wx.setStorageSync('user', Object.assign({}, user || {}, { id: userId }));
          this.fetchCourses(userId);
        } else {
          this.setData({ courses: [], loading: false });
        }
      },
      fail: () => this.setData({ courses: [], loading: false })
    });
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
          const courses = result.data.map((course, index) =>
            formatCourseForView(course, course.color || this.data.colors[index % this.data.colors.length])
          );
          this.setData({ courses, loading: false });
        } else {
          this.setData({ courses: [], loading: false });
        }
      },
      fail: () => {
        this.setData({ courses: [], loading: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    });
  },

  onCourseClick(e) {
    this.openEditor(e.currentTarget.dataset.course, 'edit');
  },

  onAddCourse() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    this.openEditor(null, 'add');
  },

  openEditor(course, mode) {
    this.setData({
      editorVisible: true,
      editorMode: mode,
      editorTitle: mode === 'edit' ? '修改课程' : '添加课程',
      editorCourse: createEditorState(course)
    });
  },

  closeEditor() {
    this.setData({ editorVisible: false });
  },

  onEditorFieldChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`editorCourse.${field}`]: e.detail.value });
  },

  onPeriodChange(e) {
    const group = TIME_SLOT_GROUPS.find((item) => item.key === e.currentTarget.dataset.period);
    if (!group) return;
    const slot = group.slots[0];
    this.setData({
      'editorCourse.periodKey': group.key,
      'editorCourse.startSection': slot.start,
      'editorCourse.endSection': slot.end
    });
  },

  onSlotChange(e) {
    this.setData({
      'editorCourse.startSection': Number(e.currentTarget.dataset.start),
      'editorCourse.endSection': Number(e.currentTarget.dataset.end)
    });
  },

  saveEditorCourse() {
    const editor = this.data.editorCourse;
    const courseName = String(editor.courseName || '').trim();
    const teacher = String(editor.teacherName || '').trim();
    const classroom = String(editor.classroom || '').trim();
    const startWeek = parseInt(editor.startWeek, 10) || 1;
    const endWeek = parseInt(editor.endWeek, 10) || 18;
    const startSection = parseInt(editor.startSection, 10) || 1;
    const endSection = parseInt(editor.endSection, 10) || 2;

    if (!courseName) {
      wx.showToast({ title: '请输入课程名称', icon: 'none' });
      return;
    }

    if (startWeek > endWeek) {
      wx.showToast({ title: '周次范围不正确', icon: 'none' });
      return;
    }

    if (editor.id) {
      this.updateCourse(editor.id, courseName, teacher, classroom, startSection, endSection, startWeek, endWeek);
    } else {
      this.addCourse(courseName, teacher, classroom, startSection, endSection, startWeek, endWeek);
    }
  },

  addCourse(courseName, teacher, classroom, startSection, endSection, startWeek, endWeek) {
    const user = wx.getStorageSync('user');
    const token = wx.getStorageSync('token');
    wx.showLoading({ title: '添加中...' });
    wx.cloud.callFunction({
      name: 'db-query',
      data: {
        sql: 'INSERT INTO courses (user_id, course_name, teacher, location, weekday, start_section, end_section, start_week, end_week, _openid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        params: [user.id, courseName, teacher, classroom, this.data.selectedWeekday, startSection, endSection, startWeek, endWeek, token]
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          this.setData({ editorVisible: false });
          wx.showToast({ title: '添加成功', icon: 'success' });
          this.loadCourses();
        } else {
          wx.showToast({ title: '添加失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '添加失败', icon: 'none' });
      }
    });
  },

  updateCourse(id, courseName, teacher, classroom, startSection, endSection, startWeek, endWeek) {
    wx.showLoading({ title: '保存中...' });
    wx.cloud.callFunction({
      name: 'db-query',
      data: {
        sql: 'UPDATE courses SET course_name = ?, teacher = ?, location = ?, start_section = ?, end_section = ?, start_week = ?, end_week = ? WHERE id = ?',
        params: [courseName, teacher, classroom, startSection, endSection, startWeek, endWeek, id]
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          this.setData({ editorVisible: false });
          wx.showToast({ title: '保存成功', icon: 'success' });
          this.loadCourses();
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    });
  },

  onDeleteCourse(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这门课程吗？',
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '删除中...' });
        wx.cloud.callFunction({
          name: 'db-query',
          data: {
            sql: 'DELETE FROM courses WHERE id = ?',
            params: [id]
          },
          success: (deleteRes) => {
            wx.hideLoading();
            if (deleteRes.result && deleteRes.result.success) {
              wx.showToast({ title: '删除成功', icon: 'success' });
              this.loadCourses();
            } else {
              wx.showToast({ title: '删除失败', icon: 'none' });
            }
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        });
      }
    });
  },

  noop() {},
  goToIndex() { wx.navigateTo({ url: '/pages/index/index' }); },
  goToCourses() {},
  goToImport() { wx.navigateTo({ url: '/pages/import/import' }); },
  goToProfile() { wx.navigateTo({ url: '/pages/profile/profile' }); },
  goToLogin() { wx.navigateTo({ url: '/pages/login/login' }); }
});
