import { useEffect, useState } from "react";
import api from "../lib/api";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Setting = { id: number; name: string; type: "property_type" | "category" };

export default function AddOperation() {
    const { user, showToast } = useAuth();
    const nav = useNavigate();

    if (user?.role === "viewer") return <Navigate to="/" />;
    const [types, setTypes] = useState<Setting[]>([]);
    const [cats, setCats] = useState<Setting[]>([]);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        property_type: "",
        reference_number: "",
        amount: 0,
        category: "",
        description: "",
        type: "out" as "in" | "out"
    });
    const [file, setFile] = useState<File | null>(null);

    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        api.get("/settings").then(res => {
            const data = res.data as Setting[];
            setTypes(data.filter(s => s.type === "property_type"));
            setCats(data.filter(s => s.type === "category"));
        });
    }, []);

    const save = async () => {
        try {
            setLoading(true);
            const formData = new FormData();
            Object.entries(form).forEach(([k, v]) => formData.append(k, String(v)));
            if (file) formData.append("attachment", file);

            await api.post("/operations", formData);
            showToast("تم إضافة العملية بنجاح", "success");
            nav("/operations");
        } catch (err: any) {
            showToast("خطأ في الحفظ: " + (err.response?.data?.message || err.message), "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div className="card">
                <h3 style={{ marginBottom: 25, textAlign: "center" }}>إضافة عملية جديدة</h3>

                <div style={{ display: "flex", gap: 10, background: "#f1f5f9", padding: 6, borderRadius: 12, marginBottom: 30 }}>
                    <button
                        onClick={() => setForm({ ...form, type: 'out' })}
                        style={{ flex: 1, background: form.type === 'out' ? '#fff' : 'transparent', color: form.type === 'out' ? 'var(--danger)' : '#64748b', boxShadow: form.type === 'out' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                        🔴 مصروف
                    </button>
                    <button
                        onClick={() => setForm({ ...form, type: 'in' })}
                        style={{ flex: 1, background: form.type === 'in' ? '#fff' : 'transparent', color: form.type === 'in' ? 'var(--success)' : '#64748b', boxShadow: form.type === 'in' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                        🟢 دخل
                    </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div>
                        <label>التاريخ</label>
                        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                    </div>
                    <div>
                        <label>نوع العقار</label>
                        <select value={form.property_type} onChange={e => setForm({ ...form, property_type: e.target.value })}>
                            <option value="">اختر نوع العقار...</option>
                            {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label>الرقم المرجعي</label>
                        <input placeholder="رقم الفاتورة أو القيد" value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} />
                    </div>
                    <div>
                        <label>المبلغ</label>
                        <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: +e.target.value })} />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                        <label>التصنيف</label>
                        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                            <option value="">اختر التصنيف...</option>
                            {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                        <label>الوصف (اختياري)</label>
                        <textarea rows={3} placeholder="اكتب وصفاً موجزاً للعملية..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                        <label>إرفاق مستند (صورة أو PDF)</label>
                        <input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
                    </div>
                </div>

                <button
                    style={{ width: "100%", marginTop: 30, padding: 15 }}
                    onClick={() => setShowConfirm(true)}
                >
                    ➕ إضافة العملية
                </button>
            </div>

            {showConfirm && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ textAlign: "center" }}>
                        <div style={{
                            width: 50, height: 50, borderRadius: "50%", background: form.type === 'in' ? '#d1fae5' : '#fee2e2',
                            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px"
                        }}>
                            {form.type === 'in' ? '↑' : '↓'}
                        </div>
                        <h3 style={{ margin: "0 0 10px 0" }}>تأكيد العملية</h3>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.9em", marginBottom: 25 }}>يرجى مراجعة بيانات العملية قبل الحفظ</p>

                        <div style={{ textAlign: "right", display: "grid", gap: 12, marginBottom: 30 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                                <span style={{ color: "var(--text-muted)" }}>نوع العملية</span>
                                <span style={{ fontWeight: 600, color: form.type === 'in' ? 'var(--success)' : 'var(--danger)' }}>{form.type === 'in' ? 'دخل مالي' : 'مصروف مالي'}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                                <span style={{ color: "var(--text-muted)" }}>التاريخ</span>
                                <span>{form.date}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                                <span style={{ color: "var(--text-muted)" }}>المبلغ الإجمالي</span>
                                <span style={{ fontWeight: 700, color: "var(--primary)" }}>{form.amount.toLocaleString()} ر.س</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                                <span style={{ color: "var(--text-muted)" }}>العقار / التصنيف</span>
                                <span>{form.property_type} - {form.category}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                                <span style={{ color: "var(--text-muted)" }}>المرفق</span>
                                <span>{file ? file.name : "لا يوجد"}</span>
                            </div>
                        </div>

                        <button
                            style={{ width: "100%", marginBottom: 10 }}
                            onClick={save}
                            disabled={loading}
                        >
                            {loading ? "جاري الحفظ..." : "✅ تأكيد وإضافة"}
                        </button>
                        <button className="secondary" style={{ width: "100%" }} onClick={() => setShowConfirm(false)} disabled={loading}>تراجع</button>
                    </div>
                </div>
            )}
        </div>
    );
}
