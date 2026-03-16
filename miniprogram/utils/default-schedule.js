const DEFAULT_SCHEDULE_STORAGE_KEY = 'defaultScheduleEnabled';
const DEFAULT_SCHEDULE_TEMPLATE_KEY = 'default_ai302';

function isDefaultScheduleEnabled() {
  return !!wx.getStorageSync(DEFAULT_SCHEDULE_STORAGE_KEY);
}

function setDefaultScheduleEnabled(enabled) {
  wx.setStorageSync(DEFAULT_SCHEDULE_STORAGE_KEY, !!enabled);
}

module.exports = {
  DEFAULT_SCHEDULE_STORAGE_KEY,
  DEFAULT_SCHEDULE_TEMPLATE_KEY,
  isDefaultScheduleEnabled,
  setDefaultScheduleEnabled
};
