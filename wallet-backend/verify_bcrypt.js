
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

const db = new Database('database.db');
const expectedPass = "Abd@0562292199";

try {
    const admin = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
    if (!admin) {
        console.log("Admin NOT found!");
    } else {
        const ok = bcrypt.compareSync(expectedPass, admin.password);
        console.log(`Password comparison for '${expectedPass}': ${ok}`);

        // Test a common mistake (Aa@...)
        const altPass = "Aa@0562292199";
        const ok2 = bcrypt.compareSync(altPass, admin.password);
        console.log(`Password comparison for '${altPass}': ${ok2}`);
    }
} catch (err) {
    console.error(err);
} finally {
    db.close();
}
