
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
const db = new Database('database.db');

const name = "محمد علي";
const username = "147963";
const password = "password123";
const email = "a.abdulmosen@gmail.com";
const role = "viewer";
const institution_id = 4;

try {
    const hash = bcrypt.hashSync(password, 10);
    const info = db.prepare(`
    INSERT INTO users (name, username, password, email, role, institution_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, username, hash, email, role, institution_id);
    console.log("Insert Success:", info);
} catch (err) {
    console.error("Insert Failed:", err.message);
} finally {
    db.close();
}
