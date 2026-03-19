const cloud = require('wx-server-sdk');
const mysql = require('mysql2/promise');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const DB_CONFIG = {
  host: 'sh-cynosdbmysql-grp-1bn2utju.sql.tencentcdb.com',
  port: 24694,
  user: 'xcbk9981',
  password: 'czp123..',
  database: 'dawdawd15-8g023nsw8cb3f68a',
  waitForConnections: true,
  connectionLimit: 2,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 2000,
};

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(DB_CONFIG);
  }
  return pool;
}

function isSafeSql(sql) {
  return typeof sql === 'string' && sql.trim().length > 0;
}

function isWriteSql(sql) {
  return /^(INSERT|UPDATE|DELETE|REPLACE|ALTER|CREATE|DROP|TRUNCATE)\b/i.test(String(sql || '').trim());
}

function touchesTable(sql, tableName) {
  return new RegExp(`\\b${tableName}\\b`, 'i').test(String(sql || ''));
}

function normalizeSql(sql) {
  return String(sql || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function updatesUserColumn(sql, columnName) {
  const normalizedSql = normalizeSql(sql);
  return normalizedSql.startsWith('update users') && new RegExp(`\\b${columnName}\\s*=`, 'i').test(sql);
}

function isBanActive(status, bannedUntil) {
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

function formatBanMessage(label, bannedUntil, reason) {
  const reasonText = reason ? `，原因：${reason}` : '';
  if (!bannedUntil) {
    return `${label}已被永久封禁${reasonText}`;
  }

  const until = new Date(bannedUntil);
  const untilText = Number.isNaN(until.getTime()) ? String(bannedUntil) : until.toLocaleString('zh-CN');
  return `${label}已被封禁至 ${untilText}${reasonText}`;
}

function createRestrictionError(code, restrictionType, label, bannedUntil, reason) {
  const error = new Error(formatBanMessage(label, bannedUntil, reason));
  error.code = code;
  error.restrictionType = restrictionType;
  error.reason = reason || '';
  error.bannedUntil = bannedUntil || null;
  error.canAppeal = true;
  return error;
}

function isOwnUserSelect(sql, params, callerUser) {
  const normalizedSql = normalizeSql(sql);

  if (!normalizedSql.startsWith('select') || !normalizedSql.includes(' from users ')) {
    return false;
  }

  if (normalizedSql.includes(' where openid = ?')) {
    return String(params?.[0] || '') === String(callerUser.openid || '');
  }

  if (normalizedSql.includes(' where id = ?')) {
    return Number(params?.[0]) === Number(callerUser.id);
  }

  return false;
}

function isOwnAppealQuery(sql, params, callerUser) {
  const normalizedSql = normalizeSql(sql);

  if (normalizedSql.startsWith('select') && normalizedSql.includes(' from user_appeals ')) {
    return Number(params?.[0]) === Number(callerUser.id);
  }

  if (normalizedSql.startsWith('insert into user_appeals')) {
    return Number(params?.[0]) === Number(callerUser.id);
  }

  return false;
}

function isAllowedForAccountAppeal(sql, params, callerUser) {
  return isOwnUserSelect(sql, params, callerUser) || isOwnAppealQuery(sql, params, callerUser);
}

async function getCallerUser(openid) {
  if (!openid) {
    return null;
  }

  const [rows] = await getPool().execute(
    `SELECT
        id,
        openid,
        account_status,
        account_ban_reason,
        account_banned_until,
        note_status,
        note_ban_reason,
        note_banned_until,
        share_status,
        share_ban_reason,
        share_banned_until,
        avatar_status,
        avatar_ban_reason,
        avatar_banned_until,
        signature_status,
        signature_ban_reason,
        signature_banned_until
     FROM users
     WHERE openid = ?
     LIMIT 1`,
    [openid],
  );

  return rows[0] || null;
}

function enforcePermissions(sql, params, callerUser) {
  if (!callerUser) {
    return;
  }

  if (isBanActive(callerUser.account_status, callerUser.account_banned_until)) {
    if (!isAllowedForAccountAppeal(sql, params, callerUser)) {
      throw createRestrictionError(
        'ACCOUNT_BANNED',
        'account',
        '账号',
        callerUser.account_banned_until,
        callerUser.account_ban_reason,
      );
    }

    return;
  }

  if (
    isBanActive(callerUser.note_status, callerUser.note_banned_until) &&
    touchesTable(sql, 'notes') &&
    isWriteSql(sql)
  ) {
    throw createRestrictionError(
      'NOTE_BANNED',
      'note',
      '笔记功能',
      callerUser.note_banned_until,
      callerUser.note_ban_reason,
    );
  }

  if (
    isBanActive(callerUser.share_status, callerUser.share_banned_until) &&
    isWriteSql(sql) &&
    (touchesTable(sql, 'schedule_share_keys') ||
      touchesTable(sql, 'note_shares') ||
      /\bshare_key\b/i.test(sql) ||
      /\bshare_code\b/i.test(sql))
  ) {
    throw createRestrictionError(
      'SHARE_BANNED',
      'share',
      '分享功能',
      callerUser.share_banned_until,
      callerUser.share_ban_reason,
    );
  }

  if (
    isBanActive(callerUser.avatar_status, callerUser.avatar_banned_until) &&
    isWriteSql(sql) &&
    updatesUserColumn(sql, 'avatar_url')
  ) {
    throw createRestrictionError(
      'AVATAR_BANNED',
      'avatar',
      '头像功能',
      callerUser.avatar_banned_until,
      callerUser.avatar_ban_reason,
    );
  }

  if (
    isBanActive(callerUser.signature_status, callerUser.signature_banned_until) &&
    isWriteSql(sql) &&
    updatesUserColumn(sql, 'signature')
  ) {
    throw createRestrictionError(
      'SIGNATURE_BANNED',
      'signature',
      '个性签名功能',
      callerUser.signature_banned_until,
      callerUser.signature_ban_reason,
    );
  }
}

exports.main = async (event) => {
  const { sql, params = [] } = event || {};

  if (!isSafeSql(sql)) {
    return {
      success: false,
      message: 'SQL is required',
    };
  }

  try {
    const wxContext = cloud.getWXContext();
    const callerUser = await getCallerUser(wxContext.OPENID);
    enforcePermissions(sql, params, callerUser);

    const [rows] = await getPool().execute(sql, params);
    return { success: true, data: rows };
  } catch (error) {
    console.error('[db-query] execute failed:', error);
    return {
      success: false,
      code: error.code || '',
      restrictionType: error.restrictionType || '',
      reason: error.reason || '',
      bannedUntil: error.bannedUntil || null,
      canAppeal: error.canAppeal === true,
      message: error.message || 'Database query failed',
    };
  }
};
