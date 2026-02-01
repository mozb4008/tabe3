const Database = require('better-sqlite3');
const db = new Database('wallet-backend/db.sqlite');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE name='institution_platforms'").get();
console.log(schema.sql);
process.exit(0);
