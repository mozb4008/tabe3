import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

type Operation = {
    id: number;
    date: string;
    property_type: string;
    reference_number: string;
    amount: number;
    category: string;
    description: string;
    attachment_path?: string;
    type: "in" | "out";
    created_by_name: string;
};

import { useLocation } from "react-router-dom";

export default function Operations() {
    const { user } = useAuth();
    const loc = useLocation();
    const [ops, setOps] = useState<Operation[]>([]);
    const [q, setQ] = useState("");
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [viewerPath, setViewerPath] = useState<string | null>(null);

    const load = async () => {
        const params = new URLSearchParams(loc.search);
        const fType = params.get("filterType");
        const fVal = params.get("filterValue");

        let url = `/operations?q=${q}`;
        if (fType && fVal) {
            url += `&${fType}=${encodeURIComponent(fVal)}`;
        }

        const res = await api.get(url);
        setOps(res.data);
    };

    useEffect(() => {
        load();
    }, [q, loc.search]);

    const confirmDelete = async () => {
        if (!deleteId) return;
        await api.delete("/operations/" + deleteId);
        setDeleteId(null);
        load();
    };

    return (
        <div>
            {/* Custom Delete Modal */}
            {deleteId && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ textAlign: "center", maxWidth: 400 }}>
                        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "1.8em" }}>⚠️</div>
                        <h3 style={{ marginBottom: 10 }}>تأكيد الحذف</h3>
                        <p style={{ color: "var(--text-muted)", marginBottom: 30 }}>هل أنت متأكد من رغبتك في حذف هذه العملية؟ لا يمكن التراجع عن هذا الإجراء.</p>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                            <button style={{ background: "var(--danger)" }} onClick={confirmDelete}>نعم، احذف</button>
                            <button className="secondary" onClick={() => setDeleteId(null)}>تراجع</button>
                        </div>
                    </div>
                </div>
            )}

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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
                <h3 style={{ margin: 0 }}>سجل العمليات</h3>
                <input
                    placeholder="بحث برقم المرجع أو الوصف..."
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    style={{ width: 300 }}
                />
            </div>

            <div className="card" style={{ padding: 0 }}>
                <table>
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>المرجع</th>
                            <th>العقار</th>
                            <th>المبلغ</th>
                            <th>التصنيف</th>
                            <th>المرفق</th>
                            <th>النوع</th>
                            <th>بواسطة</th>
                            {user?.role === "admin" && <th>إجراء</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {ops.map(o => (
                            <tr key={o.id}>
                                <td>{o.date}</td>
                                <td>{o.reference_number || "-"}</td>
                                <td>{o.property_type || "-"}</td>
                                <td style={{ fontWeight: 600 }}>{o.amount.toLocaleString()} ر.س</td>
                                <td>{o.category || "-"}</td>
                                <td>
                                    {o.attachment_path ? (
                                        <button
                                            onClick={() => setViewerPath(o.attachment_path || null)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', padding: 4 }}
                                            title="عرض المرفق"
                                        >🖇️</button>
                                    ) : "-"}
                                </td>
                                <td>
                                    <span style={{
                                        padding: "4px 10px", borderRadius: 8, fontSize: "0.85em",
                                        background: o.type === 'in' ? '#d1fae5' : '#fee2e2',
                                        color: o.type === 'in' ? '#065f46' : '#991b1b'
                                    }}>
                                        {o.type === 'in' ? 'دخل' : 'مصروف'}
                                    </span>
                                </td>
                                <td>{o.created_by_name}</td>
                                {user?.role === "admin" && (
                                    <td>
                                        <button onClick={() => setDeleteId(o.id)} style={{ padding: 6, background: 'none', color: 'var(--danger)' }}>🗑️</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
