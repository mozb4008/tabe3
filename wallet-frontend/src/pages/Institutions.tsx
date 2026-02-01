import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface Institution {
    id: number;
    name: string;
    owner: string;
    mobile: string;
    activity: string;
    email: string;
}

export default function Institutions() {
    const navigate = useNavigate();
    const { user, showToast } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<Institution | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Institution | null>(null);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activities, setActivities] = useState<{ id: number; name: string }[]>([]);

    const [form, setForm] = useState({
        name: "",
        owner: "",
        mobile: "",
        activity: "",
        email: ""
    });

    useEffect(() => {
        if (user && user.role !== 'admin' && user.institution_id) {
            navigate(`/institutions/${user.institution_id}/services`, { replace: true });
            return;
        }
        loadInstitutions();
        loadSettings();
    }, [user, navigate]);

    const loadSettings = () => {
        api.get("/settings?type=activity").then(res => {
            setActivities(res.data.filter((s: any) => s.type === 'activity'));
        });
    };

    const loadInstitutions = () => {
        setLoading(true);
        api.get("/institutions")
            .then(res => setInstitutions(res.data))
            .catch(() => {
                showToast("حدث خطأ أثناء تحميل البيانات", "error");
            })
            .finally(() => setLoading(false));
    };

    const handleOpenAdd = () => {
        setEditTarget(null);
        setForm({ name: "", owner: "", mobile: "", activity: "", email: "" });
        setShowModal(true);
    };

    const handleOpenEdit = (inst: Institution) => {
        setEditTarget(inst);
        setForm({
            name: inst.name,
            owner: inst.owner,
            mobile: inst.mobile,
            activity: inst.activity,
            email: inst.email
        });
        setShowModal(true);
    };

    const handleSubmit = () => {
        if (!form.name || !form.owner || !form.mobile) {
            showToast("الرجاء ملء الحقول الإلزامية", "error");
            return;
        }

        setSaving(true);
        const action = editTarget
            ? api.put(`/institutions/${editTarget.id}`, form)
            : api.post("/institutions", form);

        action
            .then(() => {
                showToast(editTarget ? "تم تحديث البيانات بنجاح" : "تمت إضافة المؤسسة بنجاح");
                loadInstitutions();
                setShowModal(false);
                setEditTarget(null);
                setForm({ name: "", owner: "", mobile: "", activity: "", email: "" });
            })
            .catch((err) => {
                console.error("Save error:", err);
                const msg = err.response?.data?.message || "حدث خطأ أثناء الحفظ. تأكد من اتصال الخادم.";
                showToast(msg, "error");
            })
            .finally(() => setSaving(false));
    };

    const confirmDelete = () => {
        if (deleteTarget) {
            api.delete(`/institutions/${deleteTarget.id}`)
                .then(() => {
                    loadInstitutions();
                    setDeleteTarget(null);
                });
        }
    };

    const filtered = institutions.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.owner.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30, flexWrap: 'wrap', gap: 15 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: "1.5em", fontWeight: 700 }}>المؤسسات والشركات</h1>
                    <p style={{ margin: "5px 0 0 0", color: "var(--text-muted)", fontSize: '0.9em' }}>إدارة حسابات العملاء والصلاحيات</p>
                </div>
                {user?.role === 'admin' && (
                    <button onClick={handleOpenAdd} className="mobile-full-width" style={{ background: "var(--primary)", padding: "12px 24px" }}>
                        + إضافة مؤسسة جديدة
                    </button>
                )}
            </div>

            <div style={{ position: "relative", marginBottom: 30 }}>
                <input
                    type="text"
                    placeholder="بحث عن مؤسسة، مالك..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingRight: 45, height: 50, background: "#fff" }}
                />
                <span style={{ position: "absolute", right: 15, top: 15 }}>🔍</span>
            </div>

            <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 25 }}>
                {loading && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 50 }}>جاري التحميل...</div>}
                {!loading && filtered.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 50 }}>لا توجد مؤسسات حالياً</div>}
                {filtered.map(inst => (
                    <div key={inst.id} className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        <div style={{ padding: 24, flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                                <div style={{ width: 45, height: 45, background: "#f1f5f9", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2em" }}>
                                    🏢
                                </div>
                                {user?.role === 'admin' && (
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <button onClick={() => handleOpenEdit(inst)} className="secondary" style={{ padding: 8, width: 35, height: 35 }}>✏️</button>
                                        <button onClick={() => setDeleteTarget(inst)} className="secondary" style={{ padding: 8, width: 35, height: 35, color: "var(--danger)" }}>🗑️</button>
                                    </div>
                                )}
                            </div>

                            <h3 style={{ margin: "0 0 8px 0", fontSize: "1.2em" }}>{inst.name}</h3>
                            <p style={{ margin: 0, fontSize: "0.9em", color: "var(--text-muted)", lineHeight: 1.6 }}>{inst.activity}</p>

                            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                                <div>
                                    <div style={{ fontSize: "0.8em", color: "var(--text-muted)" }}>المالك</div>
                                    <div style={{ fontWeight: 600, fontSize: "0.95em" }}>👤 {inst.owner}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "0.8em", color: "var(--text-muted)" }}>رقم الجوال</div>
                                    <div style={{ fontWeight: 600, fontSize: "0.95em" }}>📞 {inst.mobile}</div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate(`/institutions/${inst.id}/services`)}
                            style={{ borderRadius: 0, width: "100%", padding: 15, background: "var(--primary)", fontSize: "0.95em" }}
                        >
                            إدارة الخدمات ←
                        </button>
                    </div>
                ))}
            </div>

            {/* Custom Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ textAlign: "center", maxWidth: 400 }}>
                        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "1.8em" }}>⚠️</div>
                        <h3 style={{ marginBottom: 10 }}>تأكيد الحذف</h3>
                        <p style={{ color: "var(--text-muted)", marginBottom: 30 }}>
                            هل أنت متأكد من حذف منشأة <b>{deleteTarget.name}</b>؟ هذه العملية لا يمكن التراجع عنها.
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                            <button style={{ background: "var(--danger)" }} onClick={confirmDelete}>نعم، احذف</button>
                            <button className="secondary" onClick={() => setDeleteTarget(null)}>تراجع</button>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 600 }}>
                        <h2 style={{ marginBottom: 25 }}>{editTarget ? "تعديل المنشأة" : "إضافة مؤسسة جديدة"}</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            <div style={{ gridColumn: "span 2" }}>
                                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>اسم المنشأة</label>
                                <input
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="أدخل اسم المنشأة"
                                />
                            </div>
                            <div style={{ gridColumn: "span 2" }}>
                                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>نشاط المنشأة</label>
                                <select
                                    value={form.activity}
                                    onChange={e => setForm({ ...form, activity: e.target.value })}
                                    style={{ width: '100%', height: 45, borderRadius: 10, border: '1px solid var(--border)', padding: '0 15px' }}
                                >
                                    <option value="">اختر النشاط...</option>
                                    {activities.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>اسم المالك</label>
                                <input
                                    value={form.owner}
                                    onChange={e => setForm({ ...form, owner: e.target.value })}
                                    placeholder="اسم المالك"
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>رقم الجوال</label>
                                <input
                                    value={form.mobile}
                                    onChange={e => setForm({ ...form, mobile: e.target.value })}
                                    placeholder="05xxxxxxxx"
                                />
                            </div>
                            <div style={{ gridColumn: "span 2" }}>
                                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>البريد الإلكتروني</label>
                                <input
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    placeholder="email@example.com"
                                />
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 15, marginTop: 30 }}>
                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                style={{ flex: 1, opacity: saving ? 0.7 : 1 }}
                            >
                                {saving ? "جاري الحفظ..." : (editTarget ? "تحديث البيانات" : "حفظ المؤسسة")}
                            </button>
                            <button onClick={() => setShowModal(false)} className="secondary" style={{ flex: 1 }}>إلغاء</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
