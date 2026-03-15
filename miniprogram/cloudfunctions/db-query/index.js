const mysql = require('mysql2/promise');

exports.main = async (event) => {
  const { sql, params = [] } = event;

  const connection = await mysql.createConnection({
    host: 'sh-cynosdbmysql-grp-g1feelo4.sql.tencentcdb.com',
    port: 27720,
    user: 'adwd155sd',
    password: 'czp123..',
    database: 'c-66-7gfze7g4075f38c7'
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
