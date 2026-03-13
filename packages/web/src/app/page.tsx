'use client';

import { useCallback } from 'react';

export default function Home() {
  const copyCmd = useCallback((text: string, btn: HTMLButtonElement) => {
    navigator.clipboard.writeText(text).then(() => {
      btn.classList.add('copied');
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      }, 1500);
    });
  }, []);

  return (
    <div className="hp-page">
      {/* Nav */}
      <nav className="hp-nav">
        <a href="/" className="hp-logo">
          <svg width="24" height="24" viewBox="0 0 56 56" fill="none"><rect width="56" height="56" rx="12" fill="var(--text)"/><path d="M24 17 L14 28 L24 39" stroke="var(--bg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M31 23 C34 25, 34 31, 31 33" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8"/><path d="M35.5 19.5 C40 22.5, 40 33.5, 35.5 36.5" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5"/><path d="M40 16 C46 20.5, 46 35.5, 40 40" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.25"/></svg>
          CodeCast
        </a>
        <div className="hp-nav-r">
          <a href="https://github.com/WYIN711/Code-Cast" className="hp-nav-link">GitHub</a>
        </div>
      </nav>

      {/* Hero + Steps */}
      <section className="hp-hero">
        <div className="hp-hero-left">
          <h1>Share your AI<br/>coding sessions</h1>
          <p className="hp-sub">One command to turn terminal transcripts into clean, shareable pages.</p>
          <div className="hp-usecases">
            <div className="hp-uc"><span className="hp-uc-dot" />Share with teammates to debug together</div>
            <div className="hp-uc"><span className="hp-uc-dot" />Attach to PRs and issues as full context</div>
            <div className="hp-uc"><span className="hp-uc-dot" />Demo how you built something with AI</div>
            <div className="hp-uc"><span className="hp-uc-dot" />Build a portfolio of your AI-assisted work</div>
          </div>
          <div className="hp-platforms">
            <span className="hp-plat-btn">
              <img src="/claude-icon.svg" width={18} height={18} alt="Claude" style={{ borderRadius: 4 }} />
              Claude Code
            </span>
            <span className="hp-plat-btn">
              <img src="/openai-icon.svg" width={18} height={18} alt="OpenAI" />
              Codex
            </span>
          </div>
        </div>

        <div className="hp-hero-right">
          <div className="hp-steps-card">
            <div className="hp-steps-header">Get started</div>
            <div className="hp-step">
              <div className="hp-step-top">
                <span className="hp-step-num">1</span>
                <span className="hp-step-title">Install</span>
              </div>
              <div className="hp-step-code">
                <span className="hp-cmd-text"><span className="hp-prompt">$</span> npm i -g codecast</span>
                <button className="hp-copy-btn" onClick={e => copyCmd('npm i -g codecast', e.currentTarget)} title="Copy">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
              </div>
            </div>
            <div className="hp-step">
              <div className="hp-step-top">
                <span className="hp-step-num">2</span>
                <span className="hp-step-title">Publish</span>
              </div>
              <div className="hp-step-code">
                <span className="hp-cmd-text">/cast</span>
                <button className="hp-copy-btn" onClick={e => copyCmd('/cast', e.currentTarget)} title="Copy">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
              </div>
              <div className="hp-step-desc">Inside Claude Code or Codex. Or <strong>codecast publish</strong> from terminal.</div>
            </div>
            <div className="hp-step">
              <div className="hp-step-top">
                <span className="hp-step-num">3</span>
                <span className="hp-step-title">Share</span>
              </div>
              <div className="hp-step-code">
                <span className="hp-cmd-text">code-cast.dev/s/74dkfkZL</span>
                <button className="hp-copy-btn" onClick={e => copyCmd('https://code-cast.dev/s/74dkfkZL', e.currentTarget)} title="Copy">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
              </div>
              <div className="hp-step-desc">Anyone can view — no login needed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <hr className="hp-divider" />
      <section>
        <div className="hp-features-grid">
          <div className="hp-feat">
            <div className="hp-feat-icon">{'{}'}</div>
            <h3>Auto-parse</h3>
            <p>Reads JSONL session files. Messages, tool calls, thinking blocks — all structured automatically.</p>
          </div>
          <div className="hp-feat">
            <div className="hp-feat-icon">***</div>
            <h3>Auto-redact</h3>
            <p>API keys, file paths, emails, JWTs stripped before publishing. Always safe to share.</p>
          </div>
          <div className="hp-feat">
            <div className="hp-feat-icon">{'</>'}</div>
            <h3>Clean output</h3>
            <p>Minimal pages with search, collapsible tools, and thinking toggle. No clutter.</p>
          </div>
        </div>
      </section>

      {/* Preview */}
      <hr className="hp-divider" />
      <section>
        <h2 className="hp-section-title">What it looks like</h2>
        <a href="/s/74dkfkZL" className="hp-preview-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div className="hp-preview-bar">
            <span className="hp-preview-dot" />
            <span className="hp-preview-dot" />
            <span className="hp-preview-dot" />
            <span className="hp-preview-url">code-cast.dev/s/74dkfkZL</span>
          </div>
          <div className="hp-preview-body">
            <div className="hp-pe">
              <div className="hp-pe-head">
                <span className="hp-pe-av hp-pe-av-u">Y</span> You
                <span className="hp-pe-ts">14:32:10</span>
              </div>
              <div className="hp-pe-body">Add dark mode support to the settings page</div>
            </div>
            <div className="hp-pe">
              <div className="hp-pe-head">
                <span className="hp-pe-av hp-pe-av-b">C</span> Claude
                <span className="hp-pe-ts">14:32:15</span>
              </div>
              <div className="hp-pe-body">I&apos;ll add a theme toggle to the settings page with system, light, and dark options.</div>
            </div>
            <div className="hp-pe-tool">
              <div className="hp-pe-tool-head">
                <span className="hp-pe-av hp-pe-av-t" style={{ width: 16, height: 16, fontSize: 8 }}>R</span>
                <span className="hp-pe-tool-fn">Read</span>
                <span className="hp-pe-tool-ok">success</span>
                <span style={{ flex: 1 }} />
                <span className="hp-pe-ts">14:32:16</span>
              </div>
            </div>
            <div className="hp-pe-tool">
              <div className="hp-pe-tool-head">
                <span className="hp-pe-av hp-pe-av-t" style={{ width: 16, height: 16, fontSize: 8 }}>E</span>
                <span className="hp-pe-tool-fn">Edit</span>
                <span className="hp-pe-tool-ok">success</span>
                <span style={{ flex: 1 }} />
                <span className="hp-pe-ts">14:32:24</span>
              </div>
            </div>
            <div className="hp-pe">
              <div className="hp-pe-head">
                <span className="hp-pe-av hp-pe-av-b">C</span> Claude
                <span className="hp-pe-ts">14:32:30</span>
              </div>
              <div className="hp-pe-body">Done. Added a theme toggle with three options. Preference is saved to localStorage and respects system default.</div>
            </div>
          </div>
        </a>
      </section>

      {/* Footer */}
      <footer className="hp-footer">
        <span>CodeCast</span>
        <div className="hp-footer-links">
          <a href="https://github.com/WYIN711/Code-Cast">GitHub</a>
          <a href="https://code-cast.dev">code-cast.dev</a>
        </div>
      </footer>
    </div>
  );
}
