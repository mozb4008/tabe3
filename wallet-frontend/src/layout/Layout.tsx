import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppointmentRequestModal from "../components/AppointmentRequestModal";
import AIAssistant from "../components/AIAssistant";

export default function Layout({ children }: { children: React.ReactNode }) {
    const { user, logout, platformInfo } = useAuth();
    const loc = useLocation();

    const menu = [
        { name: "لوحة المعلومات", path: "/", icon: "📊", roles: ['admin'] },
        {
            name: "المؤسسات",
            path: (user?.role !== 'admin' && user?.institution_id) ? `/institutions/${user.institution_id}/services` : "/institutions",
            icon: "🏢",
            roles: ['admin', 'entry', 'viewer']
        },
        { name: "المنصات الحكومية", path: "/platforms", icon: "🌐", roles: ['admin'] },
        { name: "المهام", path: "/tasks", icon: "📋", roles: ['admin'] },
        { name: "المواعيد الخارجية", path: "/external-appointments", icon: "📅", roles: ['admin'] },
        { name: "الإعدادات", path: "/settings", icon: "⚙️", roles: ['admin'] },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg)" }}>
            {/* Top Toolbar */}
            <header style={{
                height: 70,
                background: "#fff",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0 15px", // Reduced padding for mobile
                position: "sticky",
                top: 0,
                zIndex: 100
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <img
                            src={platformInfo.logo_path || "/favicon.png"}
                            alt="Logo"
                            style={{ height: 30, objectFit: 'contain' }}
                        />
                        <span className="logo-text" style={{ fontWeight: 800, fontSize: "1.1em", color: "#047857" }}>{platformInfo.name}</span>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ textAlign: "left", direction: "ltr" }}>
                            <div style={{ fontWeight: 600, fontSize: "0.85em" }}>{user?.name}</div>
                            <div className="hide-on-mobile" style={{ color: "var(--text-muted)", fontSize: "0.75em" }}>{user?.role === 'admin' ? 'المدير العام' : 'موظف'}</div>
                        </div>
                        <div style={{ width: 35, height: 35, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                            <span style={{ fontSize: '0.8em' }}>👤</span>
                        </div>
                    </div>
                    <button className="secondary" style={{ padding: 8, width: 35, height: 35 }} onClick={logout}>🚪</button>
                </div>
            </header>

            {/* Sub-Header / Menu */}
            <nav style={{
                background: "#fff",
                borderBottom: "1px solid var(--border)",
                padding: "0 10px", // Reduced padding
                display: "flex",
                gap: 5,
                overflowX: "auto",
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
            }}>
                {menu.map((m, idx) => {
                    const active = loc.pathname === m.path;
                    if (m.roles && !m.roles.includes(user?.role || "")) return null;
                    return (
                        <Link
                            key={idx}
                            to={m.path}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "12px 15px", // Reduced padding
                                fontSize: "0.9em",
                                color: active ? "var(--accent)" : "var(--text-main)",
                                borderBottom: active ? "3px solid var(--accent)" : "3px solid transparent",
                                transition: "all 0.2s",
                                whiteSpace: "nowrap",
                                fontWeight: active ? 700 : 500
                            }}
                        >
                            <span>{m.name}</span>
                        </Link>
                    )
                })}
            </nav>

            <main style={{ flex: 1, padding: "15px" }}>
                <div style={{ maxWidth: 1400, margin: "0 auto" }}>
                    {children}
                </div>
            </main>
            <AppointmentRequestModal />
            {platformInfo.ai_enabled ? <AIAssistant /> : null}
        </div>
    );
}

