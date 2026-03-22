const { isDefaultScheduleEnabled, setDefaultScheduleEnabled } = require('../../utils/default-schedule');
const { hasLoginSession } = require('../../utils/auth');
const { callDbQuery, resolveCurrentUserId } = require('../../utils/cloud-db');
const { COURSE_REMINDER_TEMPLATE_ID } = require('../../utils/subscribe-message');

function createShareKey() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = '';

  for (let index = 0; index < 10; index += 1) {
    key += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }

  return key;
}

Page({
  data: {
    remindEnabled: false,
    remindOptions: [5, 10, 15, 20, 30, 45, 60],
    remindMinutesIndex: 2,
    remindMinutes: 15,
    remindWeekends: false,
    defaultTemplateEnabled: false,
    shareKey: '',
    shareKeyReady: false,
    shareKeyLoading: false,
  },

  onLoad() {
    this.loadSettings();
  },

  onShow() {
    this.loadSettings();
  },

  async loadSettings() {
    const savedEnabled = wx.getStorageSync('remindEnabled');
    const savedMinutes = wx.getStorageSync('remindMinutes');
    const savedWeekends = wx.getStorageSync('remindWeekends');
    const remindMinutes = typeof savedMinutes === 'number' ? savedMinutes : 15;
    const remindMinutesIndex = Math.max(this.data.remindOptions.indexOf(remindMinutes), 0);
    const hasSavedEnabled = savedEnabled !== '' && typeof savedEnabled !== 'undefined';
    const hasSavedWeekends = savedWeekends !== '' && typeof savedWeekends !== 'undefined';

    this.setData({
      remindEnabled: hasSavedEnabled ? !!savedEnabled : false,
      remindMinutes,
      remindMinutesIndex,
      remindWeekends: hasSavedWeekends ? !!savedWeekends : false,
      defaultTemplateEnabled: isDefaultScheduleEnabled(),
    });

    if (hasLoginSession()) {
      try {
        const userId = await resolveCurrentUserId();
        const rows = await callDbQuery(
          'SELECT remind_minutes, remind_weekends, status FROM user_subscriptions WHERE user_id = ? AND template_id = ? LIMIT 1',
          [userId, COURSE_REMINDER_TEMPLATE_ID],
        );
        const record = rows[0];

        if (record) {
          const dbMinutes = Number(record.remind_minutes || remindMinutes);
          const dbIndex = Math.max(this.data.remindOptions.indexOf(dbMinutes), 0);
          const enabled = record.status === 'active';
          const weekendsEnabled = !!Number(record.remind_weekends || 0);

          this.setData({
            remindEnabled: enabled,
            remindMinutes: dbMinutes,
            remindMinutesIndex: dbIndex,
            remindWeekends: weekendsEnabled,
          });
          wx.setStorageSync('remindEnabled', enabled);
          wx.setStorageSync('remindMinutes', dbMinutes);
          wx.setStorageSync('remindWeekends', weekendsEnabled);
        }
      } catch (error) {
        console.warn('[settings] load subscription failed', error);
      }
    }

    this.loadShareKey();
  },

  async loadShareKey() {
    if (!hasLoginSession()) {
      this.setData({
        shareKey: '',
        shareKeyReady: false,
        shareKeyLoading: false,
      });
      return;
    }

    this.setData({ shareKeyLoading: true });
    try {
      const userId = await resolveCurrentUserId();
      const rows = await callDbQuery(
        'SELECT share_key, is_active FROM schedule_share_keys WHERE user_id = ? LIMIT 1',
        [userId],
      );
      const row = rows[0];
      this.setData({
        shareKey: row && row.is_active ? row.share_key : '',
        shareKeyReady: !!(row && row.is_active),
        shareKeyLoading: false,
      });
    } catch (error) {
      this.setData({
        shareKey: '',
        shareKeyReady: false,
        shareKeyLoading: false,
      });
    }
  },

  onToggleEnabled(e) {
    this.setData({ remindEnabled: !!e.detail.value });
  },

  onMinutesChange(e) {
    const index = Number(e.detail.value) || 0;
    this.setData({
      remindMinutesIndex: index,
      remindMinutes: this.data.remindOptions[index],
    });
  },

  onToggleWeekends(e) {
    this.setData({ remindWeekends: !!e.detail.value });
  },

  onToggleDefaultTemplate(e) {
    this.setData({ defaultTemplateEnabled: !!e.detail.value });
  },

  openLegalPage(key) {
    wx.navigateTo({ url: `/pages/legal-document/legal-document?key=${key}` });
  },

  goToUserAgreement() {
    this.openLegalPage('user_agreement');
  },

  goToPrivacyPolicy() {
    this.openLegalPage('privacy_policy');
  },

  async onGenerateShareKey() {
    if (!hasLoginSession()) {
      wx.showModal({
        title: '需要登录',
        content: '生成课表分享密钥前需要先登录账号。',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' });
          }
        },
      });
      return;
    }

    this.setData({ shareKeyLoading: true });

    try {
      const userId = await resolveCurrentUserId();
      let latestKey = '';
      let saved = false;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        latestKey = createShareKey();
        try {
          await callDbQuery(
            `INSERT INTO schedule_share_keys (user_id, share_key, is_active)
             VALUES (?, ?, 1)
             ON DUPLICATE KEY UPDATE share_key = VALUES(share_key), is_active = 1, updated_at = CURRENT_TIMESTAMP`,
            [userId, latestKey],
          );
          saved = true;
          break;
        } catch (error) {
          if ((error.message || '').indexOf('Duplicate entry') === -1) {
            throw error;
          }
        }
      }

      if (!saved) {
        throw new Error('分享密钥生成过于频繁，请稍后再试');
      }

      this.setData({
        shareKey: latestKey,
        shareKeyReady: true,
        shareKeyLoading: false,
      });
      wx.showToast({ title: '分享密钥已生成', icon: 'success' });
    } catch (error) {
      this.setData({ shareKeyLoading: false });
      wx.showToast({
        title: error && error.message ? error.message : '生成失败',
        icon: 'none',
      });
    }
  },

  onCopyShareKey() {
    if (!this.data.shareKey) {
      wx.showToast({ title: '请先生成密钥', icon: 'none' });
      return;
    }

    wx.setClipboardData({
      data: this.data.shareKey,
      success: () => {
        wx.showToast({ title: '密钥已复制', icon: 'success' });
      },
    });
  },

  requestCourseReminderSubscribe() {
    return new Promise((resolve, reject) => {
      wx.requestSubscribeMessage({
        tmplIds: [COURSE_REMINDER_TEMPLATE_ID],
        success: (res) => {
          const result = res[COURSE_REMINDER_TEMPLATE_ID];
          if (result === 'accept') {
            resolve(true);
            return;
          }

          reject(new Error(result === 'reject' ? '你已拒绝订阅提醒' : '未完成订阅授权'));
        },
        fail: reject,
      });
    });
  },

  async saveSubscriptionAuth(remindMinutes) {
    const userId = await resolveCurrentUserId();
    await callDbQuery(
      `INSERT INTO user_subscriptions
        (user_id, template_id, page_path, remind_minutes, remind_weekends, remaining_count, status, last_subscribed_at)
       VALUES (?, ?, 'pages/index/index', ?, ?, 1, 'active', NOW())
       ON DUPLICATE KEY UPDATE
         remind_minutes = VALUES(remind_minutes),
         remind_weekends = VALUES(remind_weekends),
         page_path = VALUES(page_path),
         remaining_count = remaining_count + 1,
         status = 'active',
         last_subscribed_at = NOW(),
         updated_at = CURRENT_TIMESTAMP`,
      [userId, COURSE_REMINDER_TEMPLATE_ID, remindMinutes, this.data.remindWeekends ? 1 : 0],
    );
  },

  async disableSubscriptionAuth() {
    if (!hasLoginSession()) return;
    const userId = await resolveCurrentUserId();
    await callDbQuery(
      'UPDATE user_subscriptions SET status = \'inactive\', updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND template_id = ?',
      [userId, COURSE_REMINDER_TEMPLATE_ID],
    );
  },

  async onSave() {
    setDefaultScheduleEnabled(this.data.defaultTemplateEnabled);

    if (this.data.remindEnabled && !hasLoginSession()) {
      this.setData({ remindEnabled: false });
      wx.setStorageSync('remindEnabled', false);
      wx.setStorageSync('remindMinutes', this.data.remindMinutes);
      wx.setStorageSync('remindWeekends', this.data.remindWeekends);
      wx.showModal({
        title: '需要登录',
        content: '开启课程提醒前需要先登录账号并完成订阅授权。',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' });
          }
        },
      });
      return;
    }

    if (this.data.remindEnabled && hasLoginSession()) {
      try {
        await this.requestCourseReminderSubscribe();
        await this.saveSubscriptionAuth(this.data.remindMinutes);
        wx.setStorageSync('remindEnabled', true);
        wx.setStorageSync('remindMinutes', this.data.remindMinutes);
        wx.setStorageSync('remindWeekends', this.data.remindWeekends);
        wx.showToast({ title: '提醒已开启', icon: 'success' });
        return;
      } catch (error) {
        wx.showToast({
          title: error && error.message ? error.message : '订阅提醒失败',
          icon: 'none',
        });
        return;
      }
    }

    if (!this.data.remindEnabled && hasLoginSession()) {
      try {
        await this.disableSubscriptionAuth();
      } catch (error) {
        console.warn('[settings] disable subscription failed', error);
      }
    }

    wx.setStorageSync('remindEnabled', this.data.remindEnabled);
    wx.setStorageSync('remindMinutes', this.data.remindMinutes);
    wx.setStorageSync('remindWeekends', this.data.remindWeekends);
    wx.showToast({ title: '设置已保存', icon: 'success' });
  },
});
