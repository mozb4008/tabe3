import { useState, useRef, useEffect } from 'react';
import api from '../lib/api';

export default function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [chat, setChat] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chat]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || loading) return;

        const userMsg = message;
        setMessage('');
        setChat(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const res = await api.post('/ai/chat', {
                message: userMsg,
                history: chat.slice(-6) // Send last 6 messages for context
            });
            setChat(prev => [...prev, { role: 'assistant', content: res.data.response }]);
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || 'عذراً، حدث خطأ أثناء الاتصال بالمساعد الذكي.';
            setChat(prev => [...prev, { role: 'assistant', content: errorMsg }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 1000, direction: 'rtl' }}>
            {/* Toggle Button */}
            <button
                onClick={() => {
                    const nextState = !isOpen;
                    setIsOpen(nextState);
                    if (!nextState) setChat([]); // Clear chat when closing
                }}
                style={{
                    width: 65,
                    height: 65,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8em',
                    border: '4px solid #fff',
                    transition: 'all 0.3s ease',
                    transform: isOpen ? 'rotate(180deg) scale(0.9)' : 'scale(1)',
                }}
            >
                {isOpen ? '×' : '🤖'}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    bottom: 85,
                    right: 0,
                    width: 400,
                    height: 550,
                    background: '#fff',
                    borderRadius: 24,
                    boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    border: '1px solid #f0f0f0',
                    animation: 'slideUp 0.3s ease-out',
                }}>
                    {/* Header */}
                    <div style={{ background: 'var(--accent)', padding: '15px 20px', color: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2em' }}>🤖</div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '1em' }}>المساعد الذكي</div>
                                    <div style={{ fontSize: '0.75em', opacity: 0.9 }}>متصل الآن</div>
                                </div>
                            </div>
                            <button
                                onClick={() => setChat([])}
                                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', padding: '5px 10px', borderRadius: '15px', color: '#fff', fontSize: '0.75em', cursor: 'pointer' }}
                                title="بدء محادثة جديدة"
                            >
                                🗑️ مسح
                            </button>
                        </div>
                    </div>

                    {/* Messages Body */}
                    <div
                        ref={scrollRef}
                        style={{ flex: 1, padding: 20, overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 15 }}
                    >
                        <div style={{ alignSelf: 'flex-start', background: '#fff', padding: '12px 16px', borderRadius: '4px 18px 18px 18px', fontSize: '0.95em', maxWidth: '85%', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', color: '#1e293b', border: '1px solid #f1f5f9' }}>
                            أهلاً بك! أنا مساعدك الذكي المتخصص في الأنظمة والخدمات. كيف يمكنني خدمتك اليوم بخصوص الإجراءات أو الخدمات؟
                        </div>

                        {chat.map((c, i) => (
                            <div
                                key={i}
                                style={{
                                    alignSelf: c.role === 'user' ? 'flex-end' : 'flex-start',
                                    background: c.role === 'user' ? 'var(--accent)' : '#fff',
                                    color: c.role === 'user' ? '#fff' : '#1e293b',
                                    padding: '12px 16px',
                                    borderRadius: c.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                                    fontSize: '0.95em',
                                    maxWidth: '85%',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                    lineHeight: 1.5,
                                    border: c.role === 'user' ? 'none' : '1px solid #f1f5f9'
                                }}
                            >
                                {c.content}
                            </div>
                        ))}
                        {loading && (
                            <div style={{ alignSelf: 'flex-start', background: '#fff', padding: '12px 16px', borderRadius: '4px 18px 18px 18px', fontSize: '0.8em', color: '#94a3b8' }}>
                                جاري التفكير... ⏳
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} style={{ padding: '15px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, background: '#fff' }}>
                        <input
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="اكتب استفسارك هنا..."
                            style={{ flex: 1, padding: '12px 18px', borderRadius: 30, border: '2px solid #f1f5f9', fontSize: '0.95em' }}
                        />
                        <button
                            type="submit"
                            disabled={!message.trim() || loading}
                            style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--accent)', color: '#fff', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2em' }}
                        >
                            🚀
                        </button>
                    </form>
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
