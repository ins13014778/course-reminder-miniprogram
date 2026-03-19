function isRestrictionMessage(message) {
  return typeof message === 'string' && /(封禁|限制|申诉)/.test(message);
}

function inferRestrictionType(source, message) {
  if (source && source.restrictionType) {
    return source.restrictionType;
  }

  if (typeof message !== 'string') {
    return '';
  }

  if (message.includes('账号')) return 'account';
  if (message.includes('笔记')) return 'note';
  if (message.includes('分享')) return 'share';
  if (message.includes('头像')) return 'avatar';
  if (message.includes('签名')) return 'signature';
  return '';
}

function normalizeRestrictionPayload(source) {
  if (!source || typeof source !== 'object') {
    return null;
  }

  const message = source.message || '';
  const canAppeal = source.canAppeal === true || isRestrictionMessage(message);
  if (!canAppeal) {
    return null;
  }

  const restrictionType = inferRestrictionType(source, message);
  return {
    code: source.code || '',
    message: message || '当前功能已被限制',
    reason: source.reason || '',
    bannedUntil: source.bannedUntil || null,
    restrictionType,
    canAppeal: true,
  };
}

function buildRestrictionError(source) {
  const info = normalizeRestrictionPayload(source);
  const error = new Error((info && info.message) || (source && source.message) || '当前功能已被限制');

  if (info) {
    error.code = info.code;
    error.reason = info.reason;
    error.bannedUntil = info.bannedUntil;
    error.restrictionType = info.restrictionType;
    error.canAppeal = true;
  }

  return error;
}

function promptRestrictionAppeal(source) {
  const info = normalizeRestrictionPayload(source);
  if (!info) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    wx.showModal({
      title: '功能受限',
      content: `${info.message}\n\n是否前往申诉中心提交申诉？`,
      confirmText: '去申诉',
      cancelText: '我知道了',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/appeals/appeals' });
        }
        resolve(true);
      },
      fail: () => resolve(true),
    });
  });
}

async function handleRestrictionFailure(source) {
  const info = normalizeRestrictionPayload(source);
  if (!info) {
    return null;
  }

  await promptRestrictionAppeal(info);
  const error = buildRestrictionError(info);
  error.restrictionHandled = true;
  return error;
}

module.exports = {
  normalizeRestrictionPayload,
  buildRestrictionError,
  promptRestrictionAppeal,
  handleRestrictionFailure,
};
