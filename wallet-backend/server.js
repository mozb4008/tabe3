import "dotenv/config";
import express from "express";
import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
import nodemailer from "nodemailer";
import cron from "node-cron";
import axios from "axios";

// ================== CONFIG ==================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_ME_SUPER_SECRET";
const DB_FILE = "database.db";

// ================== MIDDLEWARE ==================
app.use(express.json());
app.use(cookieParser());

// Robust Security Headers (Manual equivalent of helmet basic)
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none';");
  next();
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// General Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: "طلب زائد، يرجى المحاولة لاحقاً" }
});
app.use(generalLimiter);

// Strict Rate Limiter for Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Max 10 attempts per 15 minutes
  message: { message: "محاولات دخول كثيرة جداً، يرجى الانتظار 15 دقيقة" }
});

// No-cache middleware for API
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// ================== FILE STORAGE ==================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("نوع الملف غير مسموح به (فقط صور، PDF، ملفات مكتبية)"));
    }
  }
});


// ================== DATABASE ==================
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// USERS
const userTableCheck = db.prepare("SELECT sql FROM sqlite_master WHERE name='users'").get();
if (userTableCheck && (userTableCheck.sql.includes("email TEXT UNIQUE NOT NULL") || !userTableCheck.sql.includes("institution_id"))) {
  // Migration: recreate users table to relax email constraints
  console.log("🔄 Migrating users table to relax constraints...");
  db.prepare("ALTER TABLE users RENAME TO users_old").run();
  db.prepare(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('viewer','entry','admin')) NOT NULL,
      institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    `).run();
  try {
    const hasInstId = userTableCheck.sql.includes("institution_id");
    db.prepare(`
      INSERT INTO users (id, username, name, email, password, role, created_at ${hasInstId ? ", institution_id" : ""})
      SELECT id, username, name, email, password, role, created_at ${hasInstId ? ", institution_id" : ""} FROM users_old
    `).run();
    db.prepare("DROP TABLE users_old").run();
    console.log("✅ Users table migration complete.");
  } catch (err) {
    console.error("❌ Users migration failed:", err);
  }
} else if (!userTableCheck) {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('viewer','entry','admin')) NOT NULL,
      institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    `).run();
}
// SETTINGS (Property Types, Categories & Names)
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE name='settings'").get();
if (schema && !schema.sql.includes("'nationality'")) {
  console.log("🔄 Migrating settings table for more types...");
  db.prepare("ALTER TABLE settings RENAME TO settings_old").run();
  db.prepare(`
    CREATE TABLE settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('property_type','category','person','nationality','activity','entity')) NOT NULL,
      UNIQUE(name, type)
    )
  `).run();
  try {
    db.prepare("INSERT INTO settings (id, name, type) SELECT id, name, type FROM settings_old").run();
    db.prepare("DROP TABLE settings_old").run();
    console.log("✅ Migration complete.");
  } catch (err) {
    console.error("❌ Migration failed, restoring old table:", err);
  }
} else if (!schema) {
  db.prepare(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('property_type','category','person','nationality','activity','entity')) NOT NULL,
    UNIQUE(name, type)
  )
  `).run();
}

// OPERATIONS (Enhanced for Phase 9)
db.prepare(`
CREATE TABLE IF NOT EXISTS operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  property_type TEXT,
  reference_number TEXT,
  amount REAL NOT NULL,
  category TEXT,
  description TEXT,
  attachment_path TEXT,
  type TEXT CHECK(type IN ('in','out')) NOT NULL,
  created_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(created_by) REFERENCES users(id)
)
`).run();

// TRANSFERS (Phase 14)
db.prepare(`
CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  person_name TEXT NOT NULL,
  amount REAL NOT NULL,
  attachment_path TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(created_by) REFERENCES users(id)
)
`).run();

// INSTITUTIONS
db.prepare(`
CREATE TABLE IF NOT EXISTS institutions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  mobile TEXT NOT NULL,
  activity TEXT,
  email TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
`).run();

// PLATFORM IDENTITY & CONFIG
const piSchema = db.prepare("SELECT sql FROM sqlite_master WHERE name='platform_info'").get();
if (piSchema) {
  const piCols = [
    { name: 'ai_api_key', type: 'TEXT' },
    { name: 'telegram_token', type: 'TEXT' },
    { name: 'telegram_chat_id', type: 'TEXT' },
    { name: 'ai_enabled', type: 'INTEGER DEFAULT 1' },
    { name: 'telegram_enabled', type: 'INTEGER DEFAULT 1' }
  ];
  piCols.forEach(col => {
    if (!piSchema.sql.includes(col.name)) {
      db.prepare(`ALTER TABLE platform_info ADD COLUMN ${col.name} ${col.type}`).run();
    }
  });
} else {
  db.prepare(`
    CREATE TABLE platform_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      logo_path TEXT,
      ai_api_key TEXT,
      ai_enabled INTEGER DEFAULT 1,
      telegram_token TEXT,
      telegram_chat_id TEXT,
      telegram_enabled INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    `).run();
}

// Initialize generic platform info if empty
const platInfoCount = db.prepare("SELECT count(*) as count FROM platform_info").get();
if (platInfoCount.count === 0) {
  db.prepare("INSERT INTO platform_info (name, description) VALUES (?, ?)").run("تابع", "إدارة الخدمات للمؤسسات والشركات");
}

// INSTITUTION PLATFORMS (Subscriptions)
const platSchema = db.prepare("SELECT sql FROM sqlite_master WHERE name='institution_platforms'").get();
if (platSchema) {
  const columns = ['category', 'start_date', 'expiry_date', 'due_date', 'reference_number', 'document_path'];
  columns.forEach(col => {
    if (!platSchema.sql.includes(col)) {
      console.log(`🔄 Adding column ${col} to institution_platforms...`);
      db.prepare(`ALTER TABLE institution_platforms ADD COLUMN ${col} TEXT`).run();
    }
  });
} else {
  db.prepare(`
  CREATE TABLE IF NOT EXISTS institution_platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    institution_id INTEGER NOT NULL,
    platform_name TEXT NOT NULL,
    status TEXT CHECK(status IN ('active','expired','warning')) NOT NULL,
    category TEXT,
    start_date TEXT,
    expiry_date TEXT,
    due_date TEXT,
    reference_number TEXT,
    document_path TEXT,
    FOREIGN KEY(institution_id) REFERENCES institutions(id) ON DELETE CASCADE
  )
  `).run();
}

// PLATFORM SERVICES (SUB-ENTITY)
db.prepare(`
CREATE TABLE IF NOT EXISTS platform_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_id INTEGER NOT NULL,
  service_name TEXT NOT NULL,
  start_date TEXT,
  expiry_date TEXT,
  document_path TEXT,
  FOREIGN KEY(platform_id) REFERENCES institution_platforms(id) ON DELETE CASCADE
)
`).run();

// INSTITUTION EMPLOYEES
const empSchema = db.prepare("SELECT sql FROM sqlite_master WHERE name='institution_employees'").get();
if (empSchema) {
  const empCols = ['nationality', 'salary'];
  empCols.forEach(col => {
    if (!empSchema.sql.includes(col)) {
      console.log(`🔄 Adding column ${col} to institution_employees...`);
      db.prepare(`ALTER TABLE institution_employees ADD COLUMN ${col} TEXT`).run();
    }
  });
} else {
  db.prepare(`
  CREATE TABLE IF NOT EXISTS institution_employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    institution_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    position TEXT,
    mobile TEXT,
    email TEXT,
    nationality TEXT,
    salary REAL,
    FOREIGN KEY(institution_id) REFERENCES institutions(id) ON DELETE CASCADE
  )
  `).run();
}

// EMPLOYEE SERVICES (SUB-ENTITY)
db.prepare(`
CREATE TABLE IF NOT EXISTS employee_services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  service_name TEXT NOT NULL,
  start_date TEXT,
  expiry_date TEXT,
  document_path TEXT,
  FOREIGN KEY(employee_id) REFERENCES institution_employees(id) ON DELETE CASCADE
)
`).run();

// INSTITUTION VIOLATIONS
db.prepare(`
CREATE TABLE IF NOT EXISTS institution_violations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL,
  violation_number TEXT NOT NULL,
  authority TEXT,
  violation_article TEXT,
  amount REAL,
  violation_date TEXT,
  objection_start_date TEXT,
  objection_end_date TEXT,
  notes TEXT,
  document_path TEXT,
  FOREIGN KEY(institution_id) REFERENCES institutions(id) ON DELETE CASCADE
)
`).run();

// INSTITUTION INVOICES
db.prepare(`
CREATE TABLE IF NOT EXISTS institution_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  amount REAL NOT NULL,
  fines REAL DEFAULT 0,
  status TEXT CHECK(status IN ('paid', 'unpaid', 'overdue')) NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(institution_id) REFERENCES institutions(id) ON DELETE CASCADE
)
`).run();

// USERS MIGRATION (institution_id)
const userSchema = db.prepare("SELECT sql FROM sqlite_master WHERE name='users'").get();
if (userSchema && !userSchema.sql.includes("institution_id")) {
  console.log("🔄 Adding column institution_id to users...");
  db.prepare("ALTER TABLE users ADD COLUMN institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL").run();
}

// TASKS
db.prepare(`
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  national_id TEXT,
  mobile TEXT,
  dob TEXT,
  marital_status TEXT,
  address TEXT,
  email TEXT,
  task_title TEXT NOT NULL,
  task_date TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
`).run();

// APPOINTMENTS
db.prepare(`
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'completed')) DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(institution_id) REFERENCES institutions(id) ON DELETE CASCADE
)
`).run();

// ================== CREATE DEFAULT ADMIN ==================
const adminUsername = "admin";
const adminPass = process.env.INITIAL_ADMIN_PASSWORD || "Abd@0562292199";

const adminRow = db
  .prepare("SELECT id FROM users WHERE username = ?")
  .get(adminUsername);

if (!adminRow) {
  const hash = bcrypt.hashSync(adminPass, 10);
  db.prepare(`
    INSERT INTO users (username, name, email, password, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(adminUsername, "Admin", "admin@wallet.local", hash, "admin");

  console.log(`✅ Admin user created: ${adminUsername}`);
}
// Note: We don't update password on every restart anymore for security. 
// Use the Settings page to change passwords.


// Ensure default entry and viewer users
const entryUser = db.prepare("SELECT id FROM users WHERE username = 'entry'").get();
if (!entryUser) {
  const hash = bcrypt.hashSync("entry123", 10);
  db.prepare("INSERT INTO users (username, name, email, password, role) VALUES (?, ?, ?, ?, ?)").run("entry", "مدخل بيانات", "entry@wallet.local", hash, "entry");
  console.log("✅ Entry user created: entry");
}

const viewerUser = db.prepare("SELECT id FROM users WHERE username = 'viewer'").get();
if (!viewerUser) {
  const hash = bcrypt.hashSync("viewer123", 10);
  db.prepare("INSERT INTO users (username, name, email, password, role) VALUES (?, ?, ?, ?, ?)").run("viewer", "مشاهد", "viewer@wallet.local", hash, "viewer");
  console.log("✅ Viewer user created: viewer");
}

// ================== EMAIL BACKUP LOGIC ==================
export async function sendBackupEmail() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const recipient = process.env.BACKUP_EMAIL || "a.abdulmosen@gmail.com";

  if (!smtpUser || !smtpPass) {
    console.warn("⚠️ SMTP credentials missing. Backup skipped.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: smtpUser, pass: smtpPass },
  });

  const mailOptions = {
    from: `"backup-tabe3" <${smtpUser}>`,
    to: recipient,
    subject: `Daily Backup - ${new Date().toLocaleDateString()}`,
    text: "Attached is the daily database backup.",
    attachments: [{ filename: "database.db", path: path.join(__dirname, DB_FILE) }],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("📧 Backup email sent successfully to", recipient);
  } catch (err) {
    console.error("❌ Failed to send backup email:", err);
    throw err;
  }
}

// Schedule: Daily at 3:00 AM
cron.schedule("0 3 * * *", () => {
  console.log("⏰ Running scheduled backup...");
  sendBackupEmail().catch(console.error);
});

// ================== AUTH HELPERS ==================
function auth(requiredRoles = []) {
  return (req, res, next) => {
    try {
      const token = req.cookies.token;
      if (!token) return res.status(401).json({ message: "Unauthorized" });

      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      console.log(`Auth check for ${decoded.username} (${decoded.role}) - Path: ${req.path}`);

      if (
        requiredRoles.length &&
        !requiredRoles.includes(decoded.role)
      ) {
        console.log(`Auth failed: Role ${decoded.role} not in [${requiredRoles.join(", ")}]`);
        return res.status(403).json({ message: "Forbidden" });
      }

      next();
    } catch {
      res.status(401).json({ message: "Invalid token" });
    }
  };
}

// ================== VALIDATION ==================
const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

const operationSchema = z.object({
  date: z.string(),
  property_type: z.string().optional(),
  reference_number: z.string().optional(),
  amount: z.number(),
  category: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(["in", "out"]),
});


// ================== ROUTES ==================

// LOGIN
app.post("/api/login", loginLimiter, (req, res) => {
  const { username, password } = req.body;

  console.log(`Login attempt: { username: '${username}', password: '${password}' }`); // Debug log

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

  if (!user) {
    console.log("Login failed: User not found");
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    console.log("Login failed: Invalid password");
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      institution_id: user.institution_id
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    secure: process.env.NODE_ENV === "production", // Enable in production with HTTPS
    sameSite: "lax",
  });

  console.log("Login success for:", username);
  res.json({
    message: "Logged in",
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      institution_id: user.institution_id
    }
  });
});

// LOGOUT
app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

// ME
app.get("/api/me", auth(), (req, res) => {
  res.json(req.user);
});

// STATS
app.get("/api/reports", auth(), (req, res) => {
  let instId = req.user.role !== 'admin' ? req.user.institution_id : null;
  const params = instId ? [instId] : [];

  // 1. Platform Categories
  const platformCategories = db.prepare(`
    SELECT category as name, COUNT(*) as count 
    FROM institution_platforms 
    ${instId ? "WHERE institution_id = ?" : ""}
    GROUP BY category
  `).all(...params);

  // 2. Financial Summary (Invoices)
  const financialSummary = db.prepare(`
    SELECT 
      SUM(amount + fines) as total_amount,
      SUM(CASE WHEN status = 'paid' THEN (amount + fines) ELSE 0 END) as paid_amount,
      SUM(CASE WHEN status != 'paid' THEN (amount + fines) ELSE 0 END) as unpaid_amount,
      COUNT(*) as invoice_count
    FROM institution_invoices
    ${instId ? "WHERE institution_id = ?" : ""}
  `).get(...params);

  // 3. Expiry Distribution (Services & Employees)
  const expired = db.prepare(`
    SELECT COUNT(*) as count FROM platform_services s JOIN institution_platforms p ON p.id = s.platform_id 
    WHERE date(s.expiry_date) < date('now') ${instId ? "AND p.institution_id = ?" : ""}
  `).get(...params).count +
    db.prepare(`
    SELECT COUNT(*) as count FROM employee_services s JOIN institution_employees e ON e.id = s.employee_id 
    WHERE date(s.expiry_date) < date('now') ${instId ? "AND e.institution_id = ?" : ""}
  `).get(...params).count;

  const warning = db.prepare(`
    SELECT COUNT(*) as count FROM platform_services s JOIN institution_platforms p ON p.id = s.platform_id 
    WHERE date(s.expiry_date) >= date('now') AND date(s.expiry_date) <= date('now', '+30 days') ${instId ? "AND p.institution_id = ?" : ""}
  `).get(...params).count +
    db.prepare(`
    SELECT COUNT(*) as count FROM employee_services s JOIN institution_employees e ON e.id = s.employee_id 
    WHERE date(s.expiry_date) >= date('now') AND date(s.expiry_date) <= date('now', '+30 days') ${instId ? "AND e.institution_id = ?" : ""}
  `).get(...params).count;

  res.json({
    platformCategories,
    finances: financialSummary,
    expiries: { expired, warning }
  });
});

app.get("/api/stats", auth(), (req, res) => {
  let instId = req.user.role !== 'admin' ? req.user.institution_id : null;
  const params = instId ? [instId] : [];

  // Summary Counts
  const institutions = db.prepare(`SELECT COUNT(*) as count FROM institutions ${instId ? "WHERE id = ?" : ""}`).get(...params).count;
  const platforms = db.prepare(`SELECT COUNT(*) as count FROM institution_platforms ${instId ? "WHERE institution_id = ?" : ""}`).get(...params).count;

  // Unpaid Invoices
  const unpaidInvoices = db.prepare(`SELECT COUNT(*) as count FROM institution_invoices WHERE ${instId ? "institution_id = ? AND " : ""} status != 'paid'`).get(...params).count;

  // Upcoming Appointments (Today/Tomorrow)
  const upcomingAppts = db.prepare(`SELECT COUNT(*) as count FROM appointments WHERE ${instId ? "institution_id = ? AND " : ""} status = 'approved' AND date >= date('now') AND date <= date('now', '+1 day')`).get(...params).count;

  // Fetch Detailed Alerts (Expired & Warning)
  const alerts = [];

  // Platform Alerts
  const platAlerts = db.prepare(`
    SELECT s.service_name, s.expiry_date, p.platform_name, i.name as institution_name, p.institution_id
    FROM platform_services s
    JOIN institution_platforms p ON p.id = s.platform_id
    JOIN institutions i ON i.id = p.institution_id
    WHERE (date(s.expiry_date) <= date('now', '+30 days'))
    ${instId ? " AND i.id = ?" : ""}
  `).all(...params);

  platAlerts.forEach(a => {
    const isExpired = new Date(a.expiry_date) < new Date();
    alerts.push({
      type: 'service',
      level: isExpired ? 'danger' : 'warning',
      title: `${a.platform_name} - ${a.service_name}`,
      subtitle: a.institution_name,
      date: a.expiry_date,
      institution_id: a.institution_id
    });
  });

  // Appointment Alerts (Today's approved)
  const apptAlerts = db.prepare(`
    SELECT a.title, a.time, a.date, i.name as institution_name, a.institution_id
    FROM appointments a
    JOIN institutions i ON i.id = a.institution_id
    WHERE a.status = 'approved' AND a.date = date('now')
    ${instId ? " AND i.id = ?" : ""}
  `).all(...params);

  apptAlerts.forEach(a => {
    alerts.push({
      type: 'appointment',
      level: 'warning',
      title: `موعد اليوم: ${a.title}`,
      subtitle: `${a.institution_name} - في تمام الساعة ${a.time}`,
      date: a.date,
      institution_id: a.institution_id
    });
  });

  // Employee Alerts
  const empAlerts = db.prepare(`
    SELECT s.service_name, s.expiry_date, e.name as employee_name, i.name as institution_name, e.institution_id
    FROM employee_services s
    JOIN institution_employees e ON e.id = s.employee_id
    JOIN institutions i ON i.id = e.institution_id
    WHERE (date(s.expiry_date) <= date('now', '+30 days'))
    ${instId ? " AND i.id = ?" : ""}
  `).all(...params);

  empAlerts.forEach(a => {
    const isExpired = new Date(a.expiry_date) < new Date();
    alerts.push({
      type: 'employee',
      level: isExpired ? 'danger' : 'warning',
      title: `${a.employee_name} - ${a.service_name}`,
      subtitle: a.institution_name,
      date: a.expiry_date,
      institution_id: a.institution_id
    });
  });

  // Invoice Alerts (Unpaid and near due date)
  const invoiceAlerts = db.prepare(`
    SELECT invoice_number, due_date, amount, i.name as institution_name, inv.institution_id
    FROM institution_invoices inv
    JOIN institutions i ON i.id = inv.institution_id
    WHERE status != 'paid' AND (date(due_date) <= date('now', '+7 days'))
    ${instId ? " AND i.id = ?" : ""}
  `).all(...params);

  invoiceAlerts.forEach(inv => {
    const isOverdue = new Date(inv.due_date) < new Date();
    alerts.push({
      type: 'invoice',
      level: isOverdue ? 'danger' : 'warning',
      title: `فاتورة غير مسددة #${inv.invoice_number}`,
      subtitle: `${inv.institution_name} - بقيمة ${inv.amount} ريال`,
      date: inv.due_date,
      institution_id: inv.institution_id
    });
  });

  // Sort: Danger first, then nearest date
  alerts.sort((a, b) => {
    if (a.level === 'danger' && b.level !== 'danger') return -1;
    if (a.level !== 'danger' && b.level === 'danger') return 1;
    return new Date(a.date) - new Date(b.date);
  });

  res.json({
    institutions,
    platforms,
    unpaidInvoices,
    upcomingAppts,
    expired: alerts.filter(a => a.level === 'danger').length,
    warning: alerts.filter(a => a.level === 'warning').length,
    alerts: alerts.slice(0, 15)
  });
});

// BACKUP TEST
app.post("/api/admin/backup-now", auth(["admin"]), async (req, res) => {
  try {
    await sendBackupEmail();
    res.json({ message: "تم إرسال النسخة الاحتياطية بنجاح إلى بريدك" });
  } catch (err) {
    res.status(500).json({ message: "فشل إرسال النسخة الاحتياطية: " + err.message });
  }
});

// ================== SETTINGS ==================
app.get("/api/settings", auth(), (req, res) => {
  const rows = db.prepare("SELECT * FROM settings").all();
  res.json(rows);
});

app.post("/api/settings", auth(["admin"]), (req, res) => {
  const { name, type } = req.body;
  try {
    db.prepare("INSERT INTO settings (name, type) VALUES (?, ?)").run(name, type);
    res.json({ message: "Setting added" });
  } catch {
    res.status(400).json({ message: "Already exists" });
  }
});

app.delete("/api/settings/:id", auth(["admin"]), (req, res) => {
  db.prepare("DELETE FROM settings WHERE id = ?").run(req.params.id);
  res.json({ message: "Deleted" });
});

// ================== OPERATIONS ==================

// ADD OPERATION
app.post("/api/operations", auth(["entry", "admin"]), upload.single("attachment"), (req, res) => {
  // Use manual parsing if multipart (zod doesn't handle strings-as-numbers in FormData easily without preprocess)
  const body = req.body;
  const amount = parseFloat(body.amount);

  if (!body.date || isNaN(amount) || !body.type) {
    return res.status(400).json({ message: "Invalid data" });
  }

  const attachment_path = req.file ? `/uploads/${req.file.filename}` : null;

  db.prepare(`
    INSERT INTO operations (date, property_type, reference_number, amount, category, description, attachment_path, type, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.date,
    body.property_type || null,
    body.reference_number || null,
    amount,
    body.category || null,
    body.description || null,
    attachment_path,
    body.type,
    req.user.id
  );

  res.json({ message: "Operation added" });
});

// LIST + SEARCH OPERATIONS
app.get("/api/operations", auth(), (req, res) => {
  const q = req.query.q || "";
  const category = req.query.category;
  const property_type = req.query.property_type;

  let sql = `
    SELECT o.*, u.name AS created_by_name
    FROM operations o
    LEFT JOIN users u ON u.id = o.created_by
    WHERE (o.reference_number LIKE ? OR o.description LIKE ?)
  `;
  const params = [`%${q}%`, `%${q}%`];

  if (category) {
    sql += " AND o.category = ?";
    params.push(category);
  }
  if (property_type) {
    sql += " AND o.property_type = ?";
    params.push(property_type);
  }

  sql += " ORDER BY o.date DESC";

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// DELETE OPERATION
app.delete("/api/operations/:id", auth(["admin"]), (req, res) => {
  db.prepare("DELETE FROM operations WHERE id = ?")
    .run(req.params.id);

  res.json({ message: "Deleted" });
});

// STATS (Dashboard)
app.get("/api/stats", auth(), (req, res) => {
  const opStats = db.prepare(`
    SELECT 
      SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END) as total_in,
      SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END) as total_out
    FROM operations
  `).get();

  const transferStats = db.prepare(`
    SELECT SUM(amount) as total_transfers FROM transfers
  `).get();

  // Category breakdown
  const categoryStats = db.prepare(`
    SELECT category, SUM(amount) as total
    FROM operations 
    WHERE type = 'out' 
    GROUP BY category 
    ORDER BY total DESC
  `).all();

  // Person breakdown
  const personStats = db.prepare(`
    SELECT person_name, SUM(amount) as total
    FROM transfers
    GROUP BY person_name
    ORDER BY total DESC
  `).all();

  // Property breakdown
  const propertyStats = db.prepare(`
    SELECT property_type, SUM(amount) as total
    FROM operations
    GROUP BY property_type
    ORDER BY total DESC
  `).all();

  // Recent Activity (mixed)
  const recentOps = db.prepare(`
    SELECT date, amount, type, category as details, 'op' as origin
    FROM operations
    ORDER BY created_at DESC LIMIT 5
  `).all();

  const recentTrans = db.prepare(`
    SELECT date, amount, 'out' as type, person_name as details, 'tra' as origin
    FROM transfers
    ORDER BY created_at DESC LIMIT 5
  `).all();

  const total_in = opStats.total_in || 0;
  const total_out = opStats.total_out || 0;
  const total_transfers = transferStats.total_transfers || 0;

  // Balance calculation: Incomes - (Expenses + Transfers)
  const balance = total_in - (total_out + total_transfers);

  res.json({
    total_in, total_out, total_transfers, balance,
    categories: categoryStats,
    persons: personStats,
    properties: propertyStats.filter(p => p.property_type), // Skip nulls
    recent: [...recentOps, ...recentTrans].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8)
  });
});

// ================== TRANSFERS ==================

// ADD TRANSFER
app.post("/api/transfers", auth(["entry", "admin"]), upload.single("attachment"), (req, res) => {
  const body = req.body;
  const amount = parseFloat(body.amount);

  if (!body.date || isNaN(amount) || !body.person_name) {
    return res.status(400).json({ message: "Invalid data" });
  }

  const attachment_path = req.file ? `/uploads/${req.file.filename}` : null;

  db.prepare(`
    INSERT INTO transfers (date, person_name, amount, attachment_path, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(body.date, body.person_name, amount, attachment_path, req.user.id);

  res.json({ message: "Transfer added" });
});

// LIST TRANSFERS
app.get("/api/transfers", auth(), (req, res) => {
  const person_name = req.query.person_name;
  let sql = `
    SELECT t.*, u.name AS created_by_name
    FROM transfers t
    LEFT JOIN users u ON u.id = t.created_by
  `;
  const params = [];

  if (person_name) {
    sql += " WHERE t.person_name = ?";
    params.push(person_name);
  }

  sql += " ORDER BY t.date DESC";

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// DELETE TRANSFER
app.delete("/api/transfers/:id", auth(["admin"]), (req, res) => {
  db.prepare("DELETE FROM transfers WHERE id = ?").run(req.params.id);
  res.json({ message: "Deleted" });
});

// ================== USERS ==================

// Consolidated Users API section moved to the bottom for clarity and consistency

// Helper to check if user has access to a specific institution
const verifyOwner = (req, institutionId) => {
  if (req.user.role === 'admin') return true;
  if (!req.user.institution_id) return false;
  return parseInt(req.user.institution_id) === parseInt(institutionId);
};

// ================== INSTITUTIONS API ==================
app.get("/api/institutions", auth(), (req, res) => {
  let sql = "SELECT * FROM institutions";
  const params = [];
  if (req.user.role !== 'admin' && req.user.institution_id) {
    sql += " WHERE id = ?";
    params.push(req.user.institution_id);
  }
  sql += " ORDER BY created_at DESC";
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

app.get("/api/institutions/:id", auth(), (req, res) => {
  if (!verifyOwner(req, req.params.id)) {
    return res.status(403).json({ message: "Forbidden: Access denied to this institution" });
  }
  const inst = db.prepare("SELECT * FROM institutions WHERE id = ?").get(req.params.id);
  if (!inst) return res.status(404).json({ message: "Not found" });

  const platforms = db.prepare("SELECT * FROM institution_platforms WHERE institution_id = ?").all(req.params.id);

  // Fetch services for each platform
  const platformsWithServices = platforms.map(p => {
    const services = db.prepare("SELECT * FROM platform_services WHERE platform_id = ?").all(p.id);
    return { ...p, services };
  });

  const employees = db.prepare("SELECT * FROM institution_employees WHERE institution_id = ?").all(req.params.id);

  // Fetch services for each employee
  const employeesWithServices = employees.map(e => {
    const services = db.prepare("SELECT * FROM employee_services WHERE employee_id = ?").all(e.id);
    return { ...e, services };
  });

  const violations = db.prepare("SELECT * FROM institution_violations WHERE institution_id = ?").all(req.params.id);

  const invoices = db.prepare("SELECT * FROM institution_invoices WHERE institution_id = ? ORDER BY invoice_date DESC").all(req.params.id);
  const appointments = db.prepare("SELECT * FROM appointments WHERE institution_id = ? ORDER BY date DESC, time ASC").all(req.params.id);

  res.json({ ...inst, platforms: platformsWithServices, employees: employeesWithServices, violations, invoices, appointments });
});

app.post("/api/institutions", auth(["admin"]), (req, res) => {
  const { name, owner, mobile, activity, email } = req.body;
  const result = db.prepare(`
    INSERT INTO institutions (name, owner, mobile, activity, email)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, owner, mobile, activity, email);
  res.json({ message: "Institution added", id: result.lastInsertRowid });
});

app.put("/api/institutions/:id", auth(["admin"]), (req, res) => {
  if (!verifyOwner(req, req.params.id)) return res.status(403).json({ message: "Forbidden" });
  const { name, owner, mobile, activity, email } = req.body;
  db.prepare(`
    UPDATE institutions SET name = ?, owner = ?, mobile = ?, activity = ?, email = ?
    WHERE id = ?
  `).run(name, owner, mobile, activity, email, req.params.id);
  res.json({ message: "Institution updated" });
});

app.delete("/api/institutions/:id", auth(["admin"]), (req, res) => {
  db.prepare("DELETE FROM institutions WHERE id = ?").run(req.params.id);
  res.json({ message: "Institution deleted" });
});

// INSTITUTION DETAILS (Tabs)
app.post("/api/institutions/:id/platforms", auth(["admin", "entry"]), upload.single("document"), (req, res) => {
  if (!verifyOwner(req, req.params.id)) return res.status(403).json({ message: "Forbidden" });
  const { platform_name, status, category, start_date, expiry_date, due_date, reference_number } = req.body;
  const document_path = req.file ? `/uploads/${req.file.filename}` : null;

  db.prepare(`
    INSERT INTO institution_platforms (
      institution_id, platform_name, status, category, 
      start_date, expiry_date, due_date, reference_number, document_path
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.params.id, platform_name, status || 'active', category,
    start_date, expiry_date, due_date, reference_number, document_path
  );
  res.json({ message: "Platform added" });
});

app.put("/api/institutions/platforms/:id", auth(["admin", "entry"]), upload.single("document"), (req, res) => {
  const plat = db.prepare("SELECT institution_id FROM institution_platforms WHERE id = ?").get(req.params.id);
  if (!plat || !verifyOwner(req, plat.institution_id)) return res.status(403).json({ message: "Forbidden" });

  const { platform_name, status, category, start_date, expiry_date, due_date, reference_number } = req.body;
  const document_path = req.file ? `/uploads/${req.file.filename}` : null;

  let query = `
    UPDATE institution_platforms 
    SET platform_name = ?, category = ?, start_date = ?, expiry_date = ?, due_date = ?, reference_number = ?
  `;
  const params = [platform_name, category, start_date, expiry_date, due_date, reference_number];

  if (document_path) {
    query += `, document_path = ?`;
    params.push(document_path);
  }

  query += ` WHERE id = ?`;
  params.push(req.params.id);

  db.prepare(query).run(...params);
  res.json({ message: "Platform updated" });
});

app.delete("/api/institutions/platforms/:id", auth(["admin", "entry"]), (req, res) => {
  const plat = db.prepare("SELECT institution_id FROM institution_platforms WHERE id = ?").get(req.params.id);
  if (!plat || !verifyOwner(req, plat.institution_id)) return res.status(403).json({ message: "Forbidden" });

  db.prepare("DELETE FROM institution_platforms WHERE id = ?").run(req.params.id);
  res.json({ message: "Platform deleted" });
});

// PLATFORM SERVICES API
app.post("/api/platforms/:id/services", auth(["admin", "entry"]), upload.single("document"), (req, res) => {
  const plat = db.prepare("SELECT institution_id FROM institution_platforms WHERE id = ?").get(req.params.id);
  if (!plat || !verifyOwner(req, plat.institution_id)) return res.status(403).json({ message: "Forbidden" });

  const { service_name, start_date, expiry_date } = req.body;
  const document_path = req.file ? `/uploads/${req.file.filename}` : null;

  db.prepare(`
    INSERT INTO platform_services (platform_id, service_name, start_date, expiry_date, document_path)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, service_name, start_date, expiry_date, document_path);

  res.json({ message: "Service added" });
});

app.put("/api/platforms/services/:id", auth(["admin", "entry"]), upload.single("document"), (req, res) => {
  const { service_name, start_date, expiry_date } = req.body;
  const document_path = req.file ? `/uploads/${req.file.filename}` : null;

  let query = `UPDATE platform_services SET service_name = ?, start_date = ?, expiry_date = ?`;
  const params = [service_name, start_date, expiry_date];

  if (document_path) {
    query += `, document_path = ?`;
    params.push(document_path);
  }

  query += ` WHERE id = ?`;
  params.push(req.params.id);

  db.prepare(query).run(...params);
  res.json({ message: "Service updated" });
});

app.delete("/api/platforms/services/:id", auth(["admin", "entry"]), (req, res) => {
  db.prepare("DELETE FROM platform_services WHERE id = ?").run(req.params.id);
  res.json({ message: "Service deleted" });
});

// ================== INSTITUTION INVOICES API ==================
app.post("/api/institutions/:id/invoices", auth(["admin", "entry"]), (req, res) => {
  if (!verifyOwner(req, req.params.id)) return res.status(403).json({ message: "Forbidden" });
  const { invoice_number, invoice_date, due_date, amount, fines, status } = req.body;

  if (!invoice_number || !invoice_date || !due_date || !amount) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  db.prepare(`
    INSERT INTO institution_invoices (institution_id, invoice_number, invoice_date, due_date, amount, fines, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, invoice_number, invoice_date, due_date, amount, fines || 0, status || 'unpaid');

  res.json({ message: "Invoice added" });
});

app.put("/api/invoices/:id", auth(["admin", "entry"]), (req, res) => {
  const inv = db.prepare("SELECT institution_id FROM institution_invoices WHERE id = ?").get(req.params.id);
  if (!inv || !verifyOwner(req, inv.institution_id)) return res.status(403).json({ message: "Forbidden" });

  const { invoice_number, invoice_date, due_date, amount, fines, status } = req.body;

  db.prepare(`
    UPDATE institution_invoices
    SET invoice_number = ?, invoice_date = ?, due_date = ?, amount = ?, fines = ?, status = ?
    WHERE id = ?
  `).run(invoice_number, invoice_date, due_date, amount, fines || 0, status, req.params.id);

  res.json({ message: "Invoice updated" });
});

app.delete("/api/invoices/:id", auth(["admin", "entry"]), (req, res) => {
  const inv = db.prepare("SELECT institution_id FROM institution_invoices WHERE id = ?").get(req.params.id);
  if (!inv || !verifyOwner(req, inv.institution_id)) return res.status(403).json({ message: "Forbidden" });

  db.prepare("DELETE FROM institution_invoices WHERE id = ?").run(req.params.id);
  res.json({ message: "Invoice deleted" });
});


app.post("/api/institutions/:id/employees", auth(["admin", "entry"]), (req, res) => {
  if (!verifyOwner(req, req.params.id)) return res.status(403).json({ message: "Forbidden" });
  const { name, position, mobile, email, nationality, salary } = req.body;
  const result = db.prepare(`
    INSERT INTO institution_employees (institution_id, name, position, mobile, email, nationality, salary)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, name, position, mobile, email, nationality, salary);
  res.json({ message: "Employee added", id: result.lastInsertRowid });
});

app.put("/api/employees/:id", auth(["admin", "entry"]), (req, res) => {
  const emp = db.prepare("SELECT institution_id FROM institution_employees WHERE id = ?").get(req.params.id);
  if (!emp || !verifyOwner(req, emp.institution_id)) return res.status(403).json({ message: "Forbidden" });

  const { name, position, mobile, email, nationality, salary } = req.body;
  db.prepare(`
    UPDATE institution_employees 
    SET name = ?, position = ?, mobile = ?, email = ?, nationality = ?, salary = ? 
    WHERE id = ?
  `).run(name, position, mobile, email, nationality, salary, req.params.id);
  res.json({ message: "Employee updated" });
});

app.delete("/api/employees/:id", auth(["admin", "entry"]), (req, res) => {
  const emp = db.prepare("SELECT institution_id FROM institution_employees WHERE id = ?").get(req.params.id);
  if (!emp || !verifyOwner(req, emp.institution_id)) return res.status(403).json({ message: "Forbidden" });

  db.prepare("DELETE FROM institution_employees WHERE id = ?").run(req.params.id);
  res.json({ message: "Employee deleted" });
});

// EMPLOYEE SERVICES API
app.post("/api/employees/:id/services", auth(["admin", "entry"]), upload.single("document"), (req, res) => {
  const { service_name, start_date, expiry_date } = req.body;
  const document_path = req.file ? `/uploads/${req.file.filename}` : null;

  db.prepare(`
    INSERT INTO employee_services (employee_id, service_name, start_date, expiry_date, document_path)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, service_name, start_date, expiry_date, document_path);

  res.json({ message: "Service added" });
});

app.put("/api/employees/services/:id", auth(["admin", "entry"]), upload.single("document"), (req, res) => {
  const { service_name, start_date, expiry_date } = req.body;
  const document_path = req.file ? `/uploads/${req.file.filename}` : null;

  let query = `UPDATE employee_services SET service_name = ?, start_date = ?, expiry_date = ?`;
  const params = [service_name, start_date, expiry_date];

  if (document_path) {
    query += `, document_path = ?`;
    params.push(document_path);
  }

  query += ` WHERE id = ?`;
  params.push(req.params.id);

  db.prepare(query).run(...params);
  res.json({ message: "Service updated" });
});

app.delete("/api/employees/services/:id", auth(["admin", "entry"]), (req, res) => {
  db.prepare("DELETE FROM employee_services WHERE id = ?").run(req.params.id);
  res.json({ message: "Service deleted" });
});

// INSTITUTION VIOLATIONS API
app.post("/api/institutions/:id/violations", auth(["admin", "entry"]), upload.single("document"), (req, res) => {
  console.log("POST /api/institutions/:id/violations", { id: req.params.id, body: req.body, file: req.file });
  const { violation_number, authority, violation_article, amount, violation_date, objection_start_date, objection_end_date, notes } = req.body;
  const document_path = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const instId = parseInt(req.params.id);
    const numericAmount = amount ? parseFloat(amount) : null;

    db.prepare(`
      INSERT INTO institution_violations (
        institution_id, violation_number, authority, violation_article, 
        amount, violation_date, objection_start_date, objection_end_date, notes, document_path
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      instId, violation_number, authority, violation_article,
      numericAmount, violation_date, objection_start_date, objection_end_date, notes, document_path
    );
    res.json({ message: "Violation added" });
  } catch (err) {
    console.error("Violation Insert Error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.put("/api/violations/:id", auth(["admin", "entry"]), upload.single("document"), (req, res) => {
  console.log("PUT /api/violations/:id", { id: req.params.id, body: req.body, file: req.file });
  const { violation_number, authority, violation_article, amount, violation_date, objection_start_date, objection_end_date, notes } = req.body;
  const document_path = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const numericAmount = amount ? parseFloat(amount) : null;
    const vioId = parseInt(req.params.id);

    let query = `
      UPDATE institution_violations 
      SET violation_number = ?, authority = ?, violation_article = ?, amount = ?, 
          violation_date = ?, objection_start_date = ?, objection_end_date = ?, notes = ?
    `;
    const params = [violation_number, authority, violation_article, numericAmount, violation_date, objection_start_date, objection_end_date, notes];

    if (document_path) {
      query += `, document_path = ?`;
      params.push(document_path);
    }

    query += ` WHERE id = ?`;
    params.push(vioId);

    db.prepare(query).run(...params);
    res.json({ message: "Violation updated" });
  } catch (err) {
    console.error("Violation Update Error:", err);
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/violations/:id", auth(["admin", "entry"]), (req, res) => {
  db.prepare("DELETE FROM institution_violations WHERE id = ?").run(req.params.id);
  res.json({ message: "Violation deleted" });
});


// ================== EXTERNAL APPOINTMENTS ==================

// LIST APPOINTMENTS
app.get("/api/appointments", auth(), (req, res) => {
  const { status, date, institution_id } = req.query;
  let sql = `
    SELECT a.*, i.name as institution_name 
    FROM appointments a
    JOIN institutions i ON i.id = a.institution_id
  `;
  const params = [];
  const conditions = [];

  if (status) {
    conditions.push("a.status = ?");
    params.push(status);
  }
  if (date) {
    conditions.push("a.date = ?");
    params.push(date);
  }
  if (institution_id) {
    conditions.push("a.institution_id = ?");
    params.push(institution_id);
  }

  // If user is an Owner (has institution_id), restrict to their institution
  if (req.user && req.user.institution_id) {
    conditions.push("a.institution_id = ?");
    params.push(req.user.institution_id);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY a.date DESC, a.time ASC";

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// CREATE APPOINTMENT
app.post("/api/appointments", auth(["admin", "entry"]), (req, res) => {
  const { institution_id, title, date, time, description } = req.body;
  if (!institution_id || !date || !time) return res.status(400).json({ message: "Missing fields" });

  // Conflict Check
  const conflict = db.prepare(`
    SELECT id FROM appointments 
    WHERE institution_id = ? AND date = ? AND time = ? AND status = 'approved'
  `).get(institution_id, date, time);

  if (conflict) {
    return res.status(409).json({ message: "يوجد موعد مؤكد في نفس الوقت لهذه المؤسسة" });
  }

  const result = db.prepare(`
    INSERT INTO appointments (institution_id, title, date, time, description, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(institution_id, title, date, time, description || "");

  res.json({ message: "Appointment requested", id: result.lastInsertRowid });
});

// UPDATE STATUS (Approve/Reject/Complete)
app.put("/api/appointments/:id/status", auth(), (req, res) => {
  const { status, rejection_reason } = req.body;
  const { id } = req.params;

  if (!['approved', 'rejected', 'completed', 'pending'].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  // Permission check: Admin or the Owner of the institution
  const appointment = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
  if (!appointment) return res.status(404).json({ message: "Not found" });

  if (req.user.role !== 'admin') {
    if (req.user.institution_id !== appointment.institution_id) {
      return res.status(403).json({ message: "Unauthorized" });
    }
  }

  if (status === 'approved') {
    const conflict = db.prepare(`
        SELECT id FROM appointments 
        WHERE institution_id = ? AND date = ? AND time = ? AND status = 'approved' AND id != ?
      `).get(appointment.institution_id, appointment.date, appointment.time, id);

    if (conflict) return res.status(409).json({ message: "يوجد تعارض مع موعد آخر تم تأكيده" });
  }

  db.prepare(`
    UPDATE appointments 
    SET status = ?, rejection_reason = ? 
    WHERE id = ?
  `).run(status, rejection_reason || null, id);

  res.json({ message: `Appointment status updated to ${status}` });
});

// EDIT APPOINTMENT
app.put("/api/appointments/:id", auth(["admin", "entry"]), (req, res) => {
  const { title, date, time, description, institution_id } = req.body;
  const { id } = req.params;

  if (!institution_id || !date || !time) return res.status(400).json({ message: "Missing fields" });

  const appointment = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
  if (!appointment) return res.status(404).json({ message: "Not found" });

  db.prepare(`
    UPDATE appointments 
    SET title = ?, date = ?, time = ?, description = ?, institution_id = ?
    WHERE id = ?
  `).run(title, date, time, description || "", institution_id, id);

  res.json({ message: "Appointment updated" });
});

// DELETE APPOINTMENT
app.delete("/api/appointments/:id", auth(["admin"]), (req, res) => {
  db.prepare("DELETE FROM appointments WHERE id = ?").run(req.params.id);
  res.json({ message: "Appointment deleted" });
});

// ================== TASKS ROUTES ==================

// GET TASKS
app.get("/api/tasks", auth(), (req, res) => {
  const tasks = db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all();
  res.json(tasks);
});

// CREATE TASK
app.post("/api/tasks", auth(["admin", "entry"]), (req, res) => {
  const { name, national_id, mobile, dob, marital_status, address, email, task_title, task_date, notes } = req.body;

  if (!name || !task_title) {
    return res.status(400).json({ message: "Name and Task Title are required" });
  }

  const result = db.prepare(`
    INSERT INTO tasks (name, national_id, mobile, dob, marital_status, address, email, task_title, task_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, national_id, mobile, dob, marital_status, address, email, task_title, task_date || new Date().toISOString().split('T')[0], notes);

  res.json({ message: "Task created", id: result.lastInsertRowid });
});

// UPDATE TASK
app.put("/api/tasks/:id", auth(["admin", "entry"]), (req, res) => {
  const { name, national_id, mobile, dob, marital_status, address, email, task_title, task_date, notes } = req.body;
  const { id } = req.params;

  db.prepare(`
    UPDATE tasks SET 
    name = ?, national_id = ?, mobile = ?, dob = ?, marital_status = ?, 
    address = ?, email = ?, task_title = ?, task_date = ?, notes = ?
    WHERE id = ?
  `).run(name, national_id, mobile, dob, marital_status, address, email, task_title, task_date, notes, id);

  res.json({ message: "Task updated" });
});

// DELETE TASK
app.delete("/api/tasks/:id", auth(["admin"]), (req, res) => {
  db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
  res.json({ message: "Task deleted" });
});


// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error("Global Error:", err);
  res.status(500).json({
    message: err.message || "حدث خطأ داخلي في الخادم"
  });
});

// GET ALL USERS (Admin)
app.get("/api/users", auth(["admin"]), (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.username, u.email, u.role, u.institution_id, i.name as institution_name 
    FROM users u
    LEFT JOIN institutions i ON i.id = u.institution_id
  `).all();
  res.json(users);
});

// CREATE USER (Admin)
app.post("/api/users", auth(["admin"]), (req, res) => {
  const schema = z.object({
    name: z.string().min(1, "الاسم الكامل مطلوب"),
    username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
    password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
    email: z.string().email("البريد الإلكتروني غير صالح"),
    role: z.enum(["viewer", "entry", "admin"]),
    institution_id: z.union([z.string(), z.number(), z.null()]).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map(i => i.message).join(", ");
    return res.status(400).json({ message: errorMsg });
  }

  const { name, username, password, email, role, institution_id } = parsed.data;

  try {
    const exists = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (exists) return res.status(409).json({ message: "اسم المستخدم موجود مسبقاً" });

    const hash = bcrypt.hashSync(password, 10);
    const instId = (institution_id && institution_id !== "") ? parseInt(institution_id) : null;

    db.prepare(`
      INSERT INTO users (name, username, password, email, role, institution_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, username, hash, email, role, instId);

    res.json({ message: "تم إنشاء المستخدم بنجاح" });
  } catch (err) {
    console.error("User Creation Error:", err);
    res.status(500).json({ message: "فشل الإضافة: " + err.message });
  }
});

// UPDATE USER (Admin)
app.put("/api/users/:id", auth(["admin"]), (req, res) => {
  const schema = z.object({
    name: z.string().min(1, "الاسم الكامل مطلوب"),
    username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
    password: z.string().optional(),
    email: z.string().email("البريد الإلكتروني غير صالح"),
    role: z.enum(["viewer", "entry", "admin"]),
    institution_id: z.union([z.string(), z.number(), z.null()]).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map(i => i.message).join(", ");
    return res.status(400).json({ message: errorMsg });
  }

  const { name, username, password, email, role, institution_id } = parsed.data;

  try {
    const instId = (institution_id && institution_id !== "") ? parseInt(institution_id) : null;

    // Update basic info
    db.prepare(`
      UPDATE users 
      SET name = ?, username = ?, email = ?, role = ?, institution_id = ?
      WHERE id = ?
    `).run(name, username, email, role, instId, req.params.id);

    // Update password if provided
    if (password && password.trim() !== "") {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hash, req.params.id);
    }

    res.json({ message: "تم تحديث بيانات المستخدم بنجاح" });
  } catch (err) {
    console.error("User Update Error:", err);
    res.status(500).json({ message: "فشل التعديل: " + err.message });
  }
});

// DELETE USER (Admin)
app.delete("/api/users/:id", auth(["admin"]), (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ message: "لا يمكنك حذف حسابك الحالي" });
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ message: "تم حذف المستخدم بنجاح" });
});
res.status(500).json({ message: "فشل التحديث: " + err.message });
  }
});

// UPDATE USER PASSWORD (Admin)
app.put("/api/users/:id/password", auth(["admin"]), (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: "Password required" });
  const hash = bcrypt.hashSync(password, 10);
  db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hash, req.params.id);
  res.json({ message: "Password updated" });
});

// ================== PLATFORM & SETTINGS ADMIN ROUTES ==================

// GET PLATFORM INFO
app.get("/api/platform", (req, res) => {
  const info = db.prepare("SELECT * FROM platform_info LIMIT 1").get();
  console.log("GET /api/platform returning:", info);
  res.json(info || {});
});

// UPDATE PLATFORM INFO & CONFIG
app.post("/api/platform", auth(["admin"]), upload.single("logo"), (req, res) => {
  try {
    let { name, description, ai_api_key, telegram_token, telegram_chat_id, ai_enabled, telegram_enabled } = req.body;
    const logo_path = req.file ? `/uploads/${req.file.filename}` : undefined;

    // Convert enabled flags to numbers for SQLite
    if (ai_enabled !== undefined) ai_enabled = parseInt(ai_enabled);
    if (telegram_enabled !== undefined) telegram_enabled = parseInt(telegram_enabled);

    const exists = db.prepare("SELECT id FROM platform_info LIMIT 1").get();

    if (exists) {
      let sql = "UPDATE platform_info SET updated_at = CURRENT_TIMESTAMP";
      const params = [];

      const fields = { name, description, ai_api_key, telegram_token, telegram_chat_id, ai_enabled, telegram_enabled, logo_path };
      Object.keys(fields).forEach(key => {
        if (fields[key] !== undefined) {
          sql += `, ${key} = ?`;
          params.push(fields[key]);
        }
      });

      sql += " WHERE id = ?";
      params.push(exists.id);
      db.prepare(sql).run(...params);
    } else {
      db.prepare(`
        INSERT INTO platform_info (name, description, logo_path, ai_api_key, ai_enabled, telegram_token, telegram_chat_id, telegram_enabled) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(name || null, description || null, logo_path || null, ai_api_key || null, ai_enabled || 0, telegram_token || null, telegram_chat_id || null, telegram_enabled || 0);
    }

    const updated = db.prepare("SELECT * FROM platform_info LIMIT 1").get();
    res.json({ message: "Platform info updated", data: updated });
  } catch (err) {
    console.error("Platform Update Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// TEST TELEGRAM CONFIG
app.post("/api/telegram/test", auth(["admin"]), async (req, res) => {
  const { token, chat_id } = req.body;
  if (!token || !chat_id) return res.status(400).json({ message: "يرجى إدخال التوكن وChat ID" });

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await axios.post(url, {
      chat_id: chat_id,
      text: "✅ <b>اختبار نظام محيط</b>\nتم ربط البوت بنجاح مع المنصة.",
      parse_mode: 'HTML'
    });
    res.json({ message: "تم إرسال رسالة تجريبية بنجاح!" });
  } catch (err) {
    console.error("Telegram Test Error:", err.response?.data || err.message);
    res.status(400).json({ message: "فشل اختبار الاتصال. يرجى التأكد من البيانات." });
  }
});

// TELEGRAM NOTIFICATION HELPER
async function sendTelegramMessage(text) {
  const config = db.prepare("SELECT telegram_token, telegram_chat_id, telegram_enabled FROM platform_info LIMIT 1").get();
  if (!config || !config.telegram_enabled || !config.telegram_token || !config.telegram_chat_id) return;

  try {
    const url = `https://api.telegram.org/bot${config.telegram_token}/sendMessage`;
    await axios.post(url, {
      chat_id: config.telegram_chat_id,
      text: text,
      parse_mode: 'HTML'
    });
  } catch (err) {
    console.error("Telegram Send Error:", err.response?.data || err.message);
  }
}

// AI ASSISTANT PROXY (Groq Implementation)
app.post("/api/ai/chat", auth(), async (req, res) => {
  const { message, history } = req.body;
  const config = db.prepare("SELECT ai_api_key, ai_enabled FROM platform_info LIMIT 1").get();

  if (!config || !config.ai_enabled || !config.ai_api_key) {
    return res.status(400).json({ message: "عذراً، المساعد الذكي غير مفعّل حالياً. يرجى التواصل مع الإدارة." });
  }

  const systemInstructions = `
    أنت مساعد ذكي متخصص في نظام "محيط" وفي الإجراءات الحكومية والقانونية والشرعية داخل المملكة العربية السعودية فقط.
    مهمتك مساعدة المعقبين وأصحاب المؤسسات في فهم الإجراءات (مثل: قوى، مدد، أبشر، منصة بلدي، السجل التجاري، التأمينات الاجتماعية... الخ).
    
    قواعد صارمة:
    1. أجب فقط عن استفسارات تخص الإجراءات داخل السعودية وبما يتوافق مع الأنظمة السعودية والتشريعات الإسلامية.
    2. إذا كان السؤال عن أي بلد آخر غير السعودية، اعتذر بلباقة وقل أنك غير متخصص خارج نطاق المملكة.
    3. إذا كان السؤال خارج نطاق المهام المهنية (مثل الطبخ، أخبار عامة، رياضة... الخ)، أجب بـ: "عذراً، هذا ليس من اختصاصي حالياً. مهمتي هي مساعدتكم في الإجراءات والخدمات الرسمية فقط. للطلبات الخاصة يرجى التواصل مع المدير."
    4. اجعل إجاباتك مختصرة، عملية، وواضحة.
  `;

  try {
    const url = "https://api.groq.com/openai/v1/chat/completions";
    const response = await axios.post(url, {
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemInstructions },
        ...(history || []).map(h => ({
          role: h.role,
          content: h.content
        })),
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 1024
    }, {
      headers: {
        'Authorization': `Bearer ${config.ai_api_key}`,
        'Content-Type': 'application/json'
      }
    });

    const aiResponse = response.data.choices[0].message.content;
    res.json({ response: aiResponse });
  } catch (err) {
    console.error("Groq AI Proxy error:", err.response?.data || err.message);
    res.status(500).json({ message: "حدث خطأ أثناء التواصل مع المساعد الذكي" });
  }
});

// GET SETTING TYPES (Distinct types)
app.get("/api/settings/types", auth(), (req, res) => {
  const rows = db.prepare("SELECT DISTINCT type FROM settings").all();
  // Default types that should always exist or be available
  const defaultTypes = ["property_type", "category", "person", "nationality", "activity", "entity"];
  const existingTypes = rows.map(r => r.type);
  const allTypes = Array.from(new Set([...defaultTypes, ...existingTypes]));

  // Return as objects for easier frontend consumption potentially, or just strings
  res.json(allTypes);
});

// CREATE NEW SETTING TYPE (Just verifies it's not empty, effectively 'registering' it when a setting is added)
app.post("/api/settings/types", auth(["admin"]), (req, res) => {
  const { type } = req.body;
  if (!type) return res.status(400).json({ message: "Type name required" });
  // We don't strictly need a table for types if we just use the 'settings' table logic, 
  // but frontend might want to know it exists. 
  // For now, successfully returning implies the frontend can now use this 'type' to add items.
  res.json({ message: "Type registered" });
});

// ================== STATIC SERVING & SPA ROUTING ==================
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use("/uploads", express.static(uploadsDir));

const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// SPA Fallback: Only for non-file, non-API requests
app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
  const indexFile = path.join(distPath, "index.html");
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(404).json({
      message: "Frontend build not found locally. Please run 'npm run dev' in the frontend folder for local development.",
      path: indexFile
    });
  }
});

const HOST = '127.0.0.1';
app.listen(PORT, HOST, () => console.log(`🚀 Backend running on http://${HOST}:${PORT}`));
