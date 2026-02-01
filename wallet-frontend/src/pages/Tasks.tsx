
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Task {
    id: number;
    name: string;
    national_id: string;
    mobile: string;
    dob: string;
    marital_status: string;
    address: string;
    email: string;
    task_title: string;
    task_date: string;
    notes: string;
}

function LocationMarker({ setAddress }: { setAddress: (addr: string) => void }) {
    const [position, setPosition] = useState<L.LatLng | null>(null);

    useMapEvents({
        click(e) {
            setPosition(e.latlng);
            // Reverse geocoding using Nominatim (OpenStreetMap)
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
                .then(res => res.json())
                .then(data => {
                    setAddress(data.display_name || `${e.latlng.lat}, ${e.latlng.lng}`);
                })
                .catch(() => {
                    setAddress(`${e.latlng.lat}, ${e.latlng.lng}`);
                });
        },
    });

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

export default function Tasks() {
    const { user, showToast } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [saving, setSaving] = useState(false);

    const initialForm = {
        name: '', national_id: '', mobile: '', dob: '',
        marital_status: 'أعزب', address: '', email: '',
        task_title: '', task_date: new Date().toISOString().split('T')[0], notes: ''
    };
    const [form, setForm] = useState(initialForm);

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        setLoading(true);
        try {
            const res = await api.get('/tasks');
            setTasks(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/tasks', form);
            showToast('تم حفظ المهمة بنجاح');
            setShowModal(false);
            setForm(initialForm);
            loadTasks();
        } catch (err) {
            showToast('فشل الحفظ', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2>📋 المهام</h2>
                {user?.role !== 'viewer' && (
                    <button onClick={() => setShowModal(true)}>+ إضافة مهمة</button>
                )}
            </div>

            {loading ? <p>جاري التحميل...</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                    {tasks.map(task => (
                        <div key={task.id} className="card">
                            <h3 style={{ marginTop: 0 }}>{task.task_title}</h3>
                            <div style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginBottom: 10 }}>
                                📅 {task.task_date} | 👤 {task.name}
                            </div>
                            <div style={{ marginBottom: 5 }}>📱 {task.mobile}</div>
                            {task.address && <div style={{ marginBottom: 5 }}>📍 {task.address}</div>}
                            {task.notes && <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, marginTop: 10, fontSize: '0.9em' }}>{task.notes}</div>}
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 700 }}>
                        <h3>إضافة مهمة جديدة</h3>
                        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>

                            {/* Personal Info */}
                            <div style={{ gridColumn: 'span 2', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: 5, marginTop: 10 }}>البيانات الشخصية</div>

                            <div>
                                <label>الاسم</label>
                                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div>
                                <label>رقم الهوية</label>
                                <input value={form.national_id} onChange={e => setForm({ ...form, national_id: e.target.value })} />
                            </div>
                            <div>
                                <label>رقم التواصل</label>
                                <input value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} />
                            </div>
                            <div>
                                <label>تاريخ الميلاد</label>
                                <input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
                            </div>
                            <div>
                                <label>الحالة الاجتماعية</label>
                                <select value={form.marital_status} onChange={e => setForm({ ...form, marital_status: e.target.value })}>
                                    <option value="أعزب">أعزب</option>
                                    <option value="متزوج">متزوج</option>
                                    <option value="مطلق">مطلق</option>
                                    <option value="أرمل">أرمل</option>
                                </select>
                            </div>
                            <div>
                                <label>البريد الإلكتروني</label>
                                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>

                            {/* Address with Map */}
                            <div style={{ gridColumn: 'span 2' }}>
                                <label>العنوان الوطني</label>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <input
                                        value={form.address}
                                        onChange={e => setForm({ ...form, address: e.target.value })}
                                        style={{ flex: 1 }}
                                        placeholder="أدخل العنوان أو حدد من الخريطة"
                                    />
                                    <button type="button" className="secondary" onClick={() => setShowMap(true)}>🗺️ الخريطة</button>
                                </div>
                            </div>

                            {/* Task Info */}
                            <div style={{ gridColumn: 'span 2', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: 5, marginTop: 10 }}>بيانات المهمة</div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label>عنوان المهمة</label>
                                <input value={form.task_title} onChange={e => setForm({ ...form, task_title: e.target.value })} required placeholder="مثال: تجديد رخصة، استخراج تأشيرة..." />
                            </div>
                            <div>
                                <label>تاريخ المهمة</label>
                                <input type="date" value={form.task_date} onChange={e => setForm({ ...form, task_date: e.target.value })} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label>ملاحظات</label>
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
                            </div>

                            <div style={{ gridColumn: 'span 2', display: 'flex', gap: 10, marginTop: 20 }}>
                                <button type="submit" disabled={saving} style={{ flex: 1 }}>{saving ? 'جاري الحفظ...' : 'حفظ المهمة'}</button>
                                <button type="button" className="secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Map Modal */}
            {showMap && (
                <div className="modal-overlay" style={{ zIndex: 2000 }}>
                    <div className="modal-content" style={{ width: '90%', height: '80vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
                        <div style={{ padding: 15, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>حدد الموقع</h3>
                            <button className="secondary" onClick={() => setShowMap(false)}>إغلاق</button>
                        </div>
                        <div style={{ flex: 1 }}>
                            <MapContainer center={[24.7136, 46.6753]} zoom={13} style={{ height: '100%', width: '100%' }}>
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution="&copy; OpenStreetMap contributors"
                                />
                                <LocationMarker setAddress={(addr) => {
                                    setForm(prev => ({ ...prev, address: addr }));
                                    // Optional: Close map immediately or let user verify
                                    // setShowMap(false); 
                                }} />
                            </MapContainer>
                        </div>
                        <div style={{ padding: 15, textAlign: 'center', background: '#f9f9f9' }}>
                            <p style={{ margin: 0, fontSize: '0.9em', color: '#666' }}>
                                {form.address ? `الموقع المحدد: ${form.address}` : 'اضغط على الخريطة لتحديد الموقع'}
                            </p>
                            {form.address && <button onClick={() => setShowMap(false)} style={{ marginTop: 10 }}>تأكيد الموقع</button>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
