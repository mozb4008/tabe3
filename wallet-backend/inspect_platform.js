
import Database from 'better-sqlite3';
const db = new Database('database.db');
try {
    const info = db.prepare("SELECT * FROM platform_info").all();
    console.log("Platform Info in DB:");
    console.table(info);
} catch (err) {
    console.error(err);
} finally {
    db.close();
}
