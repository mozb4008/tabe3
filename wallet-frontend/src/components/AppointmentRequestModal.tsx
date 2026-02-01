
import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface AppointmentRequest {
    id: number;
    title: string;
    date: string;
    time: string;
    description: string;
    status: 'pending';
}

export default function AppointmentRequestModal() {
    const { user, showToast } = useAuth();
    const [request, setRequest] = useState<AppointmentRequest | null>(null);
    const [loading, setLoading] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [showRejectForm, setShowRejectForm] = useState(false);

    useEffect(() => {
        // Only check if user is an owner (has institution_id, or we check role if distinct)
        // User object needs to have institution_id. We'll update AuthContext/Login to ensure it's there.
        // For now, assuming user.institution_id exists if they are an owner.
        if (user && (user as any).institution_id) {
            checkPendingAppointments();
        }
    }, [user]);

    const checkPendingAppointments = async () => {
        try {
            // Fetch pending appointments for my institution
            const res = await api.get('/appointments?status=pending');
            if (res.data && res.data.length > 0) {
                // Show the first one
                setRequest(res.data[0]);
            }
        } catch (err) {
            console.error("Failed to check appointments", err);
        }
    };

    const handleAction = async (status: 'approved' | 'rejected') => {
        if (!request) return;

        if (status === 'rejected' && !showRejectForm) {
            setShowRejectForm(true);
            return;
        }

        if (status === 'rejected' && !rejectionReason) {
            showToast("يرجى كتابة سبب الرفض", "error");
            return;
        }

        setLoading(true);
        try {
            await api.put(`/appointments/${request.id}/status`, {
                status,
                rejection_reason: rejectionReason
            });
            showToast(status === 'approved' ? "تم قبول الموعد" : "تم رفض الموعد");
            setRequest(null); // Close modal
            setShowRejectForm(false);
            setRejectionReason("");

            // Check for more?
            checkPendingAppointments();
        } catch (err: any) {
            const msg = err.response?.data?.message || "حدث خطأ";
            showToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    if (!request) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 450, textAlign: 'center' }}>
                <div style={{ fontSize: '3em', marginBottom: 10 }}>📅</div>
                <h2 style={{ margin: 0 }}>طلب موعد جديد</h2>
                <p style={{ color: 'var(--text-muted)' }}>لديك طلب موعد بانتظار الموافقة</p>

                <div style={{ background: '#f8fafc', padding: 15, borderRadius: 12, margin: '20px 0', textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1em', marginBottom: 5 }}>{request.title}</div>
                    <div style={{ display: 'flex', gap: 15, fontSize: '0.9em', color: '#475569', marginBottom: 10 }}>
                        <span>📅 {request.date}</span>
                        <span>⏰ {request.time}</span>
                    </div>
                    {request.description && <div style={{ fontSize: '0.9em' }}>{request.description}</div>}
                </div>

                {showRejectForm ? (
                    <div style={{ marginBottom: 20 }}>
                        <textarea
                            placeholder="سبب الرفض..."
                            value={rejectionReason}
                            onChange={e => setRejectionReason(e.target.value)}
                            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
                        />
                        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                            <button onClick={() => handleAction('rejected')} disabled={loading} style={{ background: 'var(--danger)', flex: 1 }}>تأكيد الرفض</button>
                            <button onClick={() => setShowRejectForm(false)} className="secondary" style={{ flex: 1 }}>إلغاء</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: 15 }}>
                        <button onClick={() => handleAction('approved')} disabled={loading} style={{ flex: 1, background: 'var(--success)' }}>قبول الموعد</button>
                        <button onClick={() => handleAction('rejected')} disabled={loading} style={{ flex: 1, background: 'var(--danger)' }}>رفض</button>
                    </div>
                )}
            </div>
        </div>
    );
}
