const cloud = require('wx-server-sdk');
const mysql = require('mysql2/promise');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

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

function formatBanMessage(bannedUntil, reason) {
  const reasonText = reason ? `，原因：${reason}` : '';
  if (!bannedUntil) {
    return `账号已被永久封禁${reasonText}`;
  }

  const until = new Date(bannedUntil);
  const untilText = Number.isNaN(until.getTime()) ? String(bannedUntil) : until.toLocaleString('zh-CN');
  return `账号已被封禁至 ${untilText}${reasonText}`;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || event.openid;
  const userInfo = event.userInfo || {};

  if (!openid) {
    return { success: false, message: 'missing openid' };
  }

  try {
    const db = getPool();
    const [existingRows] = await db.execute(
      `SELECT
          id,
          openid,
          nickname,
          signature,
          avatar_url,
          school,
          major,
          grade,
          account_status,
          account_ban_reason,
          account_banned_until
       FROM users
       WHERE openid = ?
       LIMIT 1`,
      [openid],
    );

    if (existingRows.length > 0) {
      const existingUser = existingRows[0];
      if (isBanActive(existingUser.account_status, existingUser.account_banned_until)) {
        return {
          success: false,
          code: 'ACCOUNT_BANNED',
          restrictionType: 'account',
          reason: existingUser.account_ban_reason || '',
          bannedUntil: existingUser.account_banned_until || null,
          canAppeal: true,
          user: existingUser,
          message: formatBanMessage(existingUser.account_banned_until, existingUser.account_ban_reason),
        };
      }

      return { success: true, user: existingUser };
    }

    await db.execute(
      `INSERT INTO users (
         openid, nickname, signature, avatar_url, school, major, grade, _openid,
         account_status, note_status, share_status
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 'active', 'active')`,
      [
        openid,
        userInfo.nickname || '微信用户',
        userInfo.signature || '',
        userInfo.avatar || '',
        userInfo.school || '',
        userInfo.major || '',
        userInfo.grade || '',
        openid,
      ],
    );

    const [createdRows] = await db.execute(
      `SELECT
          id,
          openid,
          nickname,
          signature,
          avatar_url,
          school,
          major,
          grade,
          account_status,
          account_ban_reason,
          account_banned_until
       FROM users
       WHERE openid = ?
       LIMIT 1`,
      [openid],
    );

    return {
      success: true,
      user: createdRows[0] || null,
    };
  } catch (error) {
    console.error('[user-getOrCreate] error:', error);
    return { success: false, message: error.message };
  }
};
