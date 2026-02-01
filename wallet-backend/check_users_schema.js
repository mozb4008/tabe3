
import Database from 'better-sqlite3';
const db = new Database('database.db');
const tableInfo = db.prepare("PRAGMA table_info(users)").all();
console.table(tableInfo);
db.close();
