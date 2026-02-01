
import Database from 'better-sqlite3';

const db = new Database('database.db');

try {
    const users = db.prepare("SELECT id, username, role FROM users").all();
    console.log("Current Users in DB:");
    console.table(users);

    const admin = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
    if (admin) {
        console.log("Admin User Details found.");
    } else {
        console.log("Admin User 'admin' NOT FOUND.");
    }
} catch (err) {
    console.error("Database Inspection Error:", err);
} finally {
    db.close();
}
