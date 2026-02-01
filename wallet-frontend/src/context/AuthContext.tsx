import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

import logo from "../assets/logo.png";

type User = {
    id: number;
    name: string;
    role: "viewer" | "entry" | "admin";
    institution_id?: number;
};

type PlatformInfo = {
    name: string;
    description: string;
    logo_path?: string;
    ai_enabled?: number;
    telegram_enabled?: number;
};

type AuthContextType = {
    user: User | null;
    loading: boolean;
    platformInfo: PlatformInfo;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    showToast: (msg: string, type?: "success" | "error") => void;
    refreshPlatformInfo: () => Promise<void>;
    updatePlatformInfo: (info: PlatformInfo) => void;
};

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
        name: "تابع",
        description: "إدارة الخدمات للمؤسسات والشركات",
        logo_path: logo
    });
    const [toasts, setToasts] = useState<{ id: number; msg: string; type: "success" | "error" }[]>([]);

    async function refreshPlatformInfo() {
        try {
            const res = await api.get(`/platform?t=${Date.now()}`);
            if (res.data) {
                console.log("Global Platform Info Update:", res.data);
                setPlatformInfo(res.data);
            }
        } catch (err) {
            console.error("Failed to load platform info:", err);
        }
    }

    useEffect(() => {
        api.get("/me")
            .then(res => setUser(res.data))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));

        refreshPlatformInfo();
    }, []);

    // Effect for the browser tab title
    useEffect(() => {
        const platformName = platformInfo.name || "منصة تابع";
        const platformDesc = platformInfo.description || "إدارة الخدمات للمؤسسات والشركات";
        document.title = `${platformName} - ${platformDesc}`;
    }, [platformInfo.name, platformInfo.description]);

    // Effect for the favicon
    useEffect(() => {
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (link) {
            link.href = platformInfo.logo_path || "/favicon.png";
        }
    }, [platformInfo.logo_path]);

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    const login = async (username: string, password: string) => {
        try {
            const res = await api.post("/login", { username, password });
            setUser(res.data.user);
            return true;
        } catch (err: any) {
            console.error("Login error:", err.response?.data || err.message);
            return false;
        }
    };

    const logout = async () => {
        await api.post("/logout");
        setUser(null);
    };

    const updatePlatformInfo = (info: PlatformInfo) => {
        setPlatformInfo(info);
    };

    return (
        <AuthContext.Provider value={{ user, loading, platformInfo, login, logout, showToast, refreshPlatformInfo, updatePlatformInfo }}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast ${t.type}`}>
                        <span>{t.type === 'success' ? '✅' : '⚠️'}</span>
                        <span>{t.msg}</span>
                    </div>
                ))}
            </div>
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
