import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

type Setting = { id: number; name: string; type: string };
type Transfer = {
    id: number;
    date: string;
    person_name: string;
    amount: number;
    attachment_path?: string;
    created_by_name: string;
};

import { useLocation } from "react-router-dom";

export default function Transfers() {
    const { user, showToast } = useAuth();
    const loc = useLocation();
    const [names, setNames] = useState<Setting[]>([]);
    const [transfers, setTransfers] = useState<Transfer[]>([]);

    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        person_name: "",
        amount: 0
    });
    const [file, setFile] = useState<File | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [viewerPath, setViewerPath] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        const params = new URLSearchParams(loc.search);
        const pName = params.get("person_name");

        const [sRes, tRes] = await Promise.all([
            api.get("/settings"),
            api.get(pName ? `/transfers?person_name=${encodeURIComponent(pName)}` : "/transfers")
        ]);
        setNames(sRes.data.filter((s: any) => s.type === "person"));
        setTransfers(tRes.data);
    };

    useEffect(() => { loadData(); }, [loc.search]);

    const save = async () => {
        try {
            setLoading(true);
            const formData = new FormData();
            Object.entries(form).forEach(([k, v]) => formData.append(k, String(v)));
            if (file) formData.append("attachment", file);

            await api.post("/transfers", formData);
            showToast("تم تسجيل التحويل بنجاح", "success");
            setForm({ ...form, person_name: "", amount: 0 });
            setFile(null);
            setShowConfirm(false);
            loadData();
        } catch (err: any) {
            showToast("خطأ: " + (err.response?.data?.message || err.message), "error");
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        await api.delete("/transfers/" + deleteId);
        setDeleteId(null);
        loadData();
    };

    return (
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            {/* Attachment Preview Modal */}
            {viewerPath && (
                <div className="modal-overlay" onClick={() => setViewerPath(null)}>
                    <div className="modal-content" style={{ maxWidth: '90%', maxHeight: '90%', padding: 10, position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setViewerPath(null)}
                            style={{ position: 'absolute', top: -15, right: -15, width: 35, height: 35, borderRadius: '50%', background: 'var(--danger)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', zIndex: 10 }}
                        >✕</button>

                        {viewerPath.toLowerCase().endsWith('.pdf') ? (
                            <iframe
                                src={viewerPath}
                                style={{ width: '80vw', height: '80vh', border: 'none', borderRadius: 8 }}
                                title="Document Preview"
                            />
                        ) : (
                            <img
                                src={viewerPath}
                                style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8, display: 'block', margin: '0 auto' }}
                                alt="Attachment Preview"
                            />
                        )}

                        <div style={{ marginTop: 15, textAlign: 'center' }}>
                            <a href={viewerPath} download className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>⬇️ تحميل المستند</a>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ textAlign: "center", maxWidth: 400 }}>
                        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "1.8em" }}>⚠️</div>
                        <h3 style={{ marginBottom: 10 }}>تأكيد حذف التحويل</h3>
                        <p style={{ color: "var(--text-muted)", marginBottom: 30 }}>هل أنت متأكد من حذف هذا التحويل المالي؟</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                            <button style={{ background: "var(--danger)" }} onClick={confirmDelete}>نعم، احذف</button>
                            <button className="secondary" onClick={() => setDeleteId(null)}>تراجع</button>
                        </div>
                    </div>
                </div>
            )}
            {user?.role !== "viewer" && (
                <div className="card" style={{ maxWidth: 700, margin: "0 auto 40px" }}>
                    <h3 style={{ marginBottom: 25, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                        <span style={{ fontSize: "1.2em" }}>🔄</span> إضافة تحويل مالي جديد
                    </h3>

                    <form onSubmit={(e) => { e.preventDefault(); setShowConfirm(true); }} style={{ display: "grid", gap: 20 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            <div>
                                <label>📅 التاريخ</label>
                                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <div>
                                <label>👤 الاسم المستلم</label>
                                <select value={form.person_name} onChange={e => setForm({ ...form, person_name: e.target.value })} required>
                                    <option value="">اختر الاسم...</option>
                                    {names.map(n => <option key={n.id} value={n.name}>{n.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label>💰 المبلغ</label>
                            <input type="number" placeholder="0.00" value={form.amount || ""} onChange={e => setForm({ ...form, amount: +e.target.value })} required />
                        </div>

                        <div>
                            <label>📎 المرفق (صورة أو PDF)</label>
                            <div style={{
                                border: "2px dashed #e2e8f0", padding: "20px", borderRadius: 12, textAlign: "center",
                                cursor: "pointer", background: "#f8fafc"
                            }} onClick={() => document.getElementById('file-up')?.click()}>
                                <input id="file-up" type="file" hidden accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
                                {file ? <span style={{ color: "var(--primary)" }}>✅ {file.name}</span> : <span style={{ color: "#64748b" }}>اضغط لإرفاق ملف</span>}
                            </div>
                        </div>

                        <button type="submit" style={{ padding: 15, background: "#1e293b", color: "#fff" }}>حفظ التحويل</button>
                    </form>
                </div>
            )}

            <h3 style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "var(--primary)" }}>📊</span> سجل التحويلات
            </h3>
            <div className="card" style={{ padding: 0 }}>
                <table>
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>الاسم</th>
                            <th>المبلغ</th>
                            <th>المرفق</th>
                            <th>بواسطة</th>
                            {user?.role === "admin" && <th>إجراء</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {transfers.map(t => (
                            <tr key={t.id}>
                                <td>{t.date}</td>
                                <td style={{ fontWeight: 600 }}>{t.person_name}</td>
                                <td style={{ color: "var(--primary)", fontWeight: 700 }}>{t.amount.toLocaleString()} ر.س</td>
                                <td>
                                    {t.attachment_path ? (
                                        <button
                                            onClick={() => setViewerPath(t.attachment_path || null)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', padding: 4 }}
                                            title="عرض المرفق"
                                        >🖇️</button>
                                    ) : "-"}
                                </td>
                                <td>{t.created_by_name}</td>
                                {user?.role === "admin" && (
                                    <td><button onClick={() => setDeleteId(t.id)} style={{ padding: 6, background: "none", color: "var(--danger)" }}>🗑️</button></td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showConfirm && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ textAlign: "center" }}>
                        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(78, 68, 231, 0.1)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "1.5em" }}>🔄</div>
                        <h3>تأكيد التحويل</h3>
                        <p style={{ color: "var(--text-muted)", marginBottom: 25 }}>يرجى التأكد من بيانات التحويل قبل الإتمام</p>

                        <div style={{ textAlign: "right", display: "grid", gap: 12, marginBottom: 30 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                                <span style={{ color: "var(--text-muted)" }}>الاسم المستلم</span>
                                <span style={{ fontWeight: 700 }}>{form.person_name}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                                <span style={{ color: "var(--text-muted)" }}>المبلغ</span>
                                <span style={{ fontWeight: 700, color: "var(--primary)" }}>{form.amount.toLocaleString()} ر.س</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 8 }}>
                                <span style={{ color: "var(--text-muted)" }}>التاريخ</span>
                                <span>{form.date}</span>
                            </div>
                        </div>

                        <button
                            style={{ width: "100%", marginBottom: 10 }}
                            onClick={save}
                            disabled={loading}
                        >
                            {loading ? "جاري الحفظ..." : "✅ إتمام التحويل"}
                        </button>
                        <button className="secondary" style={{ width: "100%" }} onClick={() => setShowConfirm(false)} disabled={loading}>تراجع</button>
                    </div>
                </div>
            )}
        </div>
    );
}
