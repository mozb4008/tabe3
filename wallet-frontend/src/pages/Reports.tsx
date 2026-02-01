import { useEffect, useState } from "react";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function Reports() {
    const nav = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/reports")
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ textAlign: 'center', padding: 50 }}>جاري تحميل التقارير...</div>;
    if (!data) return <div style={{ textAlign: 'center', padding: 50 }}>فشل تحميل البيانات</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40, direction: 'rtl' }}>
            <div>
                <h1 style={{ margin: 0, fontSize: '1.8em', fontWeight: 800 }}>التقارير التحليلية</h1>
                <p style={{ color: 'var(--text-muted)' }}>نظرة شاملة على الأداء المالي والالتزامات النظامية</p>
            </div>

            {/* Financial Section */}
            <div>
                <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>💰 التقارير المالية (الفواتير)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                    <div className="card" style={{ borderRight: '5px solid #10b981' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>إجمالي المسدد</p>
                        <h2 style={{ color: '#059669' }}>{(data.finances?.paid_amount || 0).toLocaleString()} ر.س</h2>
                    </div>
                    <div className="card" style={{ borderRight: '5px solid #ef4444' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>إجمالي غير المسدد</p>
                        <h2 style={{ color: '#dc2626' }}>{(data.finances?.unpaid_amount || 0).toLocaleString()} ر.س</h2>
                    </div>
                    <div className="card" style={{ borderRight: '5px solid #6366f1' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>القيمة الإجمالية</p>
                        <h2>{(data.finances?.total_amount || 0).toLocaleString()} ر.س</h2>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
                {/* Platform Categories */}
                <div>
                    <h3 style={{ marginBottom: 20 }}>🏢 توزيع المنصات حسب التصنيف</h3>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                        {data.platformCategories.length > 0 ? data.platformCategories.map((cat: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: idx !== data.platformCategories.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                <span style={{ fontWeight: 600 }}>{cat.name || 'غير مصنف'}</span>
                                <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '4px 12px', borderRadius: 20, fontSize: '0.85em', fontWeight: 700 }}>{cat.count} منصة</span>
                            </div>
                        )) : <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>لا توجد بيانات منصات</p>}
                    </div>
                </div>

                {/* Statutory Health */}
                <div>
                    <h3 style={{ marginBottom: 20 }}>✅ صحة الالتزامات النظامية</h3>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                            <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5em' }}>🚫</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700 }}>خدمات منتهية</div>
                                <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>يجب اتخاذ إجراء فوري لتجنب الغرامات</div>
                            </div>
                            <div style={{ fontSize: '1.5em', fontWeight: 800, color: '#dc2626' }}>{data.expiries.expired}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                            <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5em' }}>⏳</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700 }}>تنبيهات قرب الانتهاء</div>
                                <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>خدمات تنتهي خلال الـ 30 يوماً القادمة</div>
                            </div>
                            <div style={{ fontSize: '1.5em', fontWeight: 800, color: '#d97706' }}>{data.expiries.warning}</div>
                        </div>
                    </div>
                </div>
            </div>

            <button onClick={() => nav(-1)} className="secondary" style={{ alignSelf: 'center', padding: '12px 40px' }}>العودة</button>
        </div>
    );
}
