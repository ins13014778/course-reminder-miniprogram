import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ENV_ID = process.env.CLOUDBASE_ENV_ID || 'dawdawd15-8g023nsw8cb3f68a';
const ROOT_DIR = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const exportRoot = path.join(ROOT_DIR, 'database', 'exports', `cloudbase-sql-${timestamp}`);
const schemaDir = path.join(exportRoot, 'schema');
const dataDir = path.join(exportRoot, 'data');
const BATCH_SIZE = Number(process.env.CLOUDBASE_EXPORT_BATCH_SIZE || 500);

mkdirSync(schemaDir, { recursive: true });
mkdirSync(dataDir, { recursive: true });

function runMcporter(args) {
  const quotedArgs = args.map((arg) => `"${String(arg).replace(/"/g, '\\"')}"`).join(' ');
  const stdout =
    process.platform === 'win32'
      ? execFileSync(
          'cmd.exe',
          ['/d', '/s', '/c', `"C:\\Program Files\\nodejs\\npx.cmd" mcporter ${quotedArgs}`],
          {
            cwd: ROOT_DIR,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        )
      : execFileSync('npx', ['mcporter', ...args], {
          cwd: ROOT_DIR,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });

  return JSON.parse(stdout);
}

function runSql(sql) {
  const output = runMcporter([
    'call',
    'cloudbase.executeReadOnlySQL',
    `sql=${sql}`,
    '--output',
    'json',
  ]);

  if (!output?.success) {
    throw new Error(`SQL failed: ${sql}\n${JSON.stringify(output, null, 2)}`);
  }

  const items = output.result?.Items || [];
  return items.map((item) => JSON.parse(item));
}

function getTables() {
  const rows = runSql('SHOW TABLES');
  if (rows.length === 0) {
    return [];
  }

  const key = Object.keys(rows[0])[0];
  return rows.map((row) => row[key]);
}

function exportTableSchema(tableName) {
  const rows = runSql(`SHOW CREATE TABLE \`${tableName}\``);
  const row = rows[0] || {};
  const createTableSql = row['Create Table'] || '';
  writeFileSync(path.join(schemaDir, `${tableName}.sql`), `${createTableSql};\n`, 'utf8');
  return createTableSql;
}

function exportTableData(tableName) {
  const countRows = runSql(`SELECT COUNT(*) AS total FROM \`${tableName}\``);
  const total = Number(countRows[0]?.total || 0);
  const allRows = [];

  for (let offset = 0; offset < total; offset += BATCH_SIZE) {
    const batchRows = runSql(
      `SELECT * FROM \`${tableName}\` LIMIT ${BATCH_SIZE} OFFSET ${offset}`,
    );
    allRows.push(...batchRows);
  }

  writeFileSync(
    path.join(dataDir, `${tableName}.json`),
    `${JSON.stringify(allRows, null, 2)}\n`,
    'utf8',
  );

  return total;
}

function main() {
  runMcporter([
    'call',
    'cloudbase.auth',
    'action=set_env',
    `envId=${ENV_ID}`,
    '--output',
    'json',
  ]);

  const tables = getTables();
  const summary = {
    envId: ENV_ID,
    exportedAt: new Date().toISOString(),
    batchSize: BATCH_SIZE,
    tableCount: tables.length,
    tables: [],
  };

  for (const tableName of tables) {
    const createTableSql = exportTableSchema(tableName);
    const rowCount = exportTableData(tableName);
    summary.tables.push({
      tableName,
      rowCount,
      schemaFile: `schema/${tableName}.sql`,
      dataFile: `data/${tableName}.json`,
      createTablePreview: createTableSql.slice(0, 200),
    });
    console.log(`Exported ${tableName}: ${rowCount} rows`);
  }

  writeFileSync(
    path.join(exportRoot, 'manifest.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
    'utf8',
  );

  writeFileSync(
    path.join(exportRoot, 'README.md'),
    [
      '# CloudBase SQL Export',
      '',
      `- EnvId: \`${ENV_ID}\``,
      `- Exported At: \`${summary.exportedAt}\``,
      `- Table Count: \`${summary.tableCount}\``,
      `- Batch Size: \`${BATCH_SIZE}\``,
      '',
      '## Contents',
      '',
      '- `schema/`: each table `SHOW CREATE TABLE` result',
      '- `data/`: each table full data export in JSON',
      '- `manifest.json`: export summary and row counts',
      '',
      '## Warning',
      '',
      'This directory contains real production data exported from CloudBase. Keep it private and do not commit it to a public repository.',
      '',
    ].join('\n'),
    'utf8',
  );

  console.log(`EXPORT_ROOT=${exportRoot}`);
}

main();
