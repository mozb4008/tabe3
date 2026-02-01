
import Database from 'better-sqlite3';
const db = new Database('database.db');
const info = db.pragma('table_info(institution_violations)');
console.log(JSON.stringify(info, null, 2));
