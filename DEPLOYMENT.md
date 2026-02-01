# دليل رفع مشروع محقّب الذاتي على Hostinger VPS

يحتوي هذا الملف على الخطوات الكاملة لتهيئة السيرفر ورفع المشروع بشكل آمن.

## 1. المتطلبات الأساسية على السيرفر
بعد الدخول على السيرفر عبر SSH، تأكد من تثبيت البرامج التالية:
```bash
# تحديث السيرفر
sudo apt update && sudo apt upgrade -y

# تثبيت Node.js (الإصدار 20 أو أحدث)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# تثبيت PM2 لإدارة العمليات
sudo npm install -g pm2

# تثبيت Nginx كمحرك ويب (Reverse Proxy)
sudo apt install nginx -y
```

## 2. Setting up the Project
Clone the repository directly to your server:

```bash
cd /var/www
sudo git clone https://github.com/AbdulmosenAlmuzaini/tabe3-end.git smart-wallet
sudo chown -R $USER:$USER /var/www/smart-wallet
cd smart-wallet
```

### A. Backend Setup
```bash
cd wallet-backend
npm install
cp .env.example .env
# قم بتعديل ملف .env ووضع قيم سرية
nano .env
```

### ب. بناء الواجهة الأمامية (Frontend)
```bash
cd ../wallet-frontend
npm install
npm run build
# انقل ملفات build إلى مجلد الخلفية
cp -r dist ../wallet-backend/
```

## 3. تشغيل المشروع باستخدام PM2
داخل مجلد `wallet-backend`:
```bash
pm2 start server.js --name "smart-wallet"
pm2 save
pm2 startup
```

## 4. إعداد Nginx وشهادة SSL
قم بإنشاء ملف إعدادات للموقع:
```bash
sudo nano /etc/nginx/sites-available/smart-wallet
```
ضع الإعدادات التالية (استبدل `yourdomain.com` بنطاقك):
```nginx
server {
    listen 80;
    server_name yourdomain.com;

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
تفعيل الإعدادات:
```bash
sudo ln -s /etc/nginx/sites-available/smart-wallet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### تفعيل HTTPS (اختياري ولكن مهم جداً)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

## 5. ملاحظات أمنية هامة
- تأكد من أن منفذ `3001` مغلق في الجدار الناري للسيرفر (Access through Nginx only).
- ملف `database.db` يتم نسخه يومياً تلقائياً عبر البريد (تأكد من إعداد SMTP في `.env`).
- لا تشارك ملف `.env` مع أي شخص.
