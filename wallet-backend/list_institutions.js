
import Database from 'better-sqlite3';
const db = new Database('database.db');
const insts = db.prepare("SELECT id, name FROM institutions").all();
console.table(insts);
db.close();
