const { isDefaultScheduleEnabled, DEFAULT_SCHEDULE_TEMPLATE_KEY } = require('../../utils/default-schedule');
const { getStoredUser, getLoginToken, hasLoginSession, updateStoredUser, clearLoginSession } = require('../../utils/auth');

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

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

TIME_SLOT_GROUPS.splice(0, TIME_SLOT_GROUPS.length, ...[
  {
    key: 'morning',
    label: '上午',
    slots: [
      { start: 1, end: 2, label: '第1-2节', time: '08:30-10:10' },
      { start: 3, end: 4, label: '第3-4节', time: '10:25-12:05' }
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
      { start: 9, end: 10, label: '晚自习', time: '19:00-20:30' }
    ]
  }
]);

function padTimeValue(value) {
  return String(value || '').padStart(2, '0');
}

function normalizeTimeValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const compact = raw.replace(/[^\d:]/g, '');
  if (/^\d{4}$/.test(compact)) {
    return `${compact.slice(0, 2)}:${compact.slice(2)}`;
  }
  const match = compact.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return raw;
  return `${padTimeValue(match[1])}:${padTimeValue(match[2])}`;
}

function isValidTimeValue(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || ''));
}

function compareTimeValue(startTime, endTime) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  return startHour * 60 + startMinute - (endHour * 60 + endMinute);
}

function getSlotInfo(startSection, endSection) {
  for (const group of TIME_SLOT_GROUPS) {
    const found = group.slots.find((slot) => slot.start === startSection && slot.end === endSection);
    if (found) {
      return { periodKey: group.key, periodLabel: group.label, slot: found, matched: true };
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
    },
    matched: false
  };
}

function getPeriodSlots(periodKey) {
  const group = TIME_SLOT_GROUPS.find((item) => item.key === periodKey) || TIME_SLOT_GROUPS[0];
  return group.slots;
}

function buildTimeLabel(course) {
  const startTime = normalizeTimeValue(course.start_time);
  const endTime = normalizeTimeValue(course.end_time);
  if (isValidTimeValue(startTime) && isValidTimeValue(endTime)) {
    return `${startTime}-${endTime}`;
  }

  return getSlotInfo(course.start_section, course.end_section).slot.time;
}

function formatCourseForView(course, color) {
  const slotInfo = getSlotInfo(course.start_section, course.end_section);
  return {
    id: course.id,
    courseName: course.course_name,
    teacherName: course.teacher_name || course.teacher || '',
    classroom: course.classroom || course.location || '',
    startSection: course.start_section,
    endSection: course.end_section,
    startWeek: course.start_week,
    endWeek: course.end_week,
    startTime: normalizeTimeValue(course.start_time),
    endTime: normalizeTimeValue(course.end_time),
    color,
    isTemplate: !!course.is_template,
    periodKey: slotInfo.periodKey,
    periodLabel: slotInfo.periodLabel,
    timeLabel: buildTimeLabel(course),
    sectionLabel: slotInfo.slot.label,
    isConflict: false,
    conflictLabel: ''
  };
}

function toMinuteValue(timeText, fallbackSection, sectionOffset) {
  const normalized = normalizeTimeValue(timeText);
  if (isValidTimeValue(normalized)) {
    const [hour, minute] = normalized.split(':').map(Number);
    return hour * 60 + minute;
  }

  return fallbackSection * 100 + sectionOffset;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

function detectCourseConflicts(courses) {
  const courseMap = new Map();
  const conflicts = [];

  courses.forEach((course) => {
    courseMap.set(course.id, { ...course, isConflict: false, conflictLabel: '' });
  });

  for (let i = 0; i < courses.length; i += 1) {
    for (let j = i + 1; j < courses.length; j += 1) {
      const current = courses[i];
      const next = courses[j];

      if (!rangesOverlap(current.startWeek, current.endWeek, next.startWeek, next.endWeek)) {
        continue;
      }

      const currentStart = toMinuteValue(current.startTime, current.startSection, 0);
      const currentEnd = toMinuteValue(current.endTime, current.endSection, 99);
      const nextStart = toMinuteValue(next.startTime, next.startSection, 0);
      const nextEnd = toMinuteValue(next.endTime, next.endSection, 99);

      if (!rangesOverlap(currentStart, currentEnd, nextStart, nextEnd)) {
        continue;
      }

      conflicts.push(`${current.courseName} / ${next.courseName}`);

      const currentTarget = courseMap.get(current.id);
      const nextTarget = courseMap.get(next.id);
      currentTarget.isConflict = true;
      nextTarget.isConflict = true;
      currentTarget.conflictLabel = currentTarget.conflictLabel || `与 ${next.courseName} 冲突`;
      nextTarget.conflictLabel = nextTarget.conflictLabel || `与 ${current.courseName} 冲突`;
    }
  }

  return {
    courses: courses.map((course) => courseMap.get(course.id) || course),
    conflictTips: conflicts
  };
}

function createEditorState(course) {
  const slotInfo = getSlotInfo(course ? course.startSection : 1, course ? course.endSection : 2);
  const useCustomTime = !!(course && course.startTime && course.endTime);
  const defaultSlots = getPeriodSlots(slotInfo.periodKey === 'custom' ? 'morning' : slotInfo.periodKey);
  const defaultSlot = defaultSlots.find((slot) => slot.start === slotInfo.slot.start && slot.end === slotInfo.slot.end) || defaultSlots[0];

  return {
    id: course ? course.id : null,
    courseName: course ? course.courseName : '',
    teacherName: course ? course.teacherName : '',
    classroom: course ? course.classroom : '',
    periodKey: slotInfo.periodKey === 'custom' ? 'morning' : slotInfo.periodKey,
    startSection: defaultSlot.start,
    endSection: defaultSlot.end,
    startWeek: course ? course.startWeek : 1,
    endWeek: course ? course.endWeek : 18,
    useCustomTime,
    customStartTime: course ? normalizeTimeValue(course.startTime) : defaultSlot.time.split('-')[0],
    customEndTime: course ? normalizeTimeValue(course.endTime) : defaultSlot.time.split('-')[1]
  };
}

Page({
  data: {
    weekdayLabels: WEEKDAY_LABELS,
    selectedWeekday: 1,
    courses: [],
    loading: false,
    isLoggedIn: false,
    usingTemplateSchedule: false,
    templateScheduleEnabled: false,
    colors: ['#C96F3B', '#2E6B5B', '#7A6854', '#B65429', '#476356', '#8C7B68'],
    periodGroups: TIME_SLOT_GROUPS,
    editorVisible: false,
    editorMode: 'add',
    editorTitle: '添加课程',
    editorCourse: createEditorState(null),
    conflictCount: 0,
    conflictTips: []
  },

  onLoad() {
    const weekday = new Date().getDay() || 7;
    this.setData({ selectedWeekday: weekday });
    this.loadCourses();
  },

  onShow() {
    this.loadCourses();
  },

  calculateCurrentWeek() {
    const semesterStart = wx.getStorageSync('semesterStart');
    if (!semesterStart) return 1;

    const start = new Date(semesterStart);
    const now = new Date();
    const diffMs = now - start;
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
    return Math.max(1, Math.min(diffWeeks, 18));
  },

  onWeekdayChange(e) {
    this.setData({ selectedWeekday: Number(e.currentTarget.dataset.weekday) });
    this.loadCourses();
  },

  loadCourses() {
    const user = getStoredUser();
    const token = getLoginToken();
    const isLoggedIn = hasLoginSession();
    const templateScheduleEnabled = isDefaultScheduleEnabled();

    this.setData({ isLoggedIn, templateScheduleEnabled });

    if (!isLoggedIn) {
      if (templateScheduleEnabled) {
        this.loadTemplateCourses();
      } else {
        this.setData({ courses: [], loading: false, usingTemplateSchedule: false });
      }
      return;
    }

    if (user && user.id) {
      this.loadUserCourseState(user.id, templateScheduleEnabled);
      return;
    }

    wx.cloud.callFunction({
      name: 'db-query',
      data: {
        sql: 'SELECT id FROM users WHERE openid = ? LIMIT 1',
        params: [token]
      },
      success: (res) => {
        const rows = res.result && res.result.success ? res.result.data : [];
        if (rows && rows.length > 0) {
          updateStoredUser({ id: rows[0].id });
          this.loadUserCourseState(rows[0].id, templateScheduleEnabled);
        } else {
          clearLoginSession();
          this.setData({ courses: [], loading: false, usingTemplateSchedule: false });
        }
      },
      fail: () => {
        this.setData({ courses: [], loading: false, usingTemplateSchedule: false });
      }
    });
  },

  loadTemplateCourses() {
    const week = this.calculateCurrentWeek();
    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'db-query',
      data: {
        sql: `SELECT id, course_name, teacher_name, classroom, weekday, start_section, end_section, start_time, end_time, start_week, end_week, week_type, 1 AS is_template
              FROM course_templates
              WHERE template_key = ?
                AND is_active = 1
                AND weekday = ?
                AND start_week <= ?
                AND end_week >= ?
                AND (
                  week_type = 'all'
                  OR (week_type = 'odd' AND MOD(?, 2) = 1)
                  OR (week_type = 'even' AND MOD(?, 2) = 0)
                )
              ORDER BY sort_order ASC, start_section ASC`,
        params: [DEFAULT_SCHEDULE_TEMPLATE_KEY, this.data.selectedWeekday, week, week, week, week]
      },
      success: (res) => {
        const rows = res.result && res.result.success ? res.result.data : [];
        const rawCourses = (rows || []).map((course, index) =>
          formatCourseForView(course, this.data.colors[index % this.data.colors.length])
        );
        const conflictResult = detectCourseConflicts(rawCourses);
        this.setData({
          courses: conflictResult.courses,
          conflictCount: conflictResult.conflictTips.length,
          conflictTips: conflictResult.conflictTips,
          loading: false,
          usingTemplateSchedule: true
        });
      },
      fail: () => {
        this.setData({ courses: [], conflictCount: 0, conflictTips: [], loading: false, usingTemplateSchedule: false });
      }
    });
  },

  loadUserCourseState(userId, templateEnabled) {
    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'db-query',
      data: {
        sql: 'SELECT COUNT(*) AS total FROM courses WHERE user_id = ?',
        params: [userId]
      },
      success: (res) => {
        const rows = res.result && res.result.success ? res.result.data : [];
        const total = Number(rows && rows[0] ? rows[0].total : 0) || 0;

        if (total === 0 && templateEnabled) {
          this.loadTemplateCourses();
          return;
        }

        this.fetchCourses(userId);
      },
      fail: () => {
        if (templateEnabled) {
          this.loadTemplateCourses();
        } else {
          this.setData({ courses: [], loading: false, usingTemplateSchedule: false });
        }
      }
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
        const rows = res.result && res.result.success ? res.result.data : [];
        const rawCourses = (rows || []).map((course, index) =>
          formatCourseForView(course, course.color || this.data.colors[index % this.data.colors.length])
        );
        const conflictResult = detectCourseConflicts(rawCourses);
        this.setData({
          courses: conflictResult.courses,
          conflictCount: conflictResult.conflictTips.length,
          conflictTips: conflictResult.conflictTips,
          loading: false,
          usingTemplateSchedule: false
        });
      },
      fail: () => {
        this.setData({ courses: [], conflictCount: 0, conflictTips: [], loading: false, usingTemplateSchedule: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    });
  },

  onCourseClick(e) {
    if (this.data.usingTemplateSchedule) {
      wx.showToast({ title: '默认模板课表仅供预览', icon: 'none' });
      return;
    }

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

  noop() {},

  onEditorFieldChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`editorCourse.${field}`]: e.detail.value });
  },

  onPeriodChange(e) {
    const periodKey = e.currentTarget.dataset.period;
    const slots = getPeriodSlots(periodKey);
    const defaultSlot = slots[0];

    this.setData({
      'editorCourse.periodKey': periodKey,
      'editorCourse.startSection': defaultSlot.start,
      'editorCourse.endSection': defaultSlot.end
    });

    if (!this.data.editorCourse.useCustomTime) {
      const [startTime, endTime] = defaultSlot.time.split('-');
      this.setData({
        'editorCourse.customStartTime': startTime,
        'editorCourse.customEndTime': endTime
      });
    }
  },

  onSlotChange(e) {
    const startSection = Number(e.currentTarget.dataset.start);
    const endSection = Number(e.currentTarget.dataset.end);
    const slot = getPeriodSlots(this.data.editorCourse.periodKey).find(
      (item) => item.start === startSection && item.end === endSection
    );

    this.setData({
      'editorCourse.startSection': startSection,
      'editorCourse.endSection': endSection
    });

    if (slot && !this.data.editorCourse.useCustomTime) {
      const [startTime, endTime] = slot.time.split('-');
      this.setData({
        'editorCourse.customStartTime': startTime,
        'editorCourse.customEndTime': endTime
      });
    }
  },

  onTimeModeChange(e) {
    const mode = e.currentTarget.dataset.mode;
    const useCustomTime = mode === 'custom';
    this.setData({ 'editorCourse.useCustomTime': useCustomTime });

    if (!useCustomTime) {
      const slot = getPeriodSlots(this.data.editorCourse.periodKey).find(
        (item) =>
          item.start === Number(this.data.editorCourse.startSection) &&
          item.end === Number(this.data.editorCourse.endSection)
      ) || getPeriodSlots(this.data.editorCourse.periodKey)[0];
      const [startTime, endTime] = slot.time.split('-');
      this.setData({
        'editorCourse.customStartTime': startTime,
        'editorCourse.customEndTime': endTime
      });
    }
  },

  onCustomTimeChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`editorCourse.${field}`]: normalizeTimeValue(e.detail.value)
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
    const startTime = normalizeTimeValue(editor.customStartTime);
    const endTime = normalizeTimeValue(editor.customEndTime);
    const useCustomTime = !!editor.useCustomTime;

    if (!courseName) {
      wx.showToast({ title: '请输入课程名称', icon: 'none' });
      return;
    }

    if (startWeek > endWeek) {
      wx.showToast({ title: '周次范围不正确', icon: 'none' });
      return;
    }

    if (useCustomTime) {
      if (!isValidTimeValue(startTime) || !isValidTimeValue(endTime)) {
        wx.showToast({ title: '请输入正确的时间格式', icon: 'none' });
        return;
      }

      if (compareTimeValue(startTime, endTime) >= 0) {
        wx.showToast({ title: '结束时间要晚于开始时间', icon: 'none' });
        return;
      }
    }

    const payload = {
      courseName,
      teacher,
      classroom,
      startSection,
      endSection,
      startWeek,
      endWeek,
      startTime: useCustomTime ? startTime : null,
      endTime: useCustomTime ? endTime : null
    };

    this.confirmConflictAndSave(editor.id, payload);
  },

  confirmConflictAndSave(id, payload) {
    const draftCourse = {
      id: id || `draft-${Date.now()}`,
      courseName: payload.courseName,
      startSection: payload.startSection,
      endSection: payload.endSection,
      startWeek: payload.startWeek,
      endWeek: payload.endWeek,
      startTime: payload.startTime,
      endTime: payload.endTime
    };
    const siblingCourses = (this.data.courses || []).filter((item) => item.id !== id);
    const conflictResult = detectCourseConflicts([...siblingCourses, draftCourse]);
    const draft = conflictResult.courses.find((item) => item.id === draftCourse.id);

    if (draft && draft.isConflict) {
      wx.showModal({
        title: '检测到课程冲突',
        content: `${payload.courseName} 与当前这一天已有课程时间重叠，是否仍然保存？`,
        confirmText: '仍然保存',
        success: (res) => {
          if (!res.confirm) return;
          if (id) this.updateCourse(id, payload);
          else this.addCourse(payload);
        }
      });
      return;
    }

    if (id) this.updateCourse(id, payload);
    else this.addCourse(payload);
  },

  addCourse(payload) {
    const user = getStoredUser();
    const token = getLoginToken();

    wx.showLoading({ title: '添加中...' });
    wx.cloud.callFunction({
      name: 'db-query',
      data: {
        sql: `INSERT INTO courses
              (user_id, course_name, teacher, location, weekday, start_section, end_section, start_week, end_week, start_time, end_time, _openid)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          user.id,
          payload.courseName,
          payload.teacher,
          payload.classroom,
          this.data.selectedWeekday,
          payload.startSection,
          payload.endSection,
          payload.startWeek,
          payload.endWeek,
          payload.startTime,
          payload.endTime,
          token
        ]
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

  updateCourse(id, payload) {
    wx.showLoading({ title: '保存中...' });
    wx.cloud.callFunction({
      name: 'db-query',
      data: {
        sql: `UPDATE courses
              SET course_name = ?, teacher = ?, location = ?, start_section = ?, end_section = ?, start_week = ?, end_week = ?, start_time = ?, end_time = ?
              WHERE id = ?`,
        params: [
          payload.courseName,
          payload.teacher,
          payload.classroom,
          payload.startSection,
          payload.endSection,
          payload.startWeek,
          payload.endWeek,
          payload.startTime,
          payload.endTime,
          id
        ]
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
    if (this.data.usingTemplateSchedule) {
      wx.showToast({ title: '请先关闭模板课表', icon: 'none' });
      return;
    }

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

  goToIndex() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  goToCourses() {},

  goToImport() {
    wx.switchTab({ url: '/pages/import/import' });
  },

  goToProfile() {
    wx.switchTab({ url: '/pages/profile/profile' });
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  }
});
