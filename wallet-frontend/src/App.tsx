import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Operations from "./pages/Operations";
import AddOperation from "./pages/AddOperation";
import Settings from "./pages/Settings";
import Transfers from "./pages/Transfers";
import Reports from "./pages/Reports";
import Institutions from "./pages/Institutions";
import Platforms from "./pages/Platforms";
import InstitutionServices from "./pages/InstitutionServices";
import ExternalAppointments from "./pages/ExternalAppointments";
import Tasks from "./pages/Tasks";
import Users from "./pages/Users";
import Layout from "./layout/Layout";

import { useEffect, useState } from "react";
import api from "./lib/api";

import { useAuth } from "./context/AuthContext";

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>({
    institutions: 0, platforms: 0, expired: 0, warning: 0, unpaidInvoices: 0, upcomingAppts: 0, alerts: []
  });
  const [loading, setLoading] = useState(true);

  if (user && user.role !== 'admin') {
    if (user.institution_id) {
      return <Navigate to={`/institutions/${user.institution_id}/services`} replace />;
    }
    return <Navigate to="/institutions" replace />;
  }

  useEffect(() => {
    setLoading(true);
    api.get("/stats")
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'employee': return '👤';
      case 'service': return '🏢';
      case 'appointment': return '📅';
      case 'invoice': return '🧾';
      default: return '⚠️';
    }
  };

  const getDaysLeft = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const todayAppts = stats.alerts.filter((a: any) => a.type === 'appointment');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 30, direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: '1.5em', fontWeight: 800 }}>مرحباً بك في لوحة التحكم</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85em' }}>{new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Appointment Banner */}
      {todayAppts.length > 0 && (
        <div style={{ background: '#4338ca', color: '#fff', padding: '15px 25px', borderRadius: 15, display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 10px 15px -3px rgba(67, 56, 202, 0.3)' }}>
          <div style={{ fontSize: '2em' }}>🔔</div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0 }}>تنبيه: يوجد موعد خارجي اليوم!</h4>
            <p style={{ margin: '5px 0 0', fontSize: '0.9em', opacity: 0.9 }}>
              {todayAppts.map((a: any) => a.title + (a.subtitle ? ` (${a.subtitle})` : "")).join(' | ')}
            </p>
          </div>
        </div>
      )}

      {/* Top Summaries */}
      <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
        <div className="card" style={{ borderBottom: '4px solid #10b981', background: '#f0fdf4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#166534', fontSize: '0.9em', fontWeight: 600, margin: '0 0 5px 0' }}>إجمالي المؤسسات</p>
              <h2 style={{ margin: 0, color: '#14532d' }}>{stats.institutions}</h2>
            </div>
            <div style={{ fontSize: "2.5em" }}>🏢</div>
          </div>
        </div>

        <div className="card" style={{ borderBottom: '4px solid #6366f1', background: '#eef2ff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#3730a3', fontSize: '0.9em', fontWeight: 600, margin: '0 0 5px 0' }}>المواعيد القادمة</p>
              <h2 style={{ margin: 0, color: '#312e81' }}>{stats.upcomingAppts}</h2>
            </div>
            <div style={{ fontSize: "2.5em" }}>📅</div>
          </div>
        </div>

        <div className="card" style={{ borderBottom: '4px solid #f59e0b', background: '#fffbeb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#92400e', fontSize: '0.9em', fontWeight: 600, margin: '0 0 5px 0' }}>تنبيهات قرب الانتهاء</p>
              <h2 style={{ margin: 0, color: '#78350f' }}>{stats.warning}</h2>
            </div>
            <div style={{ fontSize: "2.5em" }}>⏳</div>
          </div>
        </div>

        <div className="card" style={{ borderBottom: '4px solid #ef4444', background: '#fef2f2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#991b1b', fontSize: '0.9em', fontWeight: 600, margin: '0 0 5px 0' }}>خدمات منتهية</p>
              <h2 style={{ margin: 0, color: '#7f1d1d' }}>{stats.expired}</h2>
            </div>
            <div style={{ fontSize: "2.5em" }}>🚫</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Alerts & Priority Actions */}
      <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 30 }}>
        {/* Alerts Feed */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: "flex", justifyContent: "space-between", alignItems: 'center' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>🚨 تنبيهات النظام الذكية</h3>
            <button className="secondary" style={{ fontSize: '0.8em', padding: '5px 15px' }}>تحديث تلقائي</button>
          </div>
          <div style={{ padding: 20, maxHeight: 600, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>جاري تحليل البيانات...</div>
            ) : stats.alerts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.alerts.map((alert: any, idx: number) => {
                  const days = getDaysLeft(alert.date);
                  return (
                    <div
                      key={idx}
                      onClick={() => navigate(`/institutions/${alert.institution_id}/services`)}
                      style={{
                        display: "flex", alignItems: "center", gap: 15, padding: 15,
                        background: alert.level === 'danger' ? "#fff5f5" : "#fffbeb",
                        borderRadius: 12, border: `1px solid ${alert.level === 'danger' ? "#fed7d7" : "#fef3c7"}`,
                        cursor: 'pointer', transition: 'transform 0.2s',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(-5px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                      <div style={{ width: 45, height: 45, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4em', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        {getAlertIcon(alert.type)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '1em' }}>{alert.title}</div>
                        <div style={{ fontSize: "0.85em", color: "var(--text-muted)", marginTop: 2 }}>{alert.subtitle}</div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <span style={{
                          background: alert.level === 'danger' ? "var(--danger)" : "#f59e0b",
                          color: "#fff", padding: "5px 12px", borderRadius: 20, fontSize: "0.75em", fontWeight: 700
                        }}>
                          {days < 0 ? `منتهية منذ ${Math.abs(days)} يوم` : `تنتهي خلال ${days} يوم`}
                        </span>
                        <div style={{ fontSize: '0.7em', color: 'var(--text-muted)', marginTop: 5 }}>{alert.date}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3em', marginBottom: 10 }}>✨</div>
                <div>لا يوجد تنبيهات عاجلة حالياً</div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Insights / Advisor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)', color: '#fff', border: 'none', boxShadow: '0 10px 15px -3px rgba(67, 56, 202, 0.2)' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2em', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.2em' }}>🧠</span> مستشار المعقب الذكي
            </h3>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 12, fontSize: '0.95em', lineHeight: 1.6 }}>
              {stats.expired > 0
                ? (
                  <>
                    <div style={{ fontWeight: 800, marginBottom: 8, color: '#fecaca' }}>⚠️ تنبيه عاجل:</div>
                    لديك <strong>{stats.expired}</strong> خدمة منتهية حالياً. كمعقب، نوصي بالبدء فوراً في تجديد <strong>"{stats.alerts[0]?.title}"</strong> لتجنب إيقاف الخدمات الحكومية عن المؤسسة.
                  </>
                )
                : stats.warning > 0
                  ? (
                    <>
                      <div style={{ fontWeight: 800, marginBottom: 8, color: '#fef3c7' }}>📅 إجراء وقائي:</div>
                      يوجد <strong>{stats.warning}</strong> خدمة تقترب من الانتهاء. الأفضل هو تقديم طلبات التجديد عبر "قوى" أو "مقيم" خلال هذا الأسبوع لتفادي الزحام أو تعطل النظام.
                    </>
                  )
                  : (
                    <>
                      <div style={{ fontWeight: 800, marginBottom: 8, color: '#dcfce7' }}>✅ حالة ممتازة:</div>
                      جميع التراخيص والخدمات سارية المفعول. نقترح استغلال هذا الوقت في مراجعة ملفات الموظفين وتحديث بياناتهم الشخصية.
                    </>
                  )}
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ margin: '0 0 15px 0' }}>إحصائيات الفواتير</h4>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>فواتير غير مسددة</span>
              <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{stats.unpaidInvoices}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>مواعيد اليوم</span>
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{stats.upcomingAppts}</span>
            </div>
            <Link to="/reports" style={{ display: 'block', textAlign: 'center', marginTop: 15, fontSize: '0.85em', color: 'var(--accent)', fontWeight: 600 }}>عرض التقارير التفصيلية ←</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/institutions" element={<ProtectedRoute><Layout><Institutions /></Layout></ProtectedRoute>} />
          <Route path="/institutions/:id/services" element={<ProtectedRoute><Layout><InstitutionServices /></Layout></ProtectedRoute>} />
          <Route path="/platforms" element={<ProtectedRoute><Layout><Platforms /></Layout></ProtectedRoute>} />
          <Route path="/institutions/:id/services" element={<ProtectedRoute><Layout><InstitutionServices /></Layout></ProtectedRoute>} />
          <Route path="/platforms" element={<ProtectedRoute><Layout><Platforms /></Layout></ProtectedRoute>} />
          <Route path="/external-appointments" element={<ProtectedRoute><Layout><ExternalAppointments /></Layout></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><Layout><Tasks /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />

          <Route path="/operations" element={<ProtectedRoute><Layout><Operations /></Layout></ProtectedRoute>} />
          <Route path="/add" element={<ProtectedRoute><Layout><AddOperation /></Layout></ProtectedRoute>} />
          <Route path="/transfers" element={<ProtectedRoute><Layout><Transfers /></Layout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><Layout><Users /></Layout></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

