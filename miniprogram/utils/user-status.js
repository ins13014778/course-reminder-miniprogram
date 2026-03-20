const RESTRICTION_OPTIONS = [
  {
    key: 'account',
    label: '账号功能',
    statusField: 'account_status',
    reasonField: 'account_ban_reason',
    untilField: 'account_banned_until',
  },
  {
    key: 'note',
    label: '笔记功能',
    statusField: 'note_status',
    reasonField: 'note_ban_reason',
    untilField: 'note_banned_until',
  },
  {
    key: 'share',
    label: '分享功能',
    statusField: 'share_status',
    reasonField: 'share_ban_reason',
    untilField: 'share_banned_until',
  },
  {
    key: 'avatar',
    label: '头像功能',
    statusField: 'avatar_status',
    reasonField: 'avatar_ban_reason',
    untilField: 'avatar_banned_until',
  },
  {
    key: 'signature',
    label: '个性签名',
    statusField: 'signature_status',
    reasonField: 'signature_ban_reason',
    untilField: 'signature_banned_until',
  },
];

function isRestrictionActive(status, bannedUntil) {
  if (status !== 'banned') {
    return false;
  }

  if (!bannedUntil) {
    return true;
  }

  const time = new Date(bannedUntil).getTime();
  if (Number.isNaN(time)) {
    return true;
  }

  return time > Date.now();
}

function formatRestrictionUntil(value) {
  if (!value) {
    return '永久限制';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDateTime(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value)
      .replace('T', ' ')
      .replace(/\.\d+Z?$/, '')
      .replace(/Z$/, '');
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(
    2,
    '0',
  )}`;
}

function buildRestrictionItems(row = {}) {
  return RESTRICTION_OPTIONS.map((item) => {
    const reason = row[item.reasonField] || '';
    const bannedUntil = row[item.untilField] || null;
    const status = row[item.statusField] || 'normal';
    const isActive = isRestrictionActive(status, bannedUntil);

    return {
      key: item.key,
      label: item.label,
      status,
      reason,
      bannedUntil,
      isActive,
      statusText: isActive ? '受限中' : '正常',
      reasonText: isActive ? reason || '后台未填写限制原因' : '当前功能正常可用',
      untilText: isActive ? formatRestrictionUntil(bannedUntil) : '未受限',
      canAppeal: isActive,
    };
  });
}

function buildActiveRestrictionSummary(row = {}) {
  return buildRestrictionItems(row)
    .filter((item) => item.isActive)
    .map((item) => ({
      ...item,
      detail: `${item.reasonText} · ${item.untilText}`,
    }));
}

function getAppealTypeLabel(type) {
  const matched = RESTRICTION_OPTIONS.find((item) => item.key === type);
  return matched ? `${matched.label}申诉` : '申诉记录';
}

function getAppealStatusLabel(status) {
  if (status === 'approved') return '已通过';
  if (status === 'rejected') return '已驳回';
  return '待处理';
}

module.exports = {
  RESTRICTION_OPTIONS,
  isRestrictionActive,
  formatRestrictionUntil,
  formatDateTime,
  buildRestrictionItems,
  buildActiveRestrictionSummary,
  getAppealTypeLabel,
  getAppealStatusLabel,
};
