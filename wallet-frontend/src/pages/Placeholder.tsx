export default function Placeholder({ title }: { title: string }) {
    return (
        <div style={{ padding: 40, textAlign: "center" }}>
            <h2 style={{ color: "var(--text-muted)" }}>قريباً: {title}</h2>
            <p>هذه الصفحة قيد التطوير حالياً كجزء من منصة المعقب الذكي.</p>
        </div>
    );
}
