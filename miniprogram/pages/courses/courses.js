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
      return { periodLabel: group.label, slot: found };
    }
  }

  return {
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
    teacherName: course.teacher,
    classroom: course.location,
    startSection: course.start_section,
    endSection: course.end_section,
    startWeek: course.start_week,
    endWeek: course.end_week,
    color,
    periodLabel: slotInfo.periodLabel,
    timeLabel: slotInfo.slot.time,
    sectionLabel: slotInfo.slot.label
  };
}

Page({
  data: {
    selectedWeekday: 1,
    courses: [],
    loading: false,
    isLoggedIn: false,
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
    const weekday = Number(e.currentTarget.dataset.weekday);
    this.setData({ selectedWeekday: weekday });
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
      fail: (err) => {
        console.error('[Courses] load failed:', err);
        this.setData({ courses: [], loading: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    });
  },

  onCourseClick(e) {
    const course = e.currentTarget.dataset.course;
    this.showCourseEditor(course);
  },

  onAddCourse() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    this.showCourseEditor(null);
  },

  showCourseEditor(course) {
    const isEdit = !!course;
    wx.showModal({
      title: isEdit ? '修改课程名称' : '添加课程',
      editable: true,
      placeholderText: '例如：高等数学',
      content: course ? course.courseName : '',
      success: (res) => {
        if (!res.confirm) return;
        const courseName = (res.content || '').trim();
        if (!courseName) {
          wx.showToast({ title: '请输入课程名称', icon: 'none' });
          return;
        }
        this.showTeacherInput(courseName, course);
      }
    });
  },

  showTeacherInput(courseName, course) {
    wx.showModal({
      title: '教师姓名',
      editable: true,
      placeholderText: '可不填',
      content: course ? (course.teacherName || '') : '',
      success: (res) => {
        if (!res.confirm) return;
        this.showClassroomInput(courseName, (res.content || '').trim(), course);
      }
    });
  },

  showClassroomInput(courseName, teacher, course) {
    wx.showModal({
      title: '上课地点',
      editable: true,
      placeholderText: '例如：2#多媒体教室',
      content: course ? (course.classroom || '') : '',
      success: (res) => {
        if (!res.confirm) return;
        this.showPeriodPicker(courseName, teacher, (res.content || '').trim(), course);
      }
    });
  },

  showPeriodPicker(courseName, teacher, classroom, course) {
    wx.showActionSheet({
      itemList: TIME_SLOT_GROUPS.map((group) => `${group.label}时段`),
      success: (res) => {
        const group = TIME_SLOT_GROUPS[res.tapIndex];
        if (!group) return;
        this.showTimeSlotPicker(courseName, teacher, classroom, group, course);
      }
    });
  },

  showTimeSlotPicker(courseName, teacher, classroom, group, course) {
    wx.showActionSheet({
      itemList: group.slots.map((slot) => `${slot.label} ${slot.time}`),
      success: (res) => {
        const slot = group.slots[res.tapIndex];
        if (!slot) return;
        this.showWeekInput(courseName, teacher, classroom, slot.start, slot.end, course);
      }
    });
  },

  showWeekInput(courseName, teacher, classroom, startSection, endSection, course) {
    wx.showModal({
      title: '周次范围',
      editable: true,
      placeholderText: '例如：1-18',
      content: course ? `${course.startWeek}-${course.endWeek}` : '1-18',
      success: (res) => {
        if (!res.confirm) return;
        const match = String(res.content || '').match(/(\d+)-(\d+)/);
        const startWeek = match ? parseInt(match[1], 10) : 1;
        const endWeek = match ? parseInt(match[2], 10) : 18;

        if (course) {
          this.updateCourse(course.id, courseName, teacher, classroom, startSection, endSection, startWeek, endWeek);
        } else {
          this.addCourse(courseName, teacher, classroom, startSection, endSection, startWeek, endWeek);
        }
      }
    });
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
        sql: 'UPDATE courses SET course_name=?, teacher=?, location=?, start_section=?, end_section=?, start_week=?, end_week=? WHERE id=?',
        params: [courseName, teacher, classroom, startSection, endSection, startWeek, endWeek, id]
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result && res.result.success) {
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

  goToIndex() { wx.navigateTo({ url: '/pages/index/index' }); },
  goToCourses() {},
  goToImport() { wx.navigateTo({ url: '/pages/import/import' }); },
  goToProfile() { wx.navigateTo({ url: '/pages/profile/profile' }); },
  goToLogin() { wx.navigateTo({ url: '/pages/login/login' }); }
});
