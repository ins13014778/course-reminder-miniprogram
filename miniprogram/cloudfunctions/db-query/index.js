const mysql = require('mysql2/promise');

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

function isSafeSql(sql) {
  return typeof sql === 'string' && sql.trim().length > 0;
}

exports.main = async (event) => {
  const { sql, params = [] } = event || {};

  if (!isSafeSql(sql)) {
    return {
      success: false,
      message: 'SQL is required'
    };
  }

  try {
    const [rows] = await getPool().execute(sql, params);
    return { success: true, data: rows };
  } catch (error) {
    console.error('[db-query] execute failed:', error);
    return {
      success: false,
      message: error.message || 'Database query failed'
    };
  }
};
