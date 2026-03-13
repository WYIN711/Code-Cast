export default function Home() {
  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px' }}>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 0', borderBottom: '1px solid var(--border-light)',
      }}>
        <a href="/" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          textDecoration: 'none', fontSize: 14, fontWeight: 600, color: 'var(--text)',
        }}>
          <img src="/logo.svg" alt="CodeCast" width={24} height={24} style={{ borderRadius: 6 }} />
          CodeCast
        </a>
      </nav>

      <main style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '70vh', textAlign: 'center',
      }}>
        <img src="/logo.svg" alt="CodeCast" width={48} height={48} style={{ borderRadius: 12, marginBottom: 24 }} />
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 12 }}>
          CodeCast
        </h1>
        <p style={{ color: 'var(--text-2)', maxWidth: 420, lineHeight: 1.6, fontSize: 14, marginBottom: 32 }}>
          Share your AI coding sessions as beautiful, readable web pages.
          Supports Claude Code and Codex.
        </p>
        <code style={{
          padding: '10px 20px', background: 'var(--bg-2)', border: '1px solid var(--border-light)',
          borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-2)',
        }}>
          codecast publish [session-file]
        </code>
      </main>

      <footer style={{
        padding: '24px 0', textAlign: 'center', fontSize: 11,
        color: 'var(--text-3)', borderTop: '1px solid var(--border-light)',
      }}>
        <a href="https://github.com/WYIN711/Code-Cast" style={{ color: 'var(--text-2)', textDecoration: 'underline', textUnderlineOffset: 2 }}>GitHub</a>
      </footer>
    </div>
  );
}
