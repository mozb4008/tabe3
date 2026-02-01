import Database from 'better-sqlite3';
const db = new Database('database.db');

try {
    console.log("--- فحص وإصلاح هيكل قاعدة البيانات ---");
    const info = db.prepare("PRAGMA table_info(platform_info)").all();
    const existingCols = info.map(c => c.name);

    const requiredCols = [
        { name: 'ai_api_key', type: 'TEXT' },
        { name: 'ai_enabled', type: 'INTEGER DEFAULT 1' },
        { name: 'telegram_token', type: 'TEXT' },
        { name: 'telegram_chat_id', type: 'TEXT' },
        { name: 'telegram_enabled', type: 'INTEGER DEFAULT 1' }
    ];

    requiredCols.forEach(col => {
        if (!existingCols.includes(col.name)) {
            console.log(`جاري إضافة العمود: ${col.name}...`);
            db.prepare(`ALTER TABLE platform_info ADD COLUMN ${col.name} ${col.type}`).run();
            console.log(`تم إضافة ${col.name} بنجاح.`);
        } else {
            console.log(`العمود ${col.name} موجود بالفعل.`);
        }
    });

    console.log("\n--- الهيكل النهائي للجدول ---");
    const finalInfo = db.prepare("PRAGMA table_info(platform_info)").all();
    console.table(finalInfo);

} catch (err) {
    console.error("خطأ:", err.message);
} finally {
    db.close();
}
