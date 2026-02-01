
import { useEffect, useState } from "react";
import api from "../lib/api";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Setting = { id: number; name: string; type: string };
type User = { id: number; name: string; username: string; role: string; email?: string; institution_id?: number; institution_name?: string };
type Institution = { id: number; name: string };
type PlatformInfo = {
    name: string;
    description: string;
    logo_path?: string;
    ai_api_key?: string;
    ai_enabled?: number;
    telegram_token?: string;
    telegram_chat_id?: string;
    telegram_enabled?: number;
};

export default function Settings() {
    const { user, showToast, updatePlatformInfo } = useAuth();
    if (user?.role !== "admin") return <Navigate to="/" />;

    const [activeTab, setActiveTab] = useState("identity"); // identity, users, dev, [dynamic_types], manage_tabs
    const [settings, setSettings] = useState<Setting[]>([]);
    const [settingTypes, setSettingTypes] = useState<string[]>([]);
    const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
        name: "",
        description: "",
        ai_api_key: "",
        ai_enabled: 1,
        telegram_token: "",
        telegram_chat_id: "",
        telegram_enabled: 1
    });
    const [users, setUsers] = useState<User[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);

    const testTelegram = async () => {
        if (!platformInfo.telegram_token || !platformInfo.telegram_chat_id) {
            showToast("يرجى إدخال التوكن وChat ID أولاً", "error");
            return;
        }
        try {
            await api.post("/telegram/test", {
                token: platformInfo.telegram_token,
                chat_id: platformInfo.telegram_chat_id
            });
            showToast("تم إرسال رسالة الاختبار بنجاح!", "success");
        } catch (err: any) {
            showToast(err.response?.data?.message || "فشل اختبار الاتصال", "error");
        }
    };

    // Identity Form
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [savingIdentity, setSavingIdentity] = useState(false);

    // User Form
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [userForm, setUserForm] = useState({ name: "", username: "", password: "", email: "", role: "viewer", institution_id: "" });

    // Generic Settings Form
    const [newName, setNewName] = useState("");

    // Manage Tabs Form
    const [newTabName, setNewTabName] = useState("");

    // Deletion Modal
    const [delConfirm, setDelConfirm] = useState<{ id: number; type: 'user' | 'setting'; label: string } | null>(null);

    useEffect(() => {
        loadSettings();
        loadPlatformInfo();
        loadSettingTypes();
        if (activeTab === 'users') {
            loadUsers();
            loadInstitutions();
        }
    }, [activeTab]);

    const loadSettings = () => api.get("/settings").then(res => setSettings(res.data));
    const loadSettingTypes = () => api.get("/settings/types").then(res => setSettingTypes(res.data));
    const loadPlatformInfo = () => api.get("/platform").then(res => setPlatformInfo(res.data));
    const loadUsers = () => api.get("/users").then(res => setUsers(res.data));
    const loadInstitutions = () => api.get("/institutions").then(res => setInstitutions(res.data));

    // --- IDENTITY TAB ---
    const handleIdentitySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingIdentity(true);
        const formData = new FormData();
        const fields = ['name', 'description', 'ai_api_key', 'telegram_token', 'telegram_chat_id', 'ai_enabled', 'telegram_enabled'];
        fields.forEach(f => {
            const val = (platformInfo as any)[f];
            formData.append(f, val === undefined ? "" : String(val));
        });
        if (logoFile) formData.append("logo", logoFile);

        try {
            const res = await api.post("/platform", formData);
            const updatedData = res.data.data;

            setPlatformInfo(updatedData); // Local state for form
            setLogoFile(null); // Clear file input after success

            // Instantly update global branding in AuthContext
            updatePlatformInfo(updatedData);

            showToast("تم تحديث هوية المنصة بنجاح", "success");
        } catch (err: any) {
            console.error("Identity Update Error:", err);
            showToast("فشل التحديث", "error");
        } finally {
            setSavingIdentity(false);
        }
    };

    // --- USERS TAB ---
    const handleUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUserId) {
                await api.put(`/users/${editingUserId}`, userForm);
                showToast("تم تحديث بيانات المستخدم بنجاح", "success");
            } else {
                await api.post("/users", userForm);
                showToast("تم إضافة المستخدم بنجاح", "success");
            }
            setShowUserModal(false);
            setEditingUserId(null);
            setUserForm({ name: "", username: "", password: "", email: "", role: "viewer", institution_id: "" });
            loadUsers();
        } catch (err: any) {
            showToast(err.response?.data?.message || "فشلت العملية", "error");
        }
    };

    const handleEditUser = (u: User) => {
        setEditingUserId(u.id);
        setUserForm({
            name: u.name,
            username: u.username,
            password: "", // Don't pre-fill password
            email: u.email || "",
            role: u.role,
            institution_id: u.institution_id ? String(u.institution_id) : ""
        });
        setShowUserModal(true);
    };

    const handleDeleteUser = (u: User) => {
        setDelConfirm({ id: u.id, type: 'user', label: `المستخدم ${u.name}` });
    };

    const confirmDelete = async () => {
        if (!delConfirm) return;
        try {
            if (delConfirm.type === 'user') {
                await api.delete(`/users/${delConfirm.id}`);
                loadUsers();
            } else {
                await api.delete(`/settings/${delConfirm.id}`);
                loadSettings();
            }
            showToast("تم الحذف بنجاح", "success");
        } catch (err: any) {
            showToast("فشل الحذف", "error");
        } finally {
            setDelConfirm(null);
        }
    };

    // --- DYNAMIC SETTINGS TABS ---
    const addSetting = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return;
        try {
            await api.post("/settings", { name: newName, type: activeTab });
            setNewName("");
            loadSettings();
        } catch (err) {
            showToast("فشل الإضافة", "error");
        }
    };

    const deleteSetting = (s: Setting) => {
        setDelConfirm({ id: s.id, type: 'setting', label: s.name });
    };

    // --- MANAGE TABS ---
    const addNewTabType = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTabName) return;
        // Just "registering" it effectively by creating it. 
        // Backend endpoint expects { type: "name" }
        // Ideally we should probably just rely on the first item being added, 
        // but to show it in the list immediately we might need a dummy item or just forcing the frontend list update.
        // For this implementation, I'll add the string to the local state so it appears immediately,
        // and when they add an item to it, it becomes permanent in the DB.
        if (!settingTypes.includes(newTabName)) {
            setSettingTypes([...settingTypes, newTabName]);
            showToast("تم إضافة التبويب. يمكنك الآن إضافة عناصر إليه.", "success");
            setNewTabName("");
        }
    };

    // Translations for known types
    const typeLabels: Record<string, string> = {
        identity: "هوية المنصة",
        users: "إدارة المستخدمين",
        dev: "التطوير والذكاء الاصطناعي",
        manage_tabs: "إدارة التبويبات",
        property_type: "أنواع العقارات",
        category: "تصنيفات العمليات",
        person: "الجهات / الأشخاص",
        nationality: "الجنسيات",
        activity: "الأنشطة",
        entity: "الجهات المعنية"
    };

    const getLabel = (type: string) => typeLabels[type] || type;

    return (
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <h2>⚙️ لوحة التحكم والإعدادات</h2>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, borderBottom: "1px solid #ddd", paddingBottom: 10, marginBottom: 20 }}>
                <button
                    className={activeTab === 'identity' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('identity')}
                >
                    هوية المنصة
                </button>
                <button
                    className={activeTab === 'users' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('users')}
                >
                    إدارة المستخدمين
                </button>
                <button
                    className={activeTab === 'dev' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('dev')}
                >
                    التطوير والذكاء الاصطناعي
                </button>

                {settingTypes.map(type => (
                    <button
                        key={type}
                        className={activeTab === type ? 'primary' : 'secondary'}
                        onClick={() => setActiveTab(type)}
                    >
                        {getLabel(type)}
                    </button>
                ))}

                <button
                    className={activeTab === 'manage_tabs' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('manage_tabs')}
                    style={{ border: '1px dashed #666' }}
                >
                    + إدارة التبويبات
                </button>
            </div>

            {/* TAB CONTENT: IDENTITY */}
            {activeTab === 'identity' && (
                <div className="card">
                    <h3>هوية المنصة</h3>
                    <form onSubmit={handleIdentitySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15, maxWidth: 500 }}>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            {platformInfo.logo_path && !logoFile && (
                                <img src={platformInfo.logo_path} alt="Logo" style={{ maxHeight: 100, marginBottom: 10 }} />
                            )}
                            <input type="file" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                        </div>
                        <div>
                            <label>اسم المنصة</label>
                            <input value={platformInfo.name} onChange={e => setPlatformInfo({ ...platformInfo, name: e.target.value })} />
                        </div>
                        <div>
                            <label>وصف المنصة</label>
                            <textarea value={platformInfo.description} onChange={e => setPlatformInfo({ ...platformInfo, description: e.target.value })} rows={3} />
                        </div>
                        <button type="submit" disabled={savingIdentity}>{savingIdentity ? "جاري الحفظ..." : "حفظ التغييرات"}</button>
                    </form>
                </div>
            )}

            {/* TAB CONTENT: USERS */}
            {activeTab === 'users' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                        <h3>المستخدمين</h3>
                        <button onClick={() => setShowUserModal(true)}>+ مستخدم جديد</button>
                    </div>
                    <div className="card">
                        <table style={{ width: '100%', textAlign: 'right' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #eee' }}>
                                    <th>الاسم</th>
                                    <th>اسم المستخدم</th>
                                    <th>الصلاحية</th>
                                    <th>المؤسسة المرتبطة</th>
                                    <th>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                        <td style={{ padding: 10 }}>{u.name}</td>
                                        <td>{u.username}</td>
                                        <td>
                                            {u.role === 'admin' ? 'مدير' :
                                                u.role === 'entry' ? 'مدخل بيانات' : 'مشاهد (صاحب مؤسسة)'}
                                        </td>
                                        <td>{u.institution_name || '-'}</td>
                                        <td>
                                            <button
                                                onClick={() => handleEditUser(u)}
                                                style={{ background: 'none', color: 'var(--accent)', border: 'none', cursor: 'pointer', marginLeft: 10 }}
                                            >
                                                تعديل
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(u)}
                                                style={{ background: 'none', color: 'red', border: 'none', cursor: 'pointer' }}
                                            >
                                                حذف
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {showUserModal && (
                        <div className="modal-overlay">
                            <div className="modal-content">
                                <h3>{editingUserId ? "تعديل بيانات المستخدم" : "إضافة مستخدم جديد"}</h3>
                                <form onSubmit={handleUserSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                    <div>
                                        <label>الاسم الكامل</label>
                                        <input value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label>اسم المستخدم</label>
                                        <input value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label>كلمة المرور (اختياري عند التعديل)</label>
                                        <input
                                            type="password"
                                            value={userForm.password}
                                            onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                            required={!editingUserId}
                                            placeholder={editingUserId ? "اتركه فارغاً للحفاظ على القديمة" : ""}
                                        />
                                    </div>
                                    <div>
                                        <label>البريد الإلكتروني</label>
                                        <input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label>الصلاحية</label>
                                        <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                                            <option value="viewer">مشاهد (صاحب مؤسسة)</option>
                                            <option value="entry">مدخل بيانات</option>
                                            <option value="admin">مدير النظام</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label>ربط بمؤسسة (اختياري)</label>
                                        <select value={userForm.institution_id} onChange={e => setUserForm({ ...userForm, institution_id: e.target.value })}>
                                            <option value="">-- عام (بدون ربط) --</option>
                                            {institutions.map(inst => (
                                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                                            ))}
                                        </select>
                                        <p style={{ fontSize: '0.8em', color: '#666', marginTop: 5 }}>
                                            ربط المستخدم بمؤسسة سيحصر صلاحيات المشاهدة الخاصة به على بيانات هذه المؤسسة فقط.
                                        </p>
                                    </div>
                                    <div style={{ gridColumn: 'span 2', display: 'flex', gap: 10, marginTop: 10 }}>
                                        <button type="submit" style={{ flex: 1 }}>حفظ</button>
                                        <button type="button" className="secondary" onClick={() => setShowUserModal(false)} style={{ flex: 1 }}>إلغاء</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: DEVELOPMENT & AI */}
            {activeTab === 'dev' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: '1.5em' }}>⚡</span>
                                <h3 style={{ margin: 0 }}>المساعد الذكي (Groq AI)</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPlatformInfo({ ...platformInfo, ai_enabled: platformInfo.ai_enabled ? 0 : 1 })}
                                style={{
                                    padding: '5px 15px',
                                    fontSize: '0.85em',
                                    background: platformInfo.ai_enabled ? 'var(--accent)' : '#ccc',
                                    borderRadius: 20
                                }}
                            >
                                {platformInfo.ai_enabled ? "مفعّل" : "معطّل"}
                            </button>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9em', marginBottom: 20 }}>
                            مساعد فائق السرعة متخصص في الإجراءات السعودية، يعمل بتقنية Groq Llama-3.3 لتوفير استجابة فورية.
                        </p>
                        <form onSubmit={handleIdentitySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            <div>
                                <label>Groq API Key</label>
                                <input
                                    type="password"
                                    value={platformInfo.ai_api_key}
                                    onChange={e => setPlatformInfo({ ...platformInfo, ai_api_key: e.target.value })}
                                    placeholder="أدخل مفتاح الـ API الخاص بـ Groq"
                                />
                                <p style={{ fontSize: '0.8em', color: '#666', marginTop: 5 }}>يمكنك الحصول على المفتاح مجاناً من groq.com</p>
                            </div>
                            <button type="submit" disabled={savingIdentity}>{savingIdentity ? "جاري الحفظ..." : "حفظ إعدادات المساعد"}</button>
                        </form>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: '1.5em' }}>📢</span>
                                <h3 style={{ margin: 0 }}>بوت تيليقرام (الإشعارات)</h3>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    type="button"
                                    onClick={testTelegram}
                                    style={{
                                        padding: '5px 15px',
                                        fontSize: '0.85em',
                                        background: '#f1f5f9',
                                        color: '#475569',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: 20
                                    }}
                                >
                                    اختبار الاتصال ⚡
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPlatformInfo({ ...platformInfo, telegram_enabled: platformInfo.telegram_enabled ? 0 : 1 })}
                                    style={{
                                        padding: '5px 15px',
                                        fontSize: '0.85em',
                                        background: platformInfo.telegram_enabled ? 'var(--accent)' : '#ccc',
                                        borderRadius: 20
                                    }}
                                >
                                    {platformInfo.telegram_enabled ? "مفعّل" : "معطّل"}
                                </button>
                            </div>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9em', marginBottom: 20 }}>
                            ربط المنصة ببوت تيليقرام لاستلام التنبيهات الفورية حول العمليات والمواعيد.
                        </p>
                        <form onSubmit={handleIdentitySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            <div>
                                <label>Bot Token</label>
                                <input
                                    value={platformInfo.telegram_token}
                                    onChange={e => setPlatformInfo({ ...platformInfo, telegram_token: e.target.value })}
                                    placeholder="مثال: 123456789:ABCDE..."
                                />
                            </div>
                            <div>
                                <label>Chat ID</label>
                                <input
                                    value={platformInfo.telegram_chat_id}
                                    onChange={e => setPlatformInfo({ ...platformInfo, telegram_chat_id: e.target.value })}
                                    placeholder="مثال: -100123456789"
                                />
                            </div>
                            <button type="submit" disabled={savingIdentity} className="secondary">{savingIdentity ? "جاري الحفظ..." : "حفظ إعدادات البوت"}</button>
                        </form>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: MANAGE TABS */}
            {activeTab === 'manage_tabs' && (
                <div className="card" style={{ maxWidth: 500, margin: '0 auto' }}>
                    <h3>إضافة تبويب / تصنيف جديد</h3>
                    <p>أضف تصنيفاً جديداً ليظهر كقائمة منسدلة في النظام (مثل: المناطق، أنواع السيارات...)</p>
                    <form onSubmit={addNewTabType} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <input
                            value={newTabName}
                            onChange={e => setNewTabName(e.target.value)}
                            placeholder="اسم التبويب الجديد (بالانجليزية يفضل)"
                            required
                            className="mobile-full-width"
                        />
                        <button type="submit" className="mobile-full-width">إضافة</button>
                    </form>
                    <div style={{ marginTop: 20 }}>
                        <h4>التبويبات الحالية:</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {settingTypes.map(t => (
                                <span key={t} style={{ background: '#eee', padding: '5px 10px', borderRadius: 4 }}>{getLabel(t)}</span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: DYNAMIC SETTINGS (Default) */}
            {!['identity', 'users', 'manage_tabs', 'dev'].includes(activeTab) && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, flexWrap: 'wrap', gap: 20 }}>
                        <h3 style={{ margin: 0, fontSize: '1.5em' }}>{getLabel(activeTab)}</h3>
                        <form onSubmit={addSetting} style={{ display: 'flex', gap: 0, flex: 1, maxWidth: 600, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', flex: 1, display: 'flex', flexWrap: 'wrap' }}>
                                <input
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder={`إضافة ${getLabel(activeTab)} جديد...`}
                                    className="mobile-full-width"
                                    style={{
                                        flex: 1,
                                        height: 55,
                                        padding: '0 20px',
                                        fontSize: '1em',
                                        borderRadius: '15px', // Changed to rounded for both mobile/pc when wrap occurs
                                        background: '#fff',
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                                        marginBottom: 10
                                    }}
                                />
                                <button type="submit" className="mobile-full-width" style={{
                                    height: 55,
                                    padding: '0 30px',
                                    borderRadius: '15px',
                                    fontSize: '1em',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    background: 'var(--primary)',
                                    marginBottom: 10
                                }}>
                                    + إضافة عنصر
                                </button>
                            </div>
                        </form>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 15 }}>
                        {settings.filter(s => s.type === activeTab).map(s => (
                            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: '#f9f9f9', borderRadius: 8, border: '1px solid #eee' }}>
                                <span>{s.name}</span>
                                <button onClick={() => deleteSetting(s)} style={{ padding: 0, background: "none", color: "var(--danger)", fontSize: '1.2em' }}>&times;</button>
                            </div>
                        ))}
                        {settings.filter(s => s.type === activeTab).length === 0 && (
                            <p style={{ color: '#999', gridColumn: 'span 3', textAlign: 'center' }}>لا توجد عناصر مضافة حتى الآن.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Final Custom Deletion Modal */}
            {delConfirm && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ textAlign: 'center', maxWidth: 400 }}>
                        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '1.8em' }}>⚠️</div>
                        <h3 style={{ marginBottom: 10 }}>تأكيد الحذف</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 30 }}>
                            هل أنت متأكد من حذف <b>{delConfirm.label}</b>؟
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                            <button style={{ background: 'var(--danger)' }} onClick={confirmDelete}>نعم، احذف</button>
                            <button className="secondary" onClick={() => setDelConfirm(null)}>تراجع</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
