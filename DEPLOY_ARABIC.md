# دليل رفع مشروع "المعقب الذكي" على سيرفر Hostinger (VPS)

هذا الدليل يشرح لك الخطوات بالتفصيل لرفع وتشغيل المشروع من الصفر على السيرفر، مع ضمان الحماية وتفعيل شهادة الأمان (HTTPS).

## الخطوة 1: الدخول على السيرفر وتهيئة البيئة
باستخدام برنامج مثل (Putty) أو (Windows Terminal)، قم بالدخول على السيرفر عبر SSH، ثم نفذ الأوامر التالية لتثبيت البرامج الأساسية:

```bash
# 1. تحديث النظام
sudo apt update && sudo apt upgrade -y

# 2. تثبيت Node.js (الإصدار 20 المستقر)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. تثبيت PM2 (لضمان بقاء المشروع يعمل حتى بعد إغلاق الشاشة أو إعادة تشغيل السيرفر)
sudo npm install -g pm2

# 4. تثبيت Nginx (ليعمل كبوابة أمان واستقبال الطلبات من الويب)
sudo apt install nginx -y
```

---

## الخطوة 2: تحميل المشروع من GitHub
بدلاً من رفع الملفات يدوياً، سنقوم بتحميل المشروع مباشرة من GitHub:

```bash
# الانتقال إلى مجلد المواقع
cd /var/www

# تحميل المشروع (تأكد من تثبيت git أولاً: sudo apt install git -y)
sudo git clone https://github.com/AbdulmosenAlmuzaini/tabe3-end.git smart-wallet

# تغيير ملكية المجلد للمستخدم الحالي (للسماح بالتعديل)
sudo chown -R $USER:$USER /var/www/smart-wallet

cd /var/www/smart-wallet
```

---

## الخطوة 3: إعداد قاعدة البيانات والخلفية (Backend)
بعد الرفع، انتقل إلى مجلد الخلفية:

```bash
cd /var/www/smart-wallet/wallet-backend

# تثبيت المكتبات اللازمة
npm install

# إنشاء ملف الإعدادات السري
cp .env.example .env

# تعديل ملف الإعدادات
nano .env
```
**ملاحظة هامة:** قم بتغيير `JWT_SECRET` إلى نص طويل وعشوائي جداً، وضع كلمات مرور قوية لضمان عدم اختراق النظام.

---

## الخطوة 4: بناء الواجهة الأمامية (Frontend)
قبل التشغيل، نحتاج لتحويل كود الواجهة إلى ملفات جاهزة للإنتاج:

```bash
cd /var/www/smart-wallet/wallet-frontend

# تثبيت المكتبات
npm install

# بناء المشروع (سيتم إنشاء مجلد باسم dist)
npm run build

# نقل ملفات الواجهة الجاهزة إلى مجلد الخلفية ليتم تشغيلها معاً
cp -r dist ../wallet-backend/
```

---

## الخطوة 5: تشغيل المشروع بشكل دائم (PM2)
عد لمجلد الخلفية وقم بتشغيل الخادم:

```bash
cd /var/www/smart-wallet/wallet-backend

# تشغيل المشروع باسم smart-wallet
pm2 start server.js --name "smart-wallet"

# حفظ الحالة ليعمل تلقائياً عند إعادة تشغيل السيرفر
pm2 save
pm2 startup
```

---

## الخطوة 6: إعداد النginx وشهادة HTTPS (الأمان)
نحتاج الآن لربط الرابط الخاص بك (Domain) بالمشروع وتفعيل القفل الأخضر (SSL).

1. قم بإنشاء ملف إعدادات:
`sudo nano /etc/nginx/sites-available/smart-wallet`

2. ضع النص التالي فيه (استبدل `your-domain.com` برابط موقعك):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. تفعيل الموقع وإعادة تشغيل Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/smart-wallet /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

4. **تفعيل شهادة SSL مجاناً (HTTPS):**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## ملاحظات أمنية أخيرة:
*   **الجدار الناري:** تأكد من إغلاق المنفذ `3001` في لوحة تحكم Hostinger، واترك فقط المنفذ `80` و `443` مفتوحين.
*   **كلمة المرور:** لا تترك كلمة المرور الافتراضية، قم بتعديلها فوراً من صفحة الإعدادات داخل الموقع بعد الرفع.
*   **النسخ الاحتياطي:** المشروع يقوم بإرسال نسخة قاعدة البيانات لبريدك يومياً الساعة 3 فجراً (تأكد من إعداد بيانات البريد في ملف `.env`).
