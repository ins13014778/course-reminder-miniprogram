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
  return /^(INSERT|UPDATE|DELETE|REPLACE|ALTER|CREATE|DROP|TRUNCATE)\b/i.test(sql.trim());
}

function touchesTable(sql, tableName) {
  return new RegExp(`\\b${tableName}\\b`, 'i').test(sql);
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
        share_banned_until
     FROM users
     WHERE openid = ?
     LIMIT 1`,
    [openid],
  );

  return rows[0] || null;
}

function enforcePermissions(sql, callerUser) {
  if (!callerUser) {
    return;
  }

  if (isBanActive(callerUser.account_status, callerUser.account_banned_until)) {
    throw new Error(
      formatBanMessage('账号', callerUser.account_banned_until, callerUser.account_ban_reason),
    );
  }

  if (
    isBanActive(callerUser.note_status, callerUser.note_banned_until) &&
    touchesTable(sql, 'notes') &&
    isWriteSql(sql)
  ) {
    throw new Error(
      formatBanMessage('笔记权限', callerUser.note_banned_until, callerUser.note_ban_reason),
    );
  }

  if (
    isBanActive(callerUser.share_status, callerUser.share_banned_until) &&
    (touchesTable(sql, 'schedule_share_keys') || /\bshare_key\b/i.test(sql))
  ) {
    throw new Error(
      formatBanMessage('分享密钥权限', callerUser.share_banned_until, callerUser.share_ban_reason),
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
    enforcePermissions(sql, callerUser);

    const [rows] = await getPool().execute(sql, params);
    return { success: true, data: rows };
  } catch (error) {
    console.error('[db-query] execute failed:', error);
    return {
      success: false,
      message: error.message || 'Database query failed',
    };
  }
};
