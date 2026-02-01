
import Database from 'better-sqlite3';
const db = new Database('database.db');
const users = db.prepare("SELECT id, username, email FROM users").all();
console.table(users);
db.close();
