import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Appointment {
    id: number;
    institution_id: number;
    institution_name: string;
    title: string;
    date: string;
    time: string;
    description: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    rejection_reason?: string;
}

interface Institution {
    id: number;
    name: string;
}

export default function ExternalAppointments() {
    const { user, showToast } = useAuth();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

    const [form, setForm] = useState({
        institution_id: '',
        title: '',
        date: '',
        time: '',
        description: ''
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [apptRes, instRes] = await Promise.all([
                api.get('/appointments'),
                api.get('/institutions')
            ]);
            setAppointments(apptRes.data);
            setInstitutions(instRes.data);
        } catch (err) {
            console.error(err);
            showToast('فشل تحميل البيانات', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const openCreate = () => {
        setEditingId(null);
        setForm({ institution_id: '', title: '', date: '', time: '', description: '' });
        setShowModal(true);
    };

    const openEdit = (appt: Appointment) => {
        setEditingId(appt.id);
        setForm({
            institution_id: String(appt.institution_id),
            title: appt.title,
            date: appt.date,
            time: appt.time,
            description: appt.description || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.institution_id || !form.date || !form.time) {
            showToast('جميع الحقول المطلوبة', 'error');
            return;
        }

        setSaving(true);
        try {
            if (editingId) {
                await api.put(`/appointments/${editingId}`, form);
                showToast('تم تحديث الموعد بنجاح');
            } else {
                await api.post('/appointments', form);
                showToast('تم إرسال طلب الموعد بنجاح');
            }
            setShowModal(false);
            setEditingId(null);
            setForm({ institution_id: '', title: '', date: '', time: '', description: '' });
            loadData();
        } catch (err: any) {
            const msg = err.response?.data?.message || 'فشل الحفظ';
            showToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirmId) return;
        try {
            await api.delete(`/appointments/${deleteConfirmId}`);
            showToast('تم حذف الموعد');
            setDeleteConfirmId(null);
            loadData();
        } catch (err) {
            showToast('فشل الحذف', 'error');
        }
    };

    const toggleComplete = async (appt: Appointment) => {
        try {
            const newStatus = appt.status === 'completed' ? 'approved' : 'completed';
            await api.put(`/appointments/${appt.id}/status`, { status: newStatus });
            showToast(newStatus === 'completed' ? 'تم إتمام الموعد بنجاح ✅' : 'تم إعادة تنشيط الموعد');
            loadData();
        } catch (err) {
            showToast('فشل تحديث الحالة', 'error');
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: any = {
            pending: { bg: '#fef3c7', color: '#92400e', label: '⏳ قيد الانتظار' },
            approved: { bg: '#dcfce7', color: '#166534', label: '✅ مؤكد' },
            rejected: { bg: '#fee2e2', color: '#991b1b', label: '❌ مرفوض' },
            completed: { bg: '#f1f5f9', color: '#475569', label: '🏁 مكتمل' }
        };
        const s = styles[status] || styles.pending;
        return <span style={{ background: s.bg, color: s.color, padding: '4px 12px', borderRadius: 20, fontSize: '0.85em', fontWeight: 600 }}>{s.label}</span>;
    };

    return (
        <div style={{ padding: 20 }}>
            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 400, textAlign: 'center' }}>
                        <div style={{ fontSize: '3em', marginBottom: 15 }}>⚠️</div>
                        <h3 style={{ margin: '0 0 10px' }}>تأكيد حذف الموعد</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 25 }}>هل أنت متأكد من رغبتك في حذف هذا الموعد؟ لا يمكن التراجع عن هذا الإجراء.</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <button onClick={handleDelete} style={{ background: 'var(--danger)' }}>نعم، حذف الموعد</button>
                            <button onClick={() => setDeleteConfirmId(null)} className="secondary">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, flexWrap: 'wrap', gap: 15 }}>
                <div>
                    <h1 style={{ margin: 0, fontWeight: 800 }}>المواعيد الخارجية</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: 5 }}>إدارة المواعيد مع أصحاب المؤسسات</p>
                </div>
                {user?.role !== 'viewer' && (
                    <button onClick={openCreate} className="mobile-full-width" style={{ background: 'var(--accent)', padding: '12px 24px', borderRadius: 12, fontWeight: 700, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>+ حجز موعد جديد</button>
                )}
            </div>

            {loading ? <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>جاري التحميل...</div> : (
                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
                    {appointments.length > 0 ? appointments.map(appt => (
                        <div
                            key={appt.id}
                            className="card"
                            style={{
                                padding: 24,
                                borderTop: `5px solid ${appt.status === 'completed' ? '#94a3b8' : (appt.status === 'approved' ? 'var(--success)' : (appt.status === 'rejected' ? 'var(--danger)' : '#fbbf24'))}`,
                                opacity: appt.status === 'completed' ? 0.8 : 1,
                                transition: 'transform 0.2s',
                                position: 'relative'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '1.2em', color: 'var(--text-main)', marginBottom: 4 }}>{appt.institution_name}</div>
                                    <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <span>📅 {appt.date}</span>
                                        <span style={{ opacity: 0.3 }}>|</span>
                                        <span>🕒 {appt.time}</span>
                                    </div>
                                </div>
                                {getStatusBadge(appt.status)}
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>عنوان الموعد</div>
                                <div style={{ fontWeight: 700, fontSize: '1.05em' }}>{appt.title}</div>
                            </div>

                            {appt.description && (
                                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, fontSize: '0.95em', color: '#475569', marginBottom: 20, borderLeft: '3px solid #cbd5e1' }}>
                                    {appt.description}
                                </div>
                            )}

                            {appt.status === 'rejected' && appt.rejection_reason && (
                                <div style={{ marginBottom: 20, background: '#fff5f5', padding: 12, borderRadius: 10, fontSize: '0.9em', color: '#c53030', border: '1px solid #fed7d7' }}>
                                    <strong>سبب الرفض:</strong> {appt.rejection_reason}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 10, borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
                                {appt.status === 'approved' && (
                                    <button
                                        onClick={() => toggleComplete(appt)}
                                        style={{ flex: 1, background: '#475569', padding: '8px 4px', fontSize: '0.85em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                                    >
                                        🏁 إنهاء الموعد
                                    </button>
                                )}
                                {appt.status === 'completed' && (
                                    <button
                                        onClick={() => toggleComplete(appt)}
                                        style={{ flex: 1, background: '#94a3b8', padding: '8px 4px', fontSize: '0.85em' }}
                                    >
                                        🔄 إعادة تنشيط
                                    </button>
                                )}

                                {user?.role === 'admin' && (
                                    <>
                                        <button
                                            onClick={() => openEdit(appt)}
                                            className="secondary"
                                            style={{ padding: '8px 12px' }}
                                            title="تعديل"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirmId(appt.id)}
                                            className="secondary"
                                            style={{ padding: '8px 12px', color: 'var(--danger)' }}
                                            title="حذف"
                                        >
                                            🗑️
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 80, color: 'var(--text-muted)', border: '2px dashed #e2e8f0', borderRadius: 20, background: '#f8fafc' }}>
                            <div style={{ fontSize: '3em', marginBottom: 15 }}>📅</div>
                            <div style={{ fontSize: '1.2em', fontWeight: 600 }}>لا يوجد مواعيد مسجلة</div>
                            <p style={{ marginTop: 5 }}>ابدأ بحجز موعد جديد لأصحاب المؤسسات</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 500, borderRadius: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 25 }}>
                            <h2 style={{ margin: 0 }}>{editingId ? 'تعديل بيانات الموعد' : 'حجز موعد جديد'}</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', color: '#94a3b8', fontSize: '1.5em', padding: 0 }}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div>
                                <label style={{ fontWeight: 600 }}>المؤسسة</label>
                                <select
                                    value={form.institution_id}
                                    onChange={e => setForm({ ...form, institution_id: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '12px 15px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', marginTop: 8 }}
                                >
                                    <option value="">اختر المؤسسة...</option>
                                    {institutions.map(i => (
                                        <option key={i.id} value={i.id}>{i.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ fontWeight: 600 }}>عنوان الموعد</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    required
                                    placeholder="مثال: مناقشة تجديد الاشتراك"
                                    style={{ width: '100%', padding: '12px 15px', borderRadius: 12, border: '1px solid #e2e8f0', marginTop: 8 }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 15 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontWeight: 600 }}>التاريخ</label>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={e => setForm({ ...form, date: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '12px 15px', borderRadius: 12, border: '1px solid #e2e8f0', marginTop: 8 }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontWeight: 600 }}>الوقت</label>
                                    <input
                                        type="time"
                                        value={form.time}
                                        onChange={e => setForm({ ...form, time: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '12px 15px', borderRadius: 12, border: '1px solid #e2e8f0', marginTop: 8 }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontWeight: 600 }}>وصف المهمة / ملاحظات</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    rows={3}
                                    style={{ width: '100%', padding: '12px 15px', borderRadius: 12, border: '1px solid #e2e8f0', marginTop: 8 }}
                                    placeholder="اكتب هنا أي تفاصيل إضافية للموعد..."
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                                <button type="submit" disabled={saving} style={{ flex: 2, padding: '14px', borderRadius: 12 }}>{saving ? 'جاري الحفظ...' : (editingId ? 'تحديث البيانات' : 'حجز الموعد')}</button>
                                <button type="button" onClick={() => setShowModal(false)} className="secondary" style={{ flex: 1, padding: '14px', borderRadius: 12 }}>تراجع</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
