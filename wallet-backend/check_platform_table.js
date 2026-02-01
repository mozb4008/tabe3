import Database from 'better-sqlite3';
const db = new Database('database.sqlite');

try {
    console.log("--- معلومات الجدول platform_info ---");
    const info = db.prepare("PRAGMA table_info(platform_info)").all();
    console.table(info);

    console.log("\n--- البيانات الحالية في الجدول ---");
    const data = db.prepare("SELECT * FROM platform_info").all();
    console.log(JSON.stringify(data, null, 2));

    const hasAiEnabled = info.some(c => c.name === 'ai_enabled');
    const hasTeleEnabled = info.some(c => c.name === 'telegram_enabled');

    if (!hasAiEnabled || !hasTeleEnabled) {
        console.log("\n!!! تنبيه: بعض الأعمدة مفقودة. جاري محاولة إصلاح القاعدة...");
        if (!hasAiEnabled) {
            db.prepare("ALTER TABLE platform_info ADD COLUMN ai_enabled INTEGER DEFAULT 1").run();
            console.log("تم إضافة العمود ai_enabled بنجاح.");
        }
        if (!hasTeleEnabled) {
            db.prepare("ALTER TABLE platform_info ADD COLUMN telegram_enabled INTEGER DEFAULT 1").run();
            console.log("تم إضافة العمود telegram_enabled بنجاح.");
        }
    } else {
        console.log("\nجميع الأعمدة موجودة بشكل سليم.");
    }

} catch (err) {
    console.error("حدث خطأ أثناء الفحص:", err.message);
} finally {
    db.close();
}
