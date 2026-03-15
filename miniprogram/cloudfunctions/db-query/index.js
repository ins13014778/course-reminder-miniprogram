const mysql = require('mysql2/promise');

exports.main = async (event) => {
  const { sql, params = [] } = event;

  const connection = await mysql.createConnection({
    host: 'sh-cynosdbmysql-grp-1bn2utju.sql.tencentcdb.com',
    port: 24694,
    user: 'xcbk9981',
    password: 'czp123..',
    database: 'dawdawd15-8g023nsw8cb3f68a'
  });

  try {
    const [rows] = await connection.execute(sql, params);
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    await connection.end();
  }
};
