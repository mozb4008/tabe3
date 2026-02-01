import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface Service {
    id: number;
    platform_id: number;
    service_name: string;
    start_date: string;
    expiry_date: string;
    document_path?: string;
}

interface Platform {
    id: number;
    platform_name: string;
    status: 'active' | 'expired' | 'warning';
    category?: string;
    start_date?: string;
    expiry_date: string;
    due_date?: string;
    reference_number?: string;
    document_path?: string;
    services: Service[];
}

interface EmployeeService {
    id: number;
    employee_id: number;
    service_name: string;
    start_date: string;
    expiry_date: string;
    document_path: string | null;
}

interface Employee {
    id: number;
    institution_id: number;
    name: string;
    position: string;
    mobile: string;
    email: string;
    nationality: string;
    salary: number;
    services: EmployeeService[];
}

interface Violation {
    id: number;
    institution_id: number;
    violation_number: string;
    authority: string;
    violation_article: string;
    amount: number;
    violation_date: string;
    objection_start_date: string;
    objection_end_date: string;
    notes: string;
    document_path: string | null;
}

interface Appointment {
    id: number;
    institution_id: number;
    title: string;
    date: string;
    time: string;
    description: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
}

interface Invoice {
    id: number;
    institution_id: number;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    amount: number;
    fines: number;
    status: 'paid' | 'unpaid' | 'overdue';
}

interface Institution {
    id: number;
    name: string;
    owner: string;
    mobile: string;
    activity: string;
    email: string;
    platforms: Platform[];
    employees: Employee[];
    violations: Violation[];
    invoices: Invoice[];
    appointments: Appointment[];
}

export default function InstitutionServices() {
    const { id } = useParams();
    const { user, showToast } = useAuth();
    const [inst, setInst] = useState<Institution | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('platforms');

    // Platform Modal State
    const [showPlatModal, setShowPlatModal] = useState(false);
    const [editPlatTarget, setEditPlatTarget] = useState<Platform | null>(null);
    const [savingPlat, setSavingPlat] = useState(false);
    const platFileInputRef = useRef<HTMLInputElement>(null);
    const [platToDelete, setPlatToDelete] = useState<Platform | null>(null);

    // Settings for dropdowns
    const [settings, setSettings] = useState<{ id: number; name: string; type: string }[]>([]);

    const [platForm, setPlatForm] = useState({
        platform_name: "",
        category: "",
        start_date: "",
        expiry_date: "",
        due_date: "",
        reference_number: "",
        file: null as File | null
    });

    // Service Modal State
    const [showServModal, setShowServModal] = useState(false);
    const [editServTarget, setEditServTarget] = useState<Service | null>(null);
    const [activePlatForServ, setActivePlatForServ] = useState<number | null>(null);
    const [savingServ, setSavingServ] = useState(false);
    const servFileInputRef = useRef<HTMLInputElement>(null);
    const [servToDelete, setServToDelete] = useState<Service | null>(null);

    const [servForm, setServForm] = useState({
        service_name: "",
        start_date: "",
        expiry_date: "",
        file: null as File | null
    });

    // Employee State
    const [showEmpModal, setShowEmpModal] = useState(false);
    const [editEmpTarget, setEditEmpTarget] = useState<Employee | null>(null);
    const [savingEmp, setSavingEmp] = useState(false);
    const [empToDelete, setEmpToDelete] = useState<Employee | null>(null);
    const [empForm, setEmpForm] = useState({
        name: "",
        position: "",
        mobile: "",
        email: "",
        nationality: "",
        salary: ""
    });

    // Employee Service Modal State
    const [showEmpServModal, setShowEmpServModal] = useState(false);
    const [editEmpServTarget, setEditEmpServTarget] = useState<EmployeeService | null>(null);
    const [activeEmpForServ, setActiveEmpForServ] = useState<number | null>(null);
    const [savingEmpServ, setSavingEmpServ] = useState(false);
    const [empServToDelete, setEmpServToDelete] = useState<EmployeeService | null>(null);
    const empServFileInputRef = useRef<HTMLInputElement>(null);

    const [empServForm, setEmpServForm] = useState({
        service_name: "",
        start_date: "",
        expiry_date: "",
        file: null as File | null
    });

    // Alert Interaction State
    // Violation State
    const [showVioModal, setShowVioModal] = useState(false);
    const [editVioTarget, setEditVioTarget] = useState<Violation | null>(null);
    const [savingVio, setSavingVio] = useState(false);
    const [vioToDelete, setVioToDelete] = useState<Violation | null>(null);
    const vioFileInputRef = useRef<HTMLInputElement>(null);

    const [vioForm, setVioForm] = useState({
        violation_number: "",
        authority: "",
        violation_article: "",
        amount: "",
        violation_date: "",
        objection_start_date: "",
        objection_end_date: "",
        notes: "",
        file: null as File | null
    });

    // Invoice State
    const [showInvModal, setShowInvModal] = useState(false);
    const [editInvTarget, setEditInvTarget] = useState<Invoice | null>(null);
    const [savingInv, setSavingInv] = useState(false);
    const [invToDelete, setInvToDelete] = useState<Invoice | null>(null);

    const [invForm, setInvForm] = useState({
        invoice_number: "",
        invoice_date: "",
        due_date: "",
        amount: "",
        fines: "0",
        status: "unpaid" as 'paid' | 'unpaid' | 'overdue'
    });

    // Alert Interaction State
    const [activeAlertCategory, setActiveAlertCategory] = useState<'none' | 'warning' | 'expired'>('none');
    const [highlightId, setHighlightId] = useState<string | null>(null);

    const getCalculatedStatus = (expiryDate?: string): 'active' | 'expired' | 'warning' => {
        if (!expiryDate) return 'active';
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate);
        expiry.setHours(0, 0, 0, 0);

        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'expired';
        if (diffDays <= 30) return 'warning';
        return 'active';
    };

    const loadData = () => {
        setLoading(true);
        api.get(`/institutions/${id}`)
            .then(res => {
                setInst(res.data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    const loadSettings = () => {
        api.get("/settings").then(res => setSettings(res.data));
    };

    useEffect(() => {
        loadData();
        loadSettings();
    }, [id]);

    if (loading) return <div style={{ padding: 50, textAlign: 'center' }}>جاري التحميل...</div>;
    if (!inst) return <div style={{ padding: 50, textAlign: 'center' }}>المؤسسة غير موجودة</div>;

    const tabs = [
        { id: 'platforms', name: 'المنصات والاشتراكات', icon: '🌐' },
        { id: 'employees', name: 'الموظفون', icon: '👥' },
        { id: 'violations', name: 'المخالفات', icon: '⚠️' },
        { id: 'invoices', name: 'الفواتير', icon: '🧾' },
        { id: 'appointments', name: 'المواعيد', icon: '📅' }
    ];

    // Aggregated list of services with alerts
    const allWarningServices = [
        ...inst.platforms.flatMap(p => p.services.map(s => ({ ...s, parentType: 'platform', parentName: p.platform_name, parentId: p.id }))),
        ...inst.employees.flatMap(e => (e.services || []).map(s => ({ ...s, parentType: 'employee', parentName: e.name, parentId: e.id })))
    ].filter(s => getCalculatedStatus(s.expiry_date) === 'warning');

    const allExpiredServices = [
        ...inst.platforms.flatMap(p => p.services.map(s => ({ ...s, parentType: 'platform', parentName: p.platform_name, parentId: p.id }))),
        ...inst.employees.flatMap(e => (e.services || []).map(s => ({ ...s, parentType: 'employee', parentName: e.name, parentId: e.id })))
    ].filter(s => getCalculatedStatus(s.expiry_date) === 'expired');

    const stats = [
        { id: 'platforms', label: 'إجمالي المنصات', value: inst.platforms.length, icon: '🏢', color: '#eef2ff', text: '#4338ca' },
        { id: 'employees', label: 'إجمالي الموظفين', value: inst.employees.length, icon: '👥', color: '#f0fdf4', text: '#166534' },
        { id: 'warning', label: 'تنبيهات الخدمات', value: allWarningServices.length, icon: '⏳', color: '#fffbeb', text: '#92400e' },
        { id: 'expired', label: 'خدمات منتهية', value: allExpiredServices.length, icon: '🚫', color: '#fef2f2', text: '#991b1b' },
        { id: 'appointments', label: 'المواعيد القادمة', value: inst.appointments.filter(a => a.status === 'approved').length, icon: '📅', color: '#f0f9ff', text: '#0369a1' },
    ];

    const handleStatClick = (statId: string) => {
        if (statId === 'platforms' || statId === 'employees') {
            setActiveTab(statId);
            setActiveAlertCategory('none');
        } else if (statId === 'warning') {
            setActiveAlertCategory('warning');
        } else if (statId === 'expired') {
            setActiveAlertCategory('expired');
        }
    };

    const scrollToEntity = (type: 'platform' | 'employee', id: number) => {
        const tab = type === 'platform' ? 'platforms' : 'employees';
        setActiveTab(tab);
        setActiveAlertCategory('none');

        // Wait for tab switch and render
        setTimeout(() => {
            const elementId = `${type}-${id}`;
            const element = document.getElementById(elementId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightId(elementId);
                setTimeout(() => setHighlightId(null), 3000); // Remove highlight after 3 seconds
            }
        }, 100);
    };
    // Platform Actions
    const handleOpenAddPlatform = () => {
        setEditPlatTarget(null);
        setPlatForm({ platform_name: "", category: "", start_date: "", expiry_date: "", due_date: "", reference_number: "", file: null });
        setShowPlatModal(true);
    };

    const handleOpenEditPlatform = (p: Platform) => {
        setEditPlatTarget(p);
        setPlatForm({
            platform_name: p.platform_name || "",
            category: p.category || "",
            start_date: p.start_date || "",
            expiry_date: p.expiry_date || "",
            due_date: p.due_date || "",
            reference_number: p.reference_number || "",
            file: null
        });
        setShowPlatModal(true);
    };

    const handleSavePlatform = async () => {
        if (!platForm.platform_name) { showToast("يرجى إدخال اسم المنصة", "error"); return; }
        setSavingPlat(true);
        const formData = new FormData();
        Object.entries(platForm).forEach(([k, v]) => {
            if (v !== null) {
                // Backend expects 'document' for the file field
                const key = k === 'file' ? 'document' : k;
                formData.append(key, v);
            }
        });

        try {
            if (editPlatTarget) await api.put(`/institutions/platforms/${editPlatTarget.id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
            else await api.post(`/institutions/${id}/platforms`, formData, { headers: { "Content-Type": "multipart/form-data" } });
            setShowPlatModal(false); loadData(); showToast("تم الحفظ بنجاح");
        } catch (err) {
            console.error("Save Error:", err);
            showToast("حدث خطأ أثناء الحفظ", "error");
        } finally { setSavingPlat(false); }
    };

    const confirmDeletePlatform = async () => {
        if (!platToDelete) return;
        try { await api.delete(`/institutions/platforms/${platToDelete.id}`); setPlatToDelete(null); loadData(); showToast("تم الحذف بنجاح"); }
        catch (err) { showToast("حدث خطأ أثناء الحذف", "error"); }
    };

    const handleOpenAddEmployee = () => {
        setEditEmpTarget(null);
        setEmpForm({ name: "", position: "", mobile: "", email: "", nationality: "", salary: "" });
        setShowEmpModal(true);
    };

    const handleOpenEditEmployee = (e: Employee) => {
        setEditEmpTarget(e);
        setEmpForm({
            name: e.name || "",
            position: e.position || "",
            mobile: e.mobile || "",
            email: e.email || "",
            nationality: e.nationality || "",
            salary: e.salary?.toString() || ""
        });
        setShowEmpModal(true);
    };

    const handleSaveEmployee = async () => {
        if (!empForm.name) { showToast("يرجى إدخال اسم الموظف", "error"); return; }
        setSavingEmp(true);
        try {
            if (editEmpTarget) await api.put(`/employees/${editEmpTarget.id}`, empForm);
            else await api.post(`/institutions/${id}/employees`, empForm);
            setShowEmpModal(false); loadData(); showToast("تم الحفظ بنجاح");
        } catch (err) { showToast("حدث خطأ أثناء الحفظ", "error"); } finally { setSavingEmp(false); }
    };

    const confirmDeleteEmployee = async () => {
        if (!empToDelete) return;
        try { await api.delete(`/employees/${empToDelete.id}`); setEmpToDelete(null); loadData(); showToast("تم الحذف بنجاح"); }
        catch (err) { showToast("حدث خطأ أثناء الحذف", "error"); }
    };

    // Employee Service Actions
    const handleOpenAddEmpService = (eId: number) => {
        setEditEmpServTarget(null); setActiveEmpForServ(eId);
        setEmpServForm({ service_name: "", start_date: "", expiry_date: "", file: null });
        setShowEmpServModal(true);
    };

    const handleOpenEditEmpService = (s: EmployeeService) => {
        setEditEmpServTarget(s); setActiveEmpForServ(s.employee_id);
        setEmpServForm({
            service_name: s.service_name || "",
            start_date: s.start_date || "",
            expiry_date: s.expiry_date || "",
            file: null
        });
        setShowEmpServModal(true);
    };

    const handleSaveEmpService = async () => {
        if (!empServForm.service_name) { showToast("يرجى إدخال اسم الخدمة", "error"); return; }
        setSavingEmpServ(true);
        const formData = new FormData();
        Object.entries(empServForm).forEach(([k, v]) => {
            if (v !== null) {
                const key = k === 'file' ? 'document' : k;
                formData.append(key, v);
            }
        });

        try {
            if (editEmpServTarget) await api.put(`/employees/services/${editEmpServTarget.id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
            else await api.post(`/employees/${activeEmpForServ}/services`, formData, { headers: { "Content-Type": "multipart/form-data" } });
            setShowEmpServModal(false); loadData(); showToast("تم الحفظ بنجاح");
        } catch (err) {
            console.error("Emp Service Save Error:", err);
            showToast("حدث خطأ أثناء الحفظ", "error");
        } finally { setSavingEmpServ(false); }
    };

    const confirmDeleteEmpService = async () => {
        if (!empServToDelete) return;
        try { await api.delete(`/employees/services/${empServToDelete.id}`); setEmpServToDelete(null); loadData(); showToast("تم الحذف بنجاح"); }
        catch (err) { showToast("حدث خطأ أثناء الحذف", "error"); }
    };

    // Service Actions
    const handleOpenAddService = (pId: number) => {
        setEditServTarget(null); setActivePlatForServ(pId);
        setServForm({ service_name: "", start_date: "", expiry_date: "", file: null });
        setShowServModal(true);
    };

    const handleOpenEditService = (s: Service) => {
        setEditServTarget(s); setActivePlatForServ(s.platform_id);
        setServForm({
            service_name: s.service_name || "",
            start_date: s.start_date || "",
            expiry_date: s.expiry_date || "",
            file: null
        });
        setShowServModal(true);
    };

    const handleSaveService = async () => {
        if (!servForm.service_name) { showToast("يرجى إدخال اسم الخدمة", "error"); return; }
        setSavingServ(true);
        const formData = new FormData();
        Object.entries(servForm).forEach(([k, v]) => {
            if (v !== null) {
                // Backend expects 'document' for the file field
                const key = k === 'file' ? 'document' : k;
                formData.append(key, v);
            }
        });

        try {
            if (editServTarget) await api.put(`/platforms/services/${editServTarget.id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
            else await api.post(`/platforms/${activePlatForServ}/services`, formData, { headers: { "Content-Type": "multipart/form-data" } });
            setShowServModal(false); loadData(); showToast("تم الحفظ بنجاح");
        } catch (err) {
            console.error("Service Save Error:", err);
            showToast("حدث خطأ أثناء الحفظ", "error");
        } finally { setSavingServ(false); }
    };

    const confirmDeleteService = async () => {
        if (!servToDelete) return;
        try { await api.delete(`/platforms/services/${servToDelete.id}`); setServToDelete(null); loadData(); showToast("تم الحذف بنجاح"); }
        catch (err) { showToast("حدث خطأ أثناء الحذف", "error"); }
    };

    // Violation Actions
    const handleOpenAddViolation = () => {
        setEditVioTarget(null);
        setVioForm({
            violation_number: "", authority: "", violation_article: "",
            amount: "", violation_date: "", objection_start_date: "",
            objection_end_date: "", notes: "", file: null
        });
        setShowVioModal(true);
    };

    const handleOpenEditViolation = (v: Violation) => {
        setEditVioTarget(v);
        setVioForm({
            violation_number: v.violation_number || "",
            authority: v.authority || "",
            violation_article: v.violation_article || "",
            amount: v.amount?.toString() || "",
            violation_date: v.violation_date || "",
            objection_start_date: v.objection_start_date || "",
            objection_end_date: v.objection_end_date || "",
            notes: v.notes || "",
            file: null
        });
        setShowVioModal(true);
    };

    const handleSaveViolation = async () => {
        if (!vioForm.violation_number) { showToast("يرجى إدخال رقم المخالفة", "error"); return; }
        setSavingVio(true);
        const formData = new FormData();
        Object.entries(vioForm).forEach(([k, v]) => {
            if (v !== null) {
                const key = k === 'file' ? 'document' : k;
                formData.append(key, v);
            }
        });

        try {
            if (editVioTarget) await api.put(`/violations/${editVioTarget.id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
            else await api.post(`/institutions/${id}/violations`, formData, { headers: { "Content-Type": "multipart/form-data" } });
            setShowVioModal(false); loadData(); showToast("تم الحفظ بنجاح");
        } catch (err: any) {
            console.error("Violation Save Error:", err);
            const msg = err.response?.data?.message || "حدث خطأ أثناء الحفظ";
            showToast(msg, "error");
        } finally { setSavingVio(false); }
    };

    const confirmDeleteViolation = async () => {
        if (!vioToDelete) return;
        try { await api.delete(`/violations/${vioToDelete.id}`); setVioToDelete(null); loadData(); showToast("تم الحذف بنجاح"); }
        catch (err) { showToast("حدث خطأ أثناء الحذف", "error"); }
    };

    // Invoice Actions
    const handleOpenAddInvoice = () => {
        setEditInvTarget(null);
        setInvForm({
            invoice_number: "", invoice_date: "", due_date: "",
            amount: "", fines: "0", status: "unpaid"
        });
        setShowInvModal(true);
    };

    const handleOpenEditInvoice = (inv: Invoice) => {
        setEditInvTarget(inv);
        setInvForm({
            invoice_number: inv.invoice_number,
            invoice_date: inv.invoice_date,
            due_date: inv.due_date,
            amount: inv.amount.toString(),
            fines: inv.fines?.toString() || "0",
            status: inv.status
        });
        setShowInvModal(true);
    };

    const handleSaveInvoice = async () => {
        if (!invForm.invoice_number || !invForm.amount) { showToast("يرجى إدخال البيانات المطلوبة", "error"); return; }
        setSavingInv(true);
        try {
            if (editInvTarget) await api.put(`/invoices/${editInvTarget.id}`, invForm);
            else await api.post(`/institutions/${id}/invoices`, invForm);
            setShowInvModal(false); loadData(); showToast("تم الحفظ بنجاح");
        } catch (err) { showToast("حدث خطأ أثناء الحفظ", "error"); } finally { setSavingInv(false); }
    };

    const confirmDeleteInvoice = async () => {
        if (!invToDelete) return;
        try { await api.delete(`/invoices/${invToDelete.id}`); setInvToDelete(null); loadData(); showToast("تم الحذف بنجاح"); }
        catch (err) { showToast("حدث خطأ أثناء الحذف", "error"); }
    };

    const viewDocument = (path: string) => window.open(`${window.location.origin}${path}`, "_blank");

    const downloadDocument = (path: string, fileName: string) => {
        const link = document.createElement('a');
        link.href = `${window.location.origin}${path}`;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30, direction: 'rtl' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 15 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.5em', fontWeight: 700 }}>{inst.name}</h1>
                    <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9em' }}>إدارة المنصات والخدمات والاشتراكات</p>
                </div>
                <Link to="/institutions" className="secondary mobile-full-width" style={{ padding: '10px 20px', borderRadius: 10 }}>العودة للمؤسسات</Link>
            </div>

            {/* Upcoming Appointment Banner */}
            {inst.appointments.filter(a => a.status === 'approved' && (new Date(a.date).toDateString() === new Date().toDateString())).length > 0 && (
                <div style={{ background: '#0369a1', color: '#fff', padding: '15px 25px', borderRadius: 15, display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '2em' }}>🔔</div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0 }}>تنبيه: يوجد موعد خارجي اليوم!</h4>
                        <p style={{ margin: '5px 0 0', fontSize: '0.9em', opacity: 0.9 }}>
                            {inst.appointments.filter(a => a.status === 'approved' && (new Date(a.date).toDateString() === new Date().toDateString())).map(a => `${a.title} في تمام الساعة ${a.time}`).join(' | ')}
                        </p>
                    </div>
                    <button onClick={() => setActiveTab('appointments')} style={{ background: '#fff', color: '#0369a1', padding: '8px 16px', fontSize: '0.85em' }}>عرض التفاصيل</button>
                </div>
            )}

            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                {stats.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => handleStatClick(s.id)}
                        className="card"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 15,
                            padding: 20,
                            cursor: 'pointer',
                            textAlign: 'right',
                            background: activeAlertCategory === s.id ? '#fff' : '#fff',
                            border: activeAlertCategory === s.id ? `2px solid ${s.text}` : '1px solid var(--border)',
                            boxShadow: activeAlertCategory === s.id ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        <div style={{ width: 50, height: 50, borderRadius: 12, background: s.color, color: s.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4em' }}>{s.icon}</div>
                        <div><p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>{s.label}</p><h2 style={{ margin: 0, color: s.text }}>{s.value}</h2></div>
                    </button>
                ))}
            </div>

            {/* Detailed Alert Panel */}
            {activeAlertCategory !== 'none' && (
                <div className="card" style={{ padding: 25, background: activeAlertCategory === 'expired' ? '#fff1f2' : '#fffbeb', border: `1px solid ${activeAlertCategory === 'expired' ? '#fecaca' : '#fef3c7'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span>{activeAlertCategory === 'expired' ? '🚫' : '⏳'}</span>
                            تفاصيل {activeAlertCategory === 'expired' ? 'الخدمات المنتهية' : 'تنبيهات الخدمات'}
                        </h3>
                        <button onClick={() => setActiveAlertCategory('none')} style={{ background: 'none', color: '#666', border: 'none', fontSize: '1.2em' }}>✕</button>
                    </div>
                    <div style={{ display: 'grid', gap: 12 }}>
                        {(activeAlertCategory === 'expired' ? allExpiredServices : allWarningServices).map((s, idx) => (
                            <div
                                key={idx}
                                onClick={() => scrollToEntity(s.parentType as 'platform' | 'employee', s.parentId)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '15px 20px',
                                    background: '#fff',
                                    borderRadius: 12,
                                    border: '1px solid #e2e8f0',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(-5px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                    <div style={{ fontSize: '1.2em' }}>{s.parentType === 'platform' ? '🏢' : '👤'}</div>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{s.parentName}</div>
                                        <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>{s.service_name}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>تاريخ الانتهاء</div>
                                    <div style={{ color: activeAlertCategory === 'expired' ? 'var(--danger)' : '#92400e', fontWeight: 600 }}>{s.expiry_date}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="card" style={{ padding: 0 }}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ background: 'none', color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-main)', borderBottom: activeTab === tab.id ? '3px solid var(--accent)' : '3px solid transparent', borderRadius: 0, padding: '15px 20px', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: 8, fontWeight: activeTab === tab.id ? 700 : 500, whiteSpace: 'nowrap' }}>
                            <span>{tab.icon}</span>{tab.name}
                        </button>
                    ))}
                </div>

                <div style={{ padding: 25 }}>
                    {activeTab === 'platforms' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 25, alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
                                <h3 style={{ margin: 0 }}>المنصات والخدمات المفعلة</h3>
                                {user?.role !== 'viewer' && (
                                    <button onClick={handleOpenAddPlatform} className="mobile-full-width" style={{ background: '#065f46', fontSize: '0.85em', padding: '10px 20px' }}>+ إضافة منصة جديدة</button>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                {inst.platforms.length > 0 ? inst.platforms.map(p => (
                                    <div key={p.id} id={`platform-${p.id}`} className="card" style={{ padding: 0, overflow: 'hidden', border: highlightId === `platform-${p.id}` ? '2px solid var(--accent)' : '1px solid var(--border)', transition: 'border 0.3s' }}>
                                        {/* Platform Header */}
                                        <div style={{ padding: '15px 25px', background: '#f8fafc', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                                <div style={{ width: 45, height: 45, background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3em', border: '1px solid #e2e8f0' }}>🏢</div>
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: '1.1em' }}>{p.platform_name}</div>
                                                    <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                                        <span>{p.category || 'بدون تصنيف'}</span>
                                                        {p.expiry_date && <span style={{ color: getCalculatedStatus(p.expiry_date) === 'expired' ? 'var(--danger)' : '#666' }}>📅 تنتهي: {p.expiry_date}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                                {p.document_path && (
                                                    <div style={{ display: 'flex', gap: 5 }}>
                                                        <button onClick={() => viewDocument(p.document_path!)} className="secondary" style={{ fontSize: '0.75em', padding: '8px 12px' }}>عرض</button>
                                                        <button onClick={() => downloadDocument(p.document_path!, p.platform_name)} className="secondary" style={{ fontSize: '0.75em', padding: '8px 12px' }}>تحميل</button>
                                                    </div>
                                                )}
                                                {user?.role !== 'viewer' && (
                                                    <div style={{ display: 'flex', gap: 5 }}>
                                                        <button onClick={() => handleOpenAddService(p.id)} style={{ background: '#0369a1', fontSize: '0.8em', padding: '8px 12px' }}>+ خدمة</button>
                                                        <button onClick={() => handleOpenEditPlatform(p)} className="secondary" style={{ padding: 8, width: 35, height: 35 }}>✏️</button>
                                                        <button onClick={() => setPlatToDelete(p)} className="secondary" style={{ padding: 8, width: 35, height: 35, color: 'var(--danger)' }}>🗑️</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Services List */}
                                        <div style={{ padding: 20 }}>
                                            {p.services && p.services.length > 0 ? (
                                                <div className="table-container">
                                                    <table>
                                                        <thead>
                                                            <tr>
                                                                <th>الخدمة</th>
                                                                <th>تاريخ الانتهاء</th>
                                                                <th>الحالة</th>
                                                                {user?.role !== 'viewer' && <th>إجراءات</th>}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {p.services.map(s => (
                                                                <tr key={s.id}>
                                                                    <td>{s.service_name}</td>
                                                                    <td>{s.expiry_date || '-'}</td>
                                                                    <td>
                                                                        <span style={{
                                                                            padding: '4px 10px',
                                                                            borderRadius: 20,
                                                                            fontSize: '0.75em',
                                                                            background: getCalculatedStatus(s.expiry_date) === 'expired' ? '#fee2e2' : '#fef3c7',
                                                                            color: getCalculatedStatus(s.expiry_date) === 'expired' ? '#991b1b' : '#92400e'
                                                                        }}>
                                                                            {getCalculatedStatus(s.expiry_date) === 'expired' ? 'منتهي' : 'قريب'}
                                                                        </span>
                                                                    </td>
                                                                    {user?.role !== 'viewer' && (
                                                                        <td>
                                                                            <div style={{ display: 'flex', gap: 5 }}>
                                                                                <button onClick={() => handleOpenEditService(s)} className="secondary" style={{ padding: 6, width: 30, height: 30, fontSize: '0.8em' }}>✏️</button>
                                                                                <button onClick={() => setServToDelete(s)} className="secondary" style={{ padding: 6, width: 30, height: 30, color: 'var(--danger)', fontSize: '0.8em' }}>🗑️</button>
                                                                            </div>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85em', background: '#fafafa', borderRadius: 10, border: '1px dashed #e2e8f0' }}>لا يوجد خدمات مضافة لهذه المنصة</div>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <div style={{ textAlign: 'center', padding: 50, border: '2px dashed #e2e8f0', borderRadius: 15, color: 'var(--text-muted)' }}>لا يوجد منصات مضافة</div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'employees' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 25, alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
                                <h3 style={{ margin: 0 }}>قائمة الموظفين</h3>
                                {user?.role !== 'viewer' && (
                                    <button onClick={handleOpenAddEmployee} className="mobile-full-width" style={{ background: '#4338ca', fontSize: '0.85em', padding: '10px 20px' }}>+ إضافة موظف</button>
                                )}
                            </div>

                            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                                {inst.employees.length > 0 ? inst.employees.map(e => (
                                    <div key={e.id} id={`employee-${e.id}`} className="card" style={{ padding: 0, overflow: 'hidden', border: highlightId === `employee-${e.id}` ? '2px solid var(--accent)' : '1px solid var(--border)', transition: 'border 0.3s' }}>
                                        {/* Employee Header */}
                                        <div style={{ padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                                <div style={{ width: 45, height: 45, background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3em', border: '1px solid #e2e8f0' }}>👤</div>
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: '1.1em' }}>{e.name}</div>
                                                    <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', display: 'flex', gap: 15 }}>
                                                        <span>{e.position || 'بدون مسمى'}</span>
                                                        <span>{e.nationality || 'غير محدد'}</span>
                                                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{e.salary ? `${e.salary} ريال` : 'راتب غير محدد'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                                {user?.role !== 'viewer' && (
                                                    <>
                                                        <button onClick={() => handleOpenAddEmpService(e.id)} style={{ background: '#0891b2', fontSize: '0.8em', padding: '8px 15px' }}>+ إضافة خدمة/مستند</button>
                                                        <button onClick={() => handleOpenEditEmployee(e)} className="secondary" style={{ padding: 8, width: 35, height: 35 }}>✏️</button>
                                                        <button onClick={() => setEmpToDelete(e)} className="secondary" style={{ padding: 8, width: 35, height: 35, color: 'var(--danger)' }}>🗑️</button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Employee Services List */}
                                        <div style={{ padding: 20 }}>
                                            {e.services && e.services.length > 0 ? (
                                                <div style={{ display: 'grid', gap: 10 }}>
                                                    {e.services.map(s => {
                                                        const status = s.expiry_date ? getCalculatedStatus(s.expiry_date) : 'active';
                                                        return (
                                                            <div key={s.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', background: '#fff', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                                                                <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                    <div style={{ color: 'var(--primary)', fontSize: '1.1em' }}>📄</div>
                                                                    <div>
                                                                        <div style={{ fontWeight: 700, fontSize: '0.95em' }}>{s.service_name}</div>
                                                                        <div style={{ fontSize: '0.75em', color: 'var(--text-muted)', display: 'flex', gap: 10 }}>
                                                                            <span>إلى: {s.expiry_date || '-'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div style={{ flex: 1, textAlign: 'center' }}>
                                                                    {status === 'expired' && <span style={{ color: 'var(--danger)', background: '#fef2f2', padding: '3px 10px', borderRadius: 20, fontSize: '0.75em' }}>🚫 منتهية</span>}
                                                                    {status === 'warning' && <span style={{ color: '#92400e', background: '#fffbeb', padding: '3px 10px', borderRadius: 20, fontSize: '0.75em' }}>⏳ تنتهي قريباً</span>}
                                                                </div>
                                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                                    {s.document_path && (
                                                                        <>
                                                                            <button onClick={() => viewDocument(s.document_path!)} className="secondary" style={{ fontSize: '0.75em', padding: '6px 12px' }}>عرض</button>
                                                                            <button onClick={() => downloadDocument(s.document_path!, s.service_name)} className="secondary" style={{ fontSize: '0.75em', padding: '6px 12px' }}>تحميل</button>
                                                                        </>
                                                                    )}
                                                                    {user?.role !== 'viewer' && (
                                                                        <>
                                                                            <button onClick={() => handleOpenEditEmpService(s)} className="secondary" style={{ padding: 6, fontSize: '0.9em' }}>✏️</button>
                                                                            <button onClick={() => setEmpServToDelete(s)} className="secondary" style={{ padding: 6, color: 'var(--danger)', fontSize: '0.9em' }}>🗑️</button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85em', background: '#fafafa', borderRadius: 10, border: '1px dashed #e2e8f0' }}>لا يوجد خدمات أو مستندات مضافة لهذا الموظف</div>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <div style={{ textAlign: 'center', padding: 50, border: '2px dashed #e2e8f0', borderRadius: 15, color: 'var(--text-muted)' }}>لا يوجد موظفين مضافين</div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'violations' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 25, alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
                                <h3 style={{ margin: 0 }}>المخالفات المرصودة</h3>
                                {user?.role !== 'viewer' && (
                                    <button onClick={handleOpenAddViolation} className="mobile-full-width" style={{ background: 'var(--danger)', fontSize: '0.85em', padding: '10px 20px' }}>+ تسجيل مخالفة</button>
                                )}
                            </div>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>وصف المخالفة</th>
                                            <th>التاريخ</th>
                                            <th>المبلغ</th>
                                            {user?.role !== 'viewer' && <th>إجراءات</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inst.violations.length > 0 ? inst.violations.map(v => (
                                            <tr key={v.id}>
                                                <td>{v.authority || v.violation_article || '-'}</td>
                                                <td>{v.violation_date}</td>
                                                <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{v.amount} ريال</td>
                                                {user?.role !== 'viewer' && (
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                                            <button onClick={() => handleOpenEditViolation(v)} className="secondary" style={{ padding: 6, width: 30, height: 30, fontSize: '0.8em' }}>✏️</button>
                                                            <button onClick={() => setVioToDelete(v)} className="secondary" style={{ padding: 6, width: 30, height: 30, color: 'var(--danger)', fontSize: '0.8em' }}>🗑️</button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={user?.role !== 'viewer' ? 4 : 3} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>لا يوجد مخالفات مسجلة</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'invoices' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 25, alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
                                <h3 style={{ margin: 0 }}>سجل الفواتير</h3>
                                {user?.role !== 'viewer' && (
                                    <button onClick={handleOpenAddInvoice} className="mobile-full-width" style={{ background: '#0e7490', fontSize: '0.85em', padding: '10px 20px' }}>+ إضافة فاتورة جديدة</button>
                                )}
                            </div>

                            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                                {inst.invoices && inst.invoices.length > 0 ? inst.invoices.map(inv => (
                                    <div key={inv.id} className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                        <div style={{ padding: 20, background: inv.status === 'paid' ? '#f0fdf4' : (inv.status === 'overdue' ? '#fef2f2' : '#fffbeb'), borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 40, height: 40, background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2em', border: '1px solid var(--border)' }}>🧾</div>
                                                <div>
                                                    <div style={{ fontWeight: 800 }}>{inv.invoice_number}</div>
                                                    <div style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>{inv.status === 'paid' ? 'مدفوعة' : (inv.status === 'overdue' ? 'متأخرة' : 'غير مدفوعة')}</div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'left' }}>
                                                <div style={{ fontSize: '1.2em', fontWeight: 900, color: inv.status === 'paid' ? '#15803d' : (inv.status === 'overdue' ? '#b91c1c' : '#b45309') }}>{(inv.amount + (inv.fines || 0)).toLocaleString()} ريال</div>
                                            </div>
                                        </div>

                                        <div style={{ padding: 20 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
                                                <div style={{ fontSize: '0.9em' }}>
                                                    <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8em' }}>تاريخ الإصدار</label>
                                                    <strong>{inv.invoice_date}</strong>
                                                </div>
                                                <div style={{ fontSize: '0.9em' }}>
                                                    <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8em' }}>تاريخ الاستحقاق</label>
                                                    <strong>{inv.due_date}</strong>
                                                </div>
                                                <div style={{ fontSize: '0.9em' }}>
                                                    <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8em' }}>مبلغ الفاتورة</label>
                                                    <strong>{inv.amount.toLocaleString()}</strong>
                                                </div>
                                                <div style={{ fontSize: '0.9em' }}>
                                                    <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8em' }}>الغرامات</label>
                                                    <strong style={{ color: inv.fines > 0 ? '#b91c1c' : 'inherit' }}>{inv.fines?.toLocaleString() || 0}</strong>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: 10, borderTop: '1px solid #f1f5f9', paddingTop: 15 }}>
                                                {user?.role !== 'viewer' && (
                                                    <>
                                                        <button onClick={() => handleOpenEditInvoice(inv)} className="secondary" style={{ flex: 1, padding: '8px 12px' }}>✏️ تعديل</button>
                                                        <button onClick={() => setInvToDelete(inv)} className="secondary" style={{ flex: 1, padding: '8px 12px', color: 'var(--danger)' }}>🗑️ حذف</button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 50, border: '2px dashed #e2e8f0', borderRadius: 15, color: 'var(--text-muted)' }}>لا يوجد فواتير مسجلة</div>
                                )}
                            </div>
                        </div>
                    )}

                    {
                        activeTab === 'appointments' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 25, alignItems: 'center' }}>
                                    <h3 style={{ margin: 0 }}>المواعيد الخارجية للمؤسسة</h3>
                                    <Link to="/external-appointments" style={{ fontSize: '0.85em', color: 'var(--primary)', fontWeight: 600 }}>إدارة المواعيد الخارجية →</Link>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                                    {inst.appointments && inst.appointments.length > 0 ? inst.appointments.map(appt => (
                                        <div key={appt.id} className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderTop: `4px solid ${appt.status === 'approved' ? 'var(--success)' : (appt.status === 'rejected' ? 'var(--danger)' : '#fbbf24')}` }}>
                                            <div style={{ padding: 20 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' }}>
                                                    <div style={{ fontWeight: 800, fontSize: '1.1em' }}>{appt.title}</div>
                                                    <span style={{
                                                        background: appt.status === 'approved' ? '#dcfce7' : (appt.status === 'rejected' ? '#fee2e2' : '#fef3c7'),
                                                        color: appt.status === 'approved' ? '#166534' : (appt.status === 'rejected' ? '#991b1b' : '#92400e'),
                                                        padding: '4px 10px', borderRadius: 20, fontSize: '0.75em', fontWeight: 700
                                                    }}>
                                                        {appt.status === 'approved' ? '✅ مؤكد' : (appt.status === 'rejected' ? '❌ مرفوض' : '⏳ قيد الانتظار')}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: 20, marginBottom: 15 }}>
                                                    <div>
                                                        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75em' }}>التاريخ</label>
                                                        <div style={{ fontWeight: 600 }}>{appt.date}</div>
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75em' }}>الوقت</label>
                                                        <div style={{ fontWeight: 600 }}>{appt.time}</div>
                                                    </div>
                                                </div>
                                                {appt.description && (
                                                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, fontSize: '0.85em', color: '#475569' }}>
                                                        {appt.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )) : (
                                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 50, border: '2px dashed #e2e8f0', borderRadius: 15, color: 'var(--text-muted)' }}>لا يوجد مواعيد مسجلة</div>
                                    )}
                                </div>
                            </div>
                        )
                    }

                </div >
            </div >

            {/* Modals: Platform & Service & Deletes */}
            {
                showPlatModal && (
                    <div className="modal-overlay"><div className="modal-content" style={{ maxWidth: 600 }}>
                        <h2 style={{ marginBottom: 25, textAlign: 'right' }}>{editPlatTarget ? "تعديل المنصة" : "إضافة منصة جديدة"}</h2>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                            <div style={{ gridColumn: "span 2", border: "2px dashed #e2e8f0", borderRadius: 12, padding: 25, textAlign: "center", cursor: "pointer", background: platForm.file ? "#f0fdf4" : "#f8fafc" }} onClick={() => platFileInputRef.current?.click()}>
                                <input type="file" ref={platFileInputRef} hidden onChange={e => setPlatForm({ ...platForm, file: e.target.files?.[0] || null })} accept=".jpg,.jpeg,.png,.pdf" />
                                <div style={{ fontSize: "1.5em", marginBottom: 5 }}>{platForm.file ? "📄" : "📁"}</div>
                                <div style={{ fontWeight: 600 }}>{platForm.file ? platForm.file.name : "إرفاق مستند المنصة (PDF/صور)"}</div>
                            </div>

                            <div style={{ gridColumn: "span 2" }}><label>اسم المنصة</label><input value={platForm.platform_name} onChange={e => setPlatForm({ ...platForm, platform_name: e.target.value })} placeholder="مثلاً: قوى، مدد..." /></div>

                            <div>
                                <label>التصنيف</label>
                                <select value={platForm.category} onChange={e => setPlatForm({ ...platForm, category: e.target.value })}>
                                    <option value="">اختر التصنيف...</option>
                                    {settings.filter(s => s.type === 'category').map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div><label>رقم المرجع</label><input value={platForm.reference_number} onChange={e => setPlatForm({ ...platForm, reference_number: e.target.value })} /></div>

                            <div><label>تاريخ البداية</label><input type="date" value={platForm.start_date} onChange={e => setPlatForm({ ...platForm, start_date: e.target.value })} /></div>
                            <div><label>تاريخ النهاية</label><input type="date" value={platForm.expiry_date} onChange={e => setPlatForm({ ...platForm, expiry_date: e.target.value })} /></div>

                            <div style={{ gridColumn: "span 2" }}><label>تاريخ الاستحقاق</label><input type="date" value={platForm.due_date} onChange={e => setPlatForm({ ...platForm, due_date: e.target.value })} /></div>
                        </div>
                        <div style={{ display: 'flex', gap: 15, marginTop: 30 }}><button onClick={handleSavePlatform} disabled={savingPlat} style={{ flex: 1 }}>{savingPlat ? "جاري..." : "حفظ"}</button><button onClick={() => setShowPlatModal(false)} className="secondary" style={{ flex: 1 }}>إلغاء</button></div>
                    </div></div>
                )
            }

            {
                showServModal && (
                    <div className="modal-overlay"><div className="modal-content">
                        <h2 style={{ marginBottom: 25, textAlign: 'right' }}>{editServTarget ? "تعديل الخدمة" : "إضافة خدمة جديدة"}</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                            <div style={{ gridColumn: "span 2", border: "2px dashed #e2e8f0", borderRadius: 12, padding: 20, textAlign: "center", cursor: "pointer" }} onClick={() => servFileInputRef.current?.click()}>
                                <input type="file" ref={servFileInputRef} hidden onChange={e => setServForm({ ...servForm, file: e.target.files?.[0] || null })} accept=".jpg,.jpeg,.png,.pdf" />
                                <div>{servForm.file ? "📄 " + servForm.file.name : "إرفاق مستند (صور/PDF)"}</div>
                            </div>
                            <div style={{ gridColumn: "span 2" }}><label>اسم الخدمة</label><input value={servForm.service_name} onChange={e => setServForm({ ...servForm, service_name: e.target.value })} /></div>
                            <div><label>تاريخ البداية</label><input type="date" value={servForm.start_date} onChange={e => setServForm({ ...servForm, start_date: e.target.value })} /></div>
                            <div><label>تاريخ النهاية</label><input type="date" value={servForm.expiry_date} onChange={e => setServForm({ ...servForm, expiry_date: e.target.value })} /></div>
                        </div>
                        <div style={{ display: 'flex', gap: 15, marginTop: 30 }}><button onClick={handleSaveService} disabled={savingServ} style={{ flex: 1 }}>{savingServ ? "جاري..." : "حفظ الخدمة"}</button><button onClick={() => setShowServModal(false)} className="secondary" style={{ flex: 1 }}>إلغاء</button></div>
                    </div></div>
                )
            }

            {
                platToDelete && (
                    <div className="modal-overlay"><div className="modal-content" style={{ textAlign: 'center' }}><h2>تأكيد حذف المنصة؟</h2><p>سيؤدي هذا لحذف كافة الخدمات المرتبطة بها.</p><div style={{ display: 'flex', gap: 15 }}><button onClick={confirmDeletePlatform} style={{ flex: 1, background: 'var(--danger)' }}>حذف</button><button onClick={() => setPlatToDelete(null)} className="secondary" style={{ flex: 1 }}>إلغاء</button></div></div></div>
                )
            }

            {
                servToDelete && (
                    <div className="modal-overlay"><div className="modal-content" style={{ textAlign: 'center' }}><h2>تأكيد حذف الخدمة؟</h2><div style={{ display: 'flex', gap: 15, marginTop: 20 }}><button onClick={confirmDeleteService} style={{ flex: 1, background: 'var(--danger)' }}>حذف</button><button onClick={() => setServToDelete(null)} className="secondary" style={{ flex: 1 }}>إلغاء</button></div></div></div>
                )
            }

            {
                showEmpModal && (
                    <div className="modal-overlay"><div className="modal-content" style={{ maxWidth: 600 }}>
                        <h2 style={{ marginBottom: 25, textAlign: 'right' }}>{editEmpTarget ? "تعديل بيانات موظف" : "إضافة موظف جديد"}</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                            <div style={{ gridColumn: "span 2" }}><label>الاسم الكامل</label><input value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} /></div>
                            <div><label>المسمى الوظيفي</label><input value={empForm.position} onChange={e => setEmpForm({ ...empForm, position: e.target.value })} /></div>
                            <div><label>رقم الجوال</label><input value={empForm.mobile} onChange={e => setEmpForm({ ...empForm, mobile: e.target.value })} /></div>
                            <div>
                                <label>الجنسية</label>
                                <select value={empForm.nationality} onChange={e => setEmpForm({ ...empForm, nationality: e.target.value })}>
                                    <option value="">اختر الجنسية...</option>
                                    {settings.filter(s => s.type === 'nationality').map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div><label>الراتب</label><input type="number" value={empForm.salary} onChange={e => setEmpForm({ ...empForm, salary: e.target.value })} /></div>
                            <div style={{ gridColumn: "span 2" }}><label>البريد الإلكتروني</label><input value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} /></div>
                        </div>
                        <div style={{ display: 'flex', gap: 15, marginTop: 30 }}><button onClick={handleSaveEmployee} disabled={savingEmp} style={{ flex: 1 }}>{savingEmp ? "جاري..." : "حفظ الموظف"}</button><button onClick={() => setShowEmpModal(false)} className="secondary" style={{ flex: 1 }}>إلغاء</button></div>
                    </div></div>
                )
            }

            {
                showEmpServModal && (
                    <div className="modal-overlay"><div className="modal-content">
                        <h2 style={{ marginBottom: 25, textAlign: 'right' }}>{editEmpServTarget ? "تعديل خدمة/مستند" : "إضافة خدمة/مستند للموظف"}</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                            <div style={{ gridColumn: "span 2", border: "2px dashed #e2e8f0", borderRadius: 12, padding: 20, textAlign: "center", cursor: "pointer" }} onClick={() => empServFileInputRef.current?.click()}>
                                <input type="file" ref={empServFileInputRef} hidden onChange={e => setEmpServForm({ ...empServForm, file: e.target.files?.[0] || null })} accept=".jpg,.jpeg,.png,.pdf" />
                                <div>{empServForm.file ? "📄 " + empServForm.file.name : "إرفاق مستند الموظف (صور/PDF)"}</div>
                            </div>
                            <div style={{ gridColumn: "span 2" }}><label>اسم الخدمة / المستند</label><input value={empServForm.service_name} onChange={e => setEmpServForm({ ...empServForm, service_name: e.target.value })} placeholder="مثلاً: الإقامة، رخصة العمل..." /></div>
                            <div><label>تاريخ البداية</label><input type="date" value={empServForm.start_date} onChange={e => setEmpServForm({ ...empServForm, start_date: e.target.value })} /></div>
                            <div><label>تاريخ النهاية</label><input type="date" value={empServForm.expiry_date} onChange={e => setEmpServForm({ ...empServForm, expiry_date: e.target.value })} /></div>
                        </div>
                        <div style={{ display: 'flex', gap: 15, marginTop: 30 }}><button onClick={handleSaveEmpService} disabled={savingEmpServ} style={{ flex: 1 }}>{savingEmpServ ? "جاري..." : "حفظ"}</button><button onClick={() => setShowEmpServModal(false)} className="secondary" style={{ flex: 1 }}>إلغاء</button></div>
                    </div></div>
                )
            }

            {
                empToDelete && (
                    <div className="modal-overlay"><div className="modal-content" style={{ textAlign: 'center' }}><h2>تأكيد حذف الموظف؟</h2><p>سيؤدي هذا لحذف كافة الخدمات والمستندات المرتبطة به.</p><div style={{ display: 'flex', gap: 15 }}><button onClick={confirmDeleteEmployee} style={{ flex: 1, background: 'var(--danger)' }}>حذف</button><button onClick={() => setEmpToDelete(null)} className="secondary" style={{ flex: 1 }}>إلغاء</button></div></div></div>
                )
            }

            {
                empServToDelete && (
                    <div className="modal-overlay"><div className="modal-content" style={{ textAlign: 'center' }}><h2>تأكيد حذف الخدمة/المستند؟</h2><div style={{ display: 'flex', gap: 15, marginTop: 20 }}><button onClick={confirmDeleteEmpService} style={{ flex: 1, background: 'var(--danger)' }}>حذف</button><button onClick={() => setEmpServToDelete(null)} className="secondary" style={{ flex: 1 }}>إلغاء</button></div></div></div>
                )
            }

            {
                showVioModal && (
                    <div className="modal-overlay"><div className="modal-content" style={{ maxWidth: 650 }}>
                        <h2 style={{ marginBottom: 25, textAlign: 'right' }}>{editVioTarget ? "تعديل مخالفة" : "تسجيل مخالفة جديدة"}</h2>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                            <div style={{ gridColumn: "span 2", border: "2px dashed #e2e8f0", borderRadius: 12, padding: 25, textAlign: "center", cursor: "pointer", background: vioForm.file ? "#fef2f2" : "#f8fafc" }} onClick={() => vioFileInputRef.current?.click()}>
                                <input type="file" ref={vioFileInputRef} hidden onChange={e => setVioForm({ ...vioForm, file: e.target.files?.[0] || null })} accept=".jpg,.jpeg,.png,.pdf" />
                                <div style={{ fontSize: "1.5em", marginBottom: 5 }}>{vioForm.file ? "📄" : "📁"}</div>
                                <div style={{ fontWeight: 600 }}>{vioForm.file ? vioForm.file.name : "إرفاق مستند المخالفة (صور/PDF)"}</div>
                            </div>

                            <div><label>رقم المخالفة</label><input value={vioForm.violation_number} onChange={e => setVioForm({ ...vioForm, violation_number: e.target.value })} /></div>
                            <div>
                                <label>جهة المخالفة</label>
                                <select value={vioForm.authority} onChange={e => setVioForm({ ...vioForm, authority: e.target.value })}>
                                    <option value="">اختر الجهة...</option>
                                    {settings.filter(s => s.type === 'entity').map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>

                            <div><label>بند المخالفة</label><input value={vioForm.violation_article} onChange={e => setVioForm({ ...vioForm, violation_article: e.target.value })} /></div>
                            <div><label>مبلغ المخالفة</label><input type="number" value={vioForm.amount} onChange={e => setVioForm({ ...vioForm, amount: e.target.value })} /></div>

                            <div style={{ gridColumn: "span 2" }}><label>تاريخ المخالفة</label><input type="date" value={vioForm.violation_date} onChange={e => setVioForm({ ...vioForm, violation_date: e.target.value })} /></div>

                            <div><label>بداية فترة الاعتراض</label><input type="date" value={vioForm.objection_start_date} onChange={e => setVioForm({ ...vioForm, objection_start_date: e.target.value })} /></div>
                            <div><label>نهاية فترة الاعتراض</label><input type="date" value={vioForm.objection_end_date} onChange={e => setVioForm({ ...vioForm, objection_end_date: e.target.value })} /></div>

                            <div style={{ gridColumn: "span 2" }}><label>ملاحظات</label><textarea value={vioForm.notes} onChange={e => setVioForm({ ...vioForm, notes: e.target.value })} style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', padding: 10, minHeight: 80 }} /></div>
                        </div>
                        <div style={{ display: 'flex', gap: 15, marginTop: 30 }}><button onClick={handleSaveViolation} disabled={savingVio} style={{ flex: 1, background: 'var(--danger)' }}>{savingVio ? "جاري الحفظ..." : "حفظ المخالفة"}</button><button onClick={() => setShowVioModal(false)} className="secondary" style={{ flex: 1 }}>إلغاء</button></div>
                    </div></div>
                )
            }

            {
                vioToDelete && (
                    <div className="modal-overlay"><div className="modal-content" style={{ textAlign: 'center' }}><h2>تأكيد حذف المخالفة؟</h2><p>سيتم حذف كافة البيانات والمستندات المرتبطة بهذه المخالفة نهائياً.</p><div style={{ display: 'flex', gap: 15, marginTop: 25 }}><button onClick={confirmDeleteViolation} style={{ flex: 1, background: 'var(--danger)' }}>حذف نهائياً</button><button onClick={() => setVioToDelete(null)} className="secondary" style={{ flex: 1 }}>إلغاء</button></div></div></div>
                )
            }

            {
                showInvModal && (
                    <div className="modal-overlay"><div className="modal-content">
                        <h2 style={{ marginBottom: 25, textAlign: 'right' }}>{editInvTarget ? "تعديل فاتورة" : "إضافة فاتورة جديدة"}</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                            <div style={{ gridColumn: "span 2" }}><label>رقم الفاتورة</label><input value={invForm.invoice_number} onChange={e => setInvForm({ ...invForm, invoice_number: e.target.value })} placeholder="مثال: INV-2024-001" /></div>

                            <div><label>مبلغ الفاتورة</label><input type="number" value={invForm.amount} onChange={e => setInvForm({ ...invForm, amount: e.target.value })} /></div>
                            <div><label>مبلغ الغرامات (إن وجد)</label><input type="number" value={invForm.fines} onChange={e => setInvForm({ ...invForm, fines: e.target.value })} /></div>

                            <div style={{ gridColumn: "span 2", background: "#f8fafc", padding: 15, borderRadius: 10, textAlign: "center", border: "1px solid #e2e8f0" }}>
                                <label style={{ color: "var(--text-muted)", fontSize: "0.9em" }}>الإجمالي (غير قابل للتعديل)</label>
                                <div style={{ fontSize: "1.8em", fontWeight: 800, color: "#ef4444", marginTop: 5 }}>
                                    {((parseFloat(invForm.amount) || 0) + (parseFloat(invForm.fines) || 0)).toLocaleString()} <span style={{ fontSize: "0.5em" }}>ريال</span>
                                </div>
                            </div>

                            <div><label>تاريخ الاصدار</label><input type="date" value={invForm.invoice_date} onChange={e => setInvForm({ ...invForm, invoice_date: e.target.value })} /></div>
                            <div><label>تاريخ الاستحقاق</label><input type="date" value={invForm.due_date} onChange={e => setInvForm({ ...invForm, due_date: e.target.value })} /></div>

                            <div style={{ gridColumn: "span 2" }}>
                                <label>حالة الفاتورة</label>
                                <div style={{ display: "flex", gap: 10 }}>
                                    {['paid', 'unpaid', 'overdue'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setInvForm({ ...invForm, status: s as any })}
                                            style={{
                                                flex: 1,
                                                background: invForm.status === s ? (s === 'paid' ? '#166534' : (s === 'overdue' ? '#991b1b' : '#d97706')) : '#f1f5f9',
                                                color: invForm.status === s ? '#fff' : '#64748b',
                                                border: 'none'
                                            }}
                                        >
                                            {s === 'paid' ? 'مدفوعة' : (s === 'overdue' ? 'متاخرة' : 'غير مدفوعة')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 15, marginTop: 30 }}><button onClick={handleSaveInvoice} disabled={savingInv} style={{ flex: 1 }}>{savingInv ? "جاري..." : "حفظ الفاتورة"}</button><button onClick={() => setShowInvModal(false)} className="secondary" style={{ flex: 1 }}>إلغاء</button></div>
                    </div></div>
                )
            }

            {
                invToDelete && (
                    <div className="modal-overlay"><div className="modal-content" style={{ textAlign: 'center' }}><h2>تأكيد حذف الفاتورة؟</h2><p>سيتم حذف الفاتورة رقم <strong>{invToDelete.invoice_number}</strong> نهائياً.</p><div style={{ display: 'flex', gap: 15, marginTop: 25 }}><button onClick={confirmDeleteInvoice} style={{ flex: 1, background: 'var(--danger)' }}>حذف نهائياً</button><button onClick={() => setInvToDelete(null)} className="secondary" style={{ flex: 1 }}>إلغاء</button></div></div></div>
                )
            }
        </div >
    );
}
