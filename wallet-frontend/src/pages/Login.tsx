import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const { login, showToast, platformInfo } = useAuth();
    const nav = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const ok = await login(username, password);
        if (!ok) {
            showToast("اسم المستخدم أو كلمة المرور غير صحيحة", "error");
            return;
        }
        showToast("مرحباً بك مجدداً!", "success");
        nav("/");
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #f5f7fb 0%, #e8ecf3 100%)",
            padding: 20
        }}>
            <div className="card" style={{
                maxWidth: 400,
                width: "100%",
                textAlign: "center",
                padding: "40px 30px",
                borderTop: "6px solid #10b981"
            }}>
                <div style={{
                    width: 70, height: 70,
                    margin: "0 auto 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}>
                    <img
                        src={platformInfo.logo_path || "/favicon.png"}
                        alt="Logo"
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                </div>

                <h2 style={{ margin: "0 0 5px 0", fontWeight: 800, fontSize: "2em", color: "#047857" }}>{platformInfo.name}</h2>
                <p style={{ color: "#059669", fontSize: "1em", fontWeight: 600, margin: "0 0 30px 0" }}>{platformInfo.description || "إدارة الخدمات للمؤسسات والشركات"}</p>

                <form onSubmit={submit} style={{ textAlign: "right" }}>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: "block", marginBottom: 8, fontSize: "0.9em", fontWeight: 600 }}>اسم المستخدم</label>
                        <div style={{ position: "relative" }}>
                            <input
                                placeholder="أدخل اسم المستخدم"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                            />
                            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#cbd5e0" }}>👤</span>
                        </div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: "block", marginBottom: 8, fontSize: "0.9em", fontWeight: 600 }}>كلمة المرور</label>
                        <div style={{ position: "relative" }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="أدخل كلمة المرور"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                            <span
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#cbd5e0", cursor: "pointer", userSelect: "none" }}
                            >
                                {showPassword ? "👁️" : "🔒"}
                            </span>
                        </div>
                    </div>

                    {/* Global toast will handle errors now */}

                    <button style={{ width: "100%", padding: 14, background: "#059669", borderColor: "#047857" }}>
                        تسجيل الدخول
                        <span>➜</span>
                    </button>
                </form>

                <p style={{ marginTop: 40, color: "var(--text-muted)", fontSize: "0.75em" }}>
                    © 2026 جميع الحقوق محفوظة لمنصة {platformInfo.name}
                </p>
            </div>
        </div>
    );
}
