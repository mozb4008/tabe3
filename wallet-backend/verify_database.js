import Database from 'better-sqlite3';

const db = new Database('database.db');

console.log("--------------------------------------------------");
console.log("🏠 التحقق من بيانات المنصة في قاعدة البيانات (ESM)");
console.log("--------------------------------------------------");

try {
    const info = db.prepare("SELECT * FROM platform_info LIMIT 1").get();

    if (info) {
        console.log("✅ البيانات الموجودة حالياً:");
        console.log(`- الاسم: ${info.name}`);
        console.log(`- الوصف: ${info.description}`);
        console.log(`- مسار الشعار: ${info.logo_path || 'لا يوجد شعار'}`);
        console.log(`- آخر تحديث: ${info.updated_at}`);
    } else {
        console.log("❌ لا توجد بيانات مسجلة في جدول platform_info");
    }
} catch (err) {
    console.error("⚠️ خطأ أثناء القراءة من قاعدة البيانات:", err.message);
} finally {
    db.close();
}
console.log("--------------------------------------------------");
