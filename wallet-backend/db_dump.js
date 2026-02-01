const Database = require('better-sqlite3');
const db = new Database('database.db');

try {
    const rows = db.prepare("SELECT * FROM platform_info").all();
    console.log("PLATFORM_INFO_ROWS:", JSON.stringify(rows, null, 2));

    const count = db.prepare("SELECT count(*) as count FROM platform_info").get();
    console.log("TOTAL_COUNT:", count.count);
} catch (err) {
    console.error("INSPECTION_ERROR:", err.message);
} finally {
    db.close();
}
