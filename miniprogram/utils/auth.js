const AUTH_TOKEN_KEY = 'token';
const AUTH_USER_KEY = 'user';
const AUTH_STATUS_KEY = 'authStatus';
const APP_FIRST_OPENED_KEY = 'appFirstOpened';
const AUTH_STATUS_LOGGED_IN = 'logged_in';

function getLoginToken() {
  return wx.getStorageSync(AUTH_TOKEN_KEY) || '';
}

function getStoredUser() {
  return wx.getStorageSync(AUTH_USER_KEY) || {};
}

function hasLoginSession() {
  return wx.getStorageSync(AUTH_STATUS_KEY) === AUTH_STATUS_LOGGED_IN && !!getLoginToken();
}

function setLoginSession(user, token) {
  wx.setStorageSync(AUTH_USER_KEY, user || {});
  wx.setStorageSync(AUTH_TOKEN_KEY, token || '');
  wx.setStorageSync(AUTH_STATUS_KEY, AUTH_STATUS_LOGGED_IN);
}

function updateStoredUser(patch) {
  const nextUser = Object.assign({}, getStoredUser(), patch || {});
  wx.setStorageSync(AUTH_USER_KEY, nextUser);
  return nextUser;
}

function clearLoginSession() {
  wx.removeStorageSync(AUTH_USER_KEY);
  wx.removeStorageSync(AUTH_TOKEN_KEY);
  wx.removeStorageSync(AUTH_STATUS_KEY);
}

function ensureFirstLaunchGuestState() {
  const hasOpenedBefore = wx.getStorageSync(APP_FIRST_OPENED_KEY);
  if (hasOpenedBefore) return;

  clearLoginSession();
  wx.setStorageSync(APP_FIRST_OPENED_KEY, true);
}

module.exports = {
  getLoginToken,
  getStoredUser,
  hasLoginSession,
  setLoginSession,
  updateStoredUser,
  clearLoginSession,
  ensureFirstLaunchGuestState
};
