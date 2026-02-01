import { useState } from "react";

interface Platform {
    id: number;
    name: string;
    url: string;
    icon: string;
    status: "active" | "inactive";
    description: string;
}

export default function Platforms() {
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<Platform | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Platform | null>(null);

    const [platforms, setPlatforms] = useState<Platform[]>([
        {
            id: 1,
            name: "قوى (Qiwa)",
            url: "https://qiwa.sa",
            icon: "💼",
            status: "active",
            description: "منصة قوى هي المنصة الرقمية لجميع خدمات منظومة العمل السعودية."
        },
        {
            id: 2,
            name: "مدد (Mudad)",
            url: "https://mudad.com.sa",
            icon: "💰",
            status: "active",
            description: "منصة مدد للخدمات التقنية لأنظمة حماية الأجور."
        },
        {
            id: 3,
            name: "أبشر (Absher)",
            url: "https://absher.sa",
            icon: "🇸🇦",
            status: "active",
            description: "منصة الخدمات الإلكترونية للأفراد والأعمال بوزارة الداخلية."
        },
        {
            id: 4,
            name: "مقيم (Muqeem)",
            url: "https://muqeem.sa",
            icon: "🛂",
            status: "active",
            description: "خدمـة مقيـم تتيـح للمنشـآت الاطـلاع علـى بيانـات موظفيهـا المقيميـن."
        }
    ]);

    const [form, setForm] = useState({
        name: "",
        url: "",
        icon: "🌐",
        description: ""
    });

    const handleOpenAdd = () => {
        setEditTarget(null);
        setForm({ name: "", url: "", icon: "🌐", description: "" });
        setShowModal(true);
    };

    const handleOpenEdit = (plat: Platform) => {
        setEditTarget(plat);
        setForm({
            name: plat.name,
            url: plat.url,
            icon: plat.icon,
            description: plat.description
        });
        setShowModal(true);
    };

    const handleSubmit = () => {
        if (editTarget) {
            setPlatforms(platforms.map(p => p.id === editTarget.id ? { ...p, ...form } : p));
        } else {
            const newPlat = {
                id: Date.now(),
                ...form,
                status: "active" as const
            };
            setPlatforms([...platforms, newPlat]);
        }
        setShowModal(false);
        setEditTarget(null);
        setForm({ name: "", url: "", icon: "🌐", description: "" });
    };

    const confirmDelete = () => {
        if (deleteTarget) {
            setPlatforms(platforms.filter(p => p.id !== deleteTarget.id));
            setDeleteTarget(null);
        }
    };

    const filtered = platforms.filter(p =>
        p.name.includes(searchTerm)
    );

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: "1.8em", fontWeight: 700 }}>المنصات الحكومية</h1>
                    <p style={{ margin: "5px 0 0 0", color: "var(--text-muted)" }}>إدارة المنصات الإلكترونية والربط</p>
                </div>
                <button onClick={handleOpenAdd} style={{ background: "var(--primary)", padding: "12px 24px" }}>
                    + إضافة منصة جديدة
                </button>
            </div>

            <div style={{ position: "relative", marginBottom: 30 }}>
                <input
                    type="text"
                    placeholder="بحث عن منصة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingRight: 45, height: 50, background: "#fff" }}
                />
                <span style={{ position: "absolute", right: 15, top: 15 }}>🔍</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
                {filtered.map(plat => (
                    <div key={plat.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 15, position: "relative" }}>
                        <div style={{ position: "absolute", left: 15, top: 15 }}>
                            <span style={{
                                padding: "4px 8px",
                                borderRadius: 6,
                                fontSize: "0.75em",
                                background: plat.status === 'active' ? "rgba(16, 185, 129, 0.1)" : "#f1f5f9",
                                color: plat.status === 'active' ? "var(--success)" : "var(--text-muted)",
                                fontWeight: 700
                            }}>
                                {plat.status === 'active' ? 'نشطة' : 'غير نشطة'}
                            </span>
                        </div>

                        <div style={{ width: 60, height: 60, background: "#f8fafc", borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2em" }}>
                            {plat.icon}
                        </div>

                        <div>
                            <h3 style={{ margin: "0 0 5px 0" }}>{plat.name}</h3>
                            <p style={{ margin: 0, fontSize: "0.85em", color: "var(--text-muted)", minHeight: 40 }}>{plat.description}</p>
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                            <a
                                href={plat.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                    flex: 1,
                                    textAlign: "center",
                                    padding: "10px",
                                    background: "rgba(78, 68, 231, 0.08)",
                                    color: "var(--accent)",
                                    borderRadius: 10,
                                    fontWeight: 600,
                                    fontSize: "0.9em"
                                }}
                            >
                                فتح المنصة 🔗
                            </a>
                            <button onClick={() => handleOpenEdit(plat)} className="secondary" style={{ padding: 10 }}>✏️</button>
                            <button onClick={() => setDeleteTarget(plat)} className="secondary" style={{ padding: 10, color: "var(--danger)" }}>🗑️</button>
                        </div>
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
                            هل أنت متأكد من حذف منصة <b>{deleteTarget.name}</b>؟
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
                    <div className="modal-content">
                        <h2 style={{ marginBottom: 25 }}>{editTarget ? "تعديل المنصة" : "إضافة منصة جديدة"}</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                            <div>
                                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>اسم المنصة</label>
                                <input
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="مثال: أبشر"
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>الرابط</label>
                                <input
                                    value={form.url}
                                    onChange={e => setForm({ ...form, url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>وصف المنصة</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    placeholder="وصف مختصر للمنصة..."
                                    style={{ height: 80 }}
                                />
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 15, marginTop: 30 }}>
                            <button onClick={handleSubmit} style={{ flex: 1 }}>{editTarget ? "تحديث البيانات" : "حفظ المعلومات"}</button>
                            <button onClick={() => setShowModal(false)} className="secondary" style={{ flex: 1 }}>إلغاء</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
