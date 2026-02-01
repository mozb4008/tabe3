import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                gap: 20
            }}>
                <div style={{
                    width: 40,
                    height: 40,
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid var(--accent)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>جاري التحميل...</div>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }
    if (!user) return <Navigate to="/login" />;

    return children;
}
