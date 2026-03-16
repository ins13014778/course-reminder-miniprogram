const { isDefaultScheduleEnabled, DEFAULT_SCHEDULE_TEMPLATE_KEY } = require('../../utils/default-schedule');
const { getStoredUser, getLoginToken, hasLoginSession, updateStoredUser, clearLoginSession } = require('../../utils/auth');
const { callDbQuery } = require('../../utils/cloud-db');
const { getSectionTime } = require('../../utils/time-slots');

Page({
  data: {
    user: {},
    todayCourses: [],
    currentWeek: 1,
    totalWeeks: 18,
    weekdayText: '',
    announcement: null,
    isLoggedIn: false,
    usingTemplateSchedule: false,
    templateScheduleEnabled: false,
    colors: ['#C96F3B', '#2E6B5B', '#7A6854', '#B65429', '#476356', '#8C7B68']
  },

  onLoad() {
    this.loadData();
    this.loadAnnouncement();
  },

  onShow() {
    this.loadData();
    this.loadAnnouncement();
  },

  loadData() {
    const user = getStoredUser();
    const token = getLoginToken();
    const isLoggedIn = hasLoginSession();
    const weekdays = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const weekday = new Date().getDay() || 7;
    const currentWeek = this.calculateCurrentWeek();
    const templateScheduleEnabled = isDefaultScheduleEnabled();

    this.setData({
      user,
      weekdayText: weekdays[weekday],
      currentWeek,
      isLoggedIn,
      templateScheduleEnabled
    });

    if (!isLoggedIn) {
      if (templateScheduleEnabled) {
        this.loadTemplateTodayCourses(weekday, currentWeek);
      } else {
        this.setData({ todayCourses: [], usingTemplateSchedule: false });
      }
      return;
    }

    if (user && user.id) {
      this.loadUserCourseState(user.id, weekday, currentWeek, templateScheduleEnabled);
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
          updateStoredUser({ id: userId });
          this.setData({ user: nextUser });
          this.loadUserCourseState(userId, weekday, currentWeek, templateScheduleEnabled);
        } else if (templateScheduleEnabled) {
          clearLoginSession();
          this.loadTemplateTodayCourses(weekday, currentWeek);
        } else {
          clearLoginSession();
          this.setData({ todayCourses: [], usingTemplateSchedule: false });
        }
      },
      fail: () => {
        if (templateScheduleEnabled) {
          this.loadTemplateTodayCourses(weekday, currentWeek);
        } else {
          this.setData({ todayCourses: [], usingTemplateSchedule: false });
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

  sectionToTime(section, isStart) {
    return getSectionTime(section, isStart);
  },

  mapCourseForToday(course, index) {
    const startTime = course.start_time || this.sectionToTime(course.start_section, true);
    const endTime = course.end_time || this.sectionToTime(course.end_section, false);
    return {
      id: course.id,
      courseName: course.course_name,
      classroom: course.classroom || course.location || '',
      teacherName: course.teacher_name || course.teacher || '',
      startTime,
      endTime,
      color: course.color || this.data.colors[index % this.data.colors.length],
      isTemplate: !!course.is_template
    };
  },

  formatAnnouncementTime(value) {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const pad = (number) => String(number).padStart(2, '0');
    return `${date.getMonth() + 1}-${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  },

  async loadAnnouncement() {
    try {
      const rows = await callDbQuery(
        `SELECT id, title, content, updated_at
         FROM announcements
         WHERE status = 'published'
         ORDER BY is_pinned DESC, updated_at DESC
         LIMIT 1`
      );

      if (!rows.length) {
        this.setData({ announcement: null });
        return;
      }

      const announcement = rows[0];
      this.setData({
        announcement: {
          id: announcement.id,
          title: announcement.title || '最新公告',
          content: announcement.content || '',
          updatedAtText: this.formatAnnouncementTime(announcement.updated_at)
        }
      });
    } catch (error) {
      this.setData({ announcement: null });
    }
  },

  loadTemplateTodayCourses(weekday, week) {
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
        params: [DEFAULT_SCHEDULE_TEMPLATE_KEY, weekday, week, week, week, week]
      },
      success: (res) => {
        const result = res.result;
        if (result && result.success && Array.isArray(result.data)) {
          const todayCourses = result.data.map((course, index) => this.mapCourseForToday(course, index));
          this.setData({ todayCourses, usingTemplateSchedule: true });
        } else {
          this.setData({ todayCourses: [], usingTemplateSchedule: false });
        }
      },
      fail: () => {
        this.setData({ todayCourses: [], usingTemplateSchedule: false });
      }
    });
  },

  loadUserCourseState(userId, weekday, week, templateEnabled) {
    wx.cloud.callFunction({
      name: 'db-query',
      data: {
        sql: 'SELECT COUNT(*) AS total FROM courses WHERE user_id = ?',
        params: [userId]
      },
      success: (countRes) => {
        const total = Number(
          countRes &&
          countRes.result &&
          countRes.result.data &&
          countRes.result.data[0] &&
          countRes.result.data[0].total
        ) || 0;

        if (total === 0 && templateEnabled) {
          this.loadTemplateTodayCourses(weekday, week);
          return;
        }

        this.loadTodayCourses(userId, weekday, week);
      },
      fail: () => {
        if (templateEnabled) {
          this.loadTemplateTodayCourses(weekday, week);
        } else {
          this.setData({ todayCourses: [], usingTemplateSchedule: false });
        }
      }
    });
  },

  loadTodayCourses(userId, weekday, week) {
    if (!userId) {
      this.setData({ todayCourses: [], usingTemplateSchedule: false });
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
          const courses = result.data.map((course, index) => this.mapCourseForToday(course, index));
          this.setData({ todayCourses: courses, usingTemplateSchedule: false });
        } else {
          this.setData({ todayCourses: [], usingTemplateSchedule: false });
        }
      },
      fail: () => {
        this.setData({ todayCourses: [], usingTemplateSchedule: false });
      }
    });
  },

  onWeekChange(e) {
    const week = Number(e.currentTarget.dataset.week);
    const user = getStoredUser();
    const token = getLoginToken();
    const weekday = new Date().getDay() || 7;
    const templateEnabled = isDefaultScheduleEnabled();

    this.setData({ currentWeek: week, templateScheduleEnabled: templateEnabled });

    if (!token) {
      if (templateEnabled) {
        this.loadTemplateTodayCourses(weekday, week);
      } else {
        this.setData({ todayCourses: [], usingTemplateSchedule: false });
      }
      return;
    }

    if (user && user.id) {
      this.loadUserCourseState(user.id, weekday, week, templateEnabled);
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
          this.loadUserCourseState(result.data[0].id, weekday, week, templateEnabled);
        } else if (templateEnabled) {
          this.loadTemplateTodayCourses(weekday, week);
        }
      }
    });
  },

  goToIndex() {},
  goToCourses() { wx.switchTab({ url: '/pages/courses/courses' }); },
  goToImport() { wx.switchTab({ url: '/pages/import/import' }); },
  goToSettings() { wx.navigateTo({ url: '/pages/settings/settings' }); },
  goToProfile() { wx.switchTab({ url: '/pages/profile/profile' }); },
  goToLogin() { wx.navigateTo({ url: '/pages/login/login' }); }
});
