import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Navigate, Link } from "react-router-dom";

type User = {
    id: number;
    username: string;
    name: string;
    email: string;
    role: "viewer" | "entry" | "admin";
    created_at: string;
};

export default function Users() {
    const { user: currentUser, showToast } = useAuth();
    if (currentUser?.role !== "admin") return <Navigate to="/" />;
    const [users, setUsers] = useState<User[]>([]);
    const [form, setForm] = useState({ name: "", username: "", password: "", role: "entry" as "admin" | "entry" | "viewer", email: "" });
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const loadData = () => api.get("/users").then(res => setUsers(res.data));

    useEffect(() => { loadData(); }, []);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post("/users", form);
            showToast("تم إضافة الموظف بنجاح", "success");
            setForm({ name: "", username: "", password: "", role: "entry", email: "" });
            loadData();
        } catch (err: any) {
            showToast(err.response?.data?.message || "فشل إضافة المستخدم", "error");
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete("/users/" + deleteId);
            showToast("تم حذف الموظف", "success");
            setDeleteId(null);
            loadData();
        } catch (err) {
            showToast("فشل حذف المستخدم", "error");
        }
    };

    return (
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
            {/* Custom Delete Modal */}
            {deleteId && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ textAlign: "center", maxWidth: 400 }}>
                        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "1.8em" }}>⚠️</div>
                        <h3 style={{ marginBottom: 10 }}>تأكيد حذف الموظف</h3>
                        <p style={{ color: "var(--text-muted)", marginBottom: 30 }}>هل أنت متأكد من حذف هذا المستخدم؟ سيتم قطع وصوله للمنصة فوراً.</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                            <button style={{ background: "var(--danger)" }} onClick={confirmDelete}>نعم، احذف</button>
                            <button className="secondary" onClick={() => setDeleteId(null)}>تراجع</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ margin: 0 }}>الموظفون والصلاحيات</h3>
                <Link to="/" className="secondary" style={{ padding: '8px 16px', borderRadius: 10, fontSize: '0.9em' }}>العودة للرئيسية</Link>
            </div>

            <div className="card" style={{ marginBottom: 30, maxWidth: 600 }}>
                <h4 style={{ marginTop: 0 }}>إضافة موظف جديد</h4>
                <form onSubmit={save} style={{ display: 'grid', gap: 12 }}>
                    <input
                        placeholder="اسم المستخدم"
                        value={form.username}
                        onChange={e => setForm({ ...form, username: e.target.value })}
                        required
                    />
                    <input
                        placeholder="الاسم الكامل"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        required
                    />
                    <input
                        placeholder="البريد الإلكتروني"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        required
                        type="email"
                    />
                    <input
                        type="password"
                        placeholder="كلمة المرور (6 أحرف على الأقل)"
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        required
                        minLength={6}
                    />
                    <select
                        value={form.role}
                        onChange={e => setForm({ ...form, role: e.target.value as any })}
                    >
                        <option value="viewer">مشاهد (عرض فقط)</option>
                        <option value="entry">مدخل بيانات (عرض + إضافة)</option>
                        <option value="admin">مدير (كل الصلاحيات)</option>
                    </select>
                    <button style={{ marginTop: 10 }}>➕ إضافة موظف</button>
                </form>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: 60, textAlign: 'center' }}>#</th>
                            <th>المستخدم</th>
                            <th>الاسم الكامل</th>
                            <th>البريد</th>
                            <th>الدور</th>
                            <th>تاريخ الانضمام</th>
                            <th>إجراء</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{u.id}</td>
                                <td style={{ fontWeight: 600 }}>{u.username}</td>
                                <td>{u.name}</td>
                                <td>{u.email}</td>
                                <td>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: 8,
                                        fontSize: '0.85em',
                                        background: u.role === 'admin' ? '#eef2ff' : u.role === 'entry' ? '#f0fdf4' : '#f8fafc',
                                        color: u.role === 'admin' ? '#4338ca' : u.role === 'entry' ? '#166534' : '#64748b'
                                    }}>
                                        {u.role === 'admin' ? 'مدير' : u.role === 'entry' ? 'مدخل' : 'مشاهد'}
                                    </span>
                                </td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>{new Date(u.created_at).toLocaleDateString("ar-SA")}</td>
                                <td>
                                    {u.username !== "mohsen" ? (
                                        <button onClick={() => setDeleteId(u.id)} style={{ padding: 6, background: 'none', color: 'var(--danger)' }}>🗑️</button>
                                    ) : (
                                        <span style={{ color: '#cbd5e0', fontSize: '0.8em' }}>حساب أساسي</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
