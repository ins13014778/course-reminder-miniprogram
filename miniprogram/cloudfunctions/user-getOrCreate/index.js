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
  connectTimeout: 2000
};

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(DB_CONFIG);
  }
  return pool;
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
      'SELECT * FROM users WHERE openid = ? LIMIT 1',
      [openid]
    );

    if (existingRows.length > 0) {
      return { success: true, user: existingRows[0] };
    }

    await db.execute(
      `INSERT INTO users (openid, nickname, signature, avatar_url, school, major, grade, _openid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        openid,
        userInfo.nickname || '微信用户',
        userInfo.signature || '',
        userInfo.avatar || '',
        userInfo.school || '',
        userInfo.major || '',
        userInfo.grade || '',
        openid
      ]
    );

    const [createdRows] = await db.execute(
      'SELECT * FROM users WHERE openid = ? LIMIT 1',
      [openid]
    );

    return {
      success: true,
      user: createdRows[0] || null
    };
  } catch (error) {
    console.error('[user-getOrCreate] error:', error);
    return { success: false, message: error.message };
  }
};
