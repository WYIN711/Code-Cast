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
          <a href="#docs" className="hp-nav-link">Docs</a>
          <a href="https://github.com/WYIN711/Code-Cast" className="hp-nav-link">GitHub</a>
          <a href="https://t.me/+NBlMMSZaNl4zMGQx" className="hp-nav-link">Telegram</a>
        </div>
      </nav>

      {/* Hero + Steps */}
      <section className="hp-hero">
        <div className="hp-hero-left">
          <p className="hp-slogan"><em>Code</em> is the outcome. <em>Session</em> is the story.</p>
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
              <img src="/opencode-icon.svg" width={18} height={18} alt="OpenCode" style={{ borderRadius: 4 }} />
              OpenCode
            </span>
            <span className="hp-plat-btn">
              <img src="/gemini-icon.svg" width={18} height={18} alt="Gemini" />
              Gemini CLI
            </span>
            <span className="hp-plat-btn">
              <img src="/openai-icon.svg" width={18} height={18} alt="OpenAI" />
              Codex
            </span>
            <span className="hp-plat-btn">
              <img src="/openclaw-icon.svg" width={18} height={18} alt="OpenClaw" style={{ borderRadius: 4 }} />
              OpenClaw
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
                <span className="hp-cmd-text"><span className="hp-prompt">$</span> npm i -g codecast-cli</span>
                <button className="hp-copy-btn" onClick={e => copyCmd('npm i -g codecast-cli', e.currentTarget)} title="Copy">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
              </div>
              <div className="hp-step-desc">OpenClaw users: just ask your agent to install it</div>
            </div>
            <div className="hp-step">
              <div className="hp-step-top">
                <span className="hp-step-num">2</span>
                <span className="hp-step-title">Publish</span>
              </div>
              <div className="hp-step-code">
                <span className="hp-cmd-text">/cast · /skill cast · $cast</span>
              </div>
              <div className="hp-step-desc"><strong>/cast</strong> in Claude Code, OpenCode, Gemini CLI · <strong>/skill cast</strong> in OpenClaw · <strong>$cast</strong> in Codex</div>
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
            <p>Reads JSONL, JSON, and SQLite session files. Messages, tool calls, thinking blocks — all structured automatically.</p>
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

      {/* Docs */}
      <hr className="hp-divider" />
      <section>
        <h2 className="hp-section-title" id="docs">How it works</h2>

        {/* Publish */}
        <div className="hp-doc">
          <div className="hp-doc-header">
            <span className="hp-doc-icon">/</span>
            <h3>Publish a session</h3>
          </div>
          <p className="hp-doc-desc">
            Install once — commands are automatically registered to all platforms:
          </p>
          <div className="hp-doc-code">
            <button className="hp-doc-copy" onClick={e => copyCmd('npm i -g codecast-cli', e.currentTarget)} title="Copy install command">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <span className="hp-doc-code-line"><span className="hp-prompt">$</span> npm i -g codecast-cli</span>
          </div>
          <p className="hp-doc-note">
            <strong>OpenClaw users:</strong> No terminal needed. Just send this message to your OpenClaw agent and it will handle the install for you:
          </p>
          <div className="hp-doc-code">
            <button className="hp-doc-copy" onClick={e => copyCmd('Install codecast-cli globally via npm, then confirm /skill cast is available.', e.currentTarget)} title="Copy">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <span className="hp-doc-code-line"><span className="hp-doc-code-dim"># Send this to your OpenClaw agent:</span></span>
            <span className="hp-doc-code-line">Install codecast-cli globally via npm, then</span>
            <span className="hp-doc-code-line">confirm /skill cast is available.</span>
          </div>
          <p className="hp-doc-desc">
            Then inside your coding session, type the command. It parses the current conversation, redacts sensitive data, and uploads — all in one step:
          </p>
          <div className="hp-doc-code">
            <span className="hp-doc-code-line"><span className="hp-doc-code-dim"># Claude Code / OpenCode / Gemini CLI</span></span>
            <span className="hp-doc-code-line"><span className="hp-prompt">{'>'}</span> /cast</span>
            <span className="hp-doc-code-line"> </span>
            <span className="hp-doc-code-line"><span className="hp-doc-code-dim"># OpenClaw</span></span>
            <span className="hp-doc-code-line"><span className="hp-prompt">{'>'}</span> /skill cast</span>
            <span className="hp-doc-code-line"> </span>
            <span className="hp-doc-code-line"><span className="hp-doc-code-dim"># Codex</span></span>
            <span className="hp-doc-code-line"><span className="hp-prompt">{'>'}</span> $cast</span>
            <span className="hp-doc-code-line hp-doc-code-dim">Published!</span>
            <span className="hp-doc-code-line hp-doc-code-dim">  Share link: https://code-cast.dev/s/abc123</span>
            <span className="hp-doc-code-line hp-doc-code-dim">  ID: abc123</span>
            <span className="hp-doc-code-line hp-doc-code-dim">  Profile: https://code-cast.dev/@yourname</span>
          </div>
          <p className="hp-doc-desc">
            Sessions are <strong>unlisted</strong> by default — only people with the link can view. Use <code>--visibility public</code> to list on your profile page. No account required for basic sharing.
          </p>
        </div>

        {/* Redact */}
        <div className="hp-doc">
          <div className="hp-doc-header">
            <span className="hp-doc-icon">***</span>
            <h3>Automatic redaction</h3>
          </div>
          <p className="hp-doc-desc">
            Before anything leaves your machine, sensitive information is automatically stripped. Redaction runs locally — raw data never reaches the server.
          </p>
          <div className="hp-doc-table">
            <div className="hp-doc-tr">
              <span className="hp-doc-td-label">API keys & tokens</span>
              <span className="hp-doc-td-val"><code>sk-...</code> <code>Bearer ...</code> AWS keys</span>
            </div>
            <div className="hp-doc-tr">
              <span className="hp-doc-td-label">File paths</span>
              <span className="hp-doc-td-val"><code>/Users/you/</code> &rarr; <code>/Users/[USER]/</code></span>
            </div>
            <div className="hp-doc-tr">
              <span className="hp-doc-td-label">Emails</span>
              <span className="hp-doc-td-val"><code>you@company.com</code> &rarr; <code>[REDACTED_EMAIL]</code></span>
            </div>
            <div className="hp-doc-tr">
              <span className="hp-doc-td-label">JWT tokens</span>
              <span className="hp-doc-td-val"><code>eyJhbG...</code> patterns</span>
            </div>
            <div className="hp-doc-tr">
              <span className="hp-doc-td-label">Secrets</span>
              <span className="hp-doc-td-val">Long base64/hex strings, private IPs, Git URLs</span>
            </div>
          </div>
        </div>

        {/* Viewer */}
        <div className="hp-doc">
          <div className="hp-doc-header">
            <span className="hp-doc-icon">{'</>'}</span>
            <h3>Session viewer</h3>
          </div>
          <p className="hp-doc-desc">
            Each session page renders the full conversation as a clean, readable timeline:
          </p>
          <ul className="hp-doc-list">
            <li><strong>Messages</strong> — user prompts and assistant responses, with timestamps</li>
            <li><strong>Tool calls</strong> — file reads, edits, bash commands, grouped with their results. Click to expand full input/output</li>
            <li><strong>Thinking blocks</strong> — hidden by default, toggle to reveal the model&apos;s reasoning chain</li>
            <li><strong>Search</strong> — filter entries by keyword across the entire session</li>
            <li><strong>Metadata</strong> — agent type, model, project name, duration, message and tool call counts</li>
          </ul>
          <p className="hp-doc-desc">
            Anyone with the link can view — no login required. Works on desktop and mobile.
          </p>
        </div>

        {/* Session management */}
        <div className="hp-doc">
          <div className="hp-doc-header">
            <span className="hp-doc-icon">{'{ }'}</span>
            <h3>Manage sessions</h3>
          </div>
          <p className="hp-doc-desc">
            Every upload returns a <strong>manage token</strong> — a one-time key that lets you delete or update the session without an account. The token is saved locally and used automatically.
          </p>
          <div className="hp-doc-code">
            <button className="hp-doc-copy" onClick={e => copyCmd('/cast delete abc123', e.currentTarget)} title="Copy">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <span className="hp-doc-code-line"><span className="hp-prompt">{'>'}</span> /cast delete abc123  <span className="hp-doc-code-dim">Works in Claude Code, OpenCode, Gemini CLI · /skill cast delete (OpenClaw) · $cast delete (Codex)</span></span>
            <span className="hp-doc-code-line hp-doc-code-dim">Deleted session abc123</span>
          </div>
          <div className="hp-doc-code">
            <button className="hp-doc-copy" onClick={e => copyCmd('/cast history', e.currentTarget)} title="Copy">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <span className="hp-doc-code-line"><span className="hp-prompt">{'>'}</span> /cast history  <span className="hp-doc-code-dim">Works in Claude Code, OpenCode, Gemini CLI · /skill cast history (OpenClaw) · $cast history (Codex)</span></span>
            <span className="hp-doc-code-line hp-doc-code-dim">  2026-03-13 21:00  abc123</span>
            <span className="hp-doc-code-line hp-doc-code-dim">    https://code-cast.dev/s/abc123</span>
          </div>
          <p className="hp-doc-desc">
            You can also open the manage link in a browser — it shows delete and visibility controls directly on the page, no login needed.
          </p>
        </div>

        {/* GitHub login & profile */}
        <div className="hp-doc">
          <div className="hp-doc-header">
            <span className="hp-doc-icon">@</span>
            <h3>GitHub login & profile</h3>
          </div>
          <p className="hp-doc-desc">
            Link your GitHub account to unlock a public profile page at <code>code-cast.dev/@username</code>.
            All sessions you publish while logged in are tied to your account — you can manage them from any device, and your public sessions are listed on your profile for anyone to browse.
          </p>
          <div className="hp-doc-code">
            <button className="hp-doc-copy" onClick={e => copyCmd('/cast login', e.currentTarget)} title="Copy">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <span className="hp-doc-code-line"><span className="hp-prompt">{'>'}</span> /cast login  <span className="hp-doc-code-dim">Works in Claude Code, OpenCode, Gemini CLI · /skill cast login (OpenClaw) · $cast login (Codex)</span></span>
            <span className="hp-doc-code-line hp-doc-code-dim">Opening browser for GitHub login...</span>
            <span className="hp-doc-code-line hp-doc-code-dim">Logged in as <span style={{ color: 'var(--green)' }}>yourname</span></span>
          </div>
          <ul className="hp-doc-list">
            <li><strong>Profile page</strong> — your avatar, display name, GitHub link, and all public sessions at <code>code-cast.dev/@yourname</code></li>
            <li><strong>Unlisted sessions</strong> — only you can see your unlisted sessions on your profile (marked with a dashed badge). Other visitors only see public ones</li>
            <li><strong>Cross-device management</strong> — delete or change visibility from any browser where you&apos;re signed in</li>
            <li><strong>Ownership</strong> — sessions are permanently linked to your account, not just a local token</li>
          </ul>
          <p className="hp-doc-note">
            Login is optional. Without it, you can still publish and manage sessions via the manage token. Use <code>/cast logout</code> to sign out.
          </p>
        </div>

        {/* Command reference */}
        <div className="hp-doc">
          <div className="hp-doc-header">
            <span className="hp-doc-icon">/</span>
            <h3>Command reference</h3>
          </div>
          <p className="hp-doc-desc">
            Use <code>/cast</code> in <strong>Claude Code</strong>, <strong>OpenCode</strong>, and <strong>Gemini CLI</strong>; <code>/skill cast</code> in <strong>OpenClaw</strong>; <code>$cast</code> in <strong>Codex</strong>:
          </p>
          <div className="hp-doc-table hp-doc-table-wide">
            <div className="hp-doc-tr">
              <span className="hp-doc-td-label">Claude Code / OpenCode / Gemini CLI</span>
              <span className="hp-doc-td-cmd"><code>/cast</code></span>
              <span className="hp-doc-td-val">Publish the current session as a shareable link.</span>
            </div>
            <div className="hp-doc-tr">
              <span className="hp-doc-td-label">OpenClaw</span>
              <span className="hp-doc-td-cmd"><code>/skill cast</code></span>
              <span className="hp-doc-td-val">OpenClaw skill invocation syntax.</span>
            </div>
            <div className="hp-doc-tr">
              <span className="hp-doc-td-label">Codex</span>
              <span className="hp-doc-td-cmd"><code>$cast</code></span>
              <span className="hp-doc-td-val">Codex skill syntax.</span>
            </div>
          </div>
          <div className="hp-doc-table hp-doc-table-wide" style={{ marginTop: 8 }}>
            <div className="hp-doc-tr">
              <span className="hp-doc-td-cmd"><code>login</code></span>
              <span className="hp-doc-td-val">Log in with GitHub. Unlocks profile page & cross-device management.</span>
            </div>
            <div className="hp-doc-tr">
              <span className="hp-doc-td-cmd"><code>logout</code></span>
              <span className="hp-doc-td-val">Sign out and remove stored credentials.</span>
            </div>
            <div className="hp-doc-tr">
              <span className="hp-doc-td-cmd"><code>delete &lt;id&gt;</code></span>
              <span className="hp-doc-td-val">Delete a published session by ID.</span>
            </div>
            <div className="hp-doc-tr">
              <span className="hp-doc-td-cmd"><code>history</code></span>
              <span className="hp-doc-td-val">Show upload history from this machine.</span>
            </div>
            <div className="hp-doc-tr">
              <span className="hp-doc-td-cmd"><code>list</code></span>
              <span className="hp-doc-td-val">List local session files.</span>
            </div>
          </div>
          <p className="hp-doc-note">
            Example: <code>/cast login</code> in Claude Code / OpenCode / Gemini CLI, <code>/skill cast login</code> in OpenClaw, <code>$cast login</code> in Codex. Also available as standalone CLI: <code>codecast publish</code>, <code>codecast login</code>, etc.
          </p>
        </div>

        {/* Supported sources */}
        <div className="hp-doc">
          <div className="hp-doc-header">
            <span className="hp-doc-icon">{'{}'}</span>
            <h3>Supported sources</h3>
          </div>
          <div className="hp-doc-table">
            <div className="hp-doc-tr">
              <span className="hp-doc-td-label">Claude Code</span>
              <span className="hp-doc-td-val"><code>~/.claude/projects/&lt;path&gt;/*.jsonl</code></span>
            </div>
            <div className="hp-doc-tr">
              <span className="hp-doc-td-label">OpenCode</span>
              <span className="hp-doc-td-val"><code>~/.local/share/opencode/opencode.db</code> (SQLite)</span>
            </div>
            <div className="hp-doc-tr">
              <span className="hp-doc-td-label">Gemini CLI</span>
              <span className="hp-doc-td-val"><code>~/.gemini/tmp/&lt;hash&gt;/chats/*.json</code></span>
            </div>
            <div className="hp-doc-tr">
              <span className="hp-doc-td-label">Codex</span>
              <span className="hp-doc-td-val"><code>~/.codex/sessions/&lt;date&gt;/*.jsonl</code></span>
            </div>
            <div className="hp-doc-tr">
              <span className="hp-doc-td-label">OpenClaw</span>
              <span className="hp-doc-td-val"><code>~/.openclaw/agents/&lt;id&gt;/sessions/*.jsonl</code></span>
            </div>
          </div>
          <p className="hp-doc-note">
            Session files are auto-discovered. All slash commands are automatically registered when you install <code>codecast-cli</code> — no manual setup needed. Use <code>/cast list</code> to browse available sessions.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="hp-footer">
        <span>Built by <a href="https://x.com/wyin711">@wyin711</a></span>
        <div className="hp-footer-links">
          <a href="#docs">Docs</a>
          <a href="https://github.com/WYIN711/Code-Cast">GitHub</a>
          <a href="https://t.me/+NBlMMSZaNl4zMGQx">Telegram</a>
          <a href="https://code-cast.dev">code-cast.dev</a>
        </div>
      </footer>
    </div>
  );
}
