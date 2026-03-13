/**
 * Generate standalone HTML files from session JSONL files.
 * Usage: npx tsx src/generate-html.ts <output-dir> <session1.jsonl> [session2.jsonl ...]
 */

import { parseSession } from './parsers/index.js';
import { redactSession } from './redact/index.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { nanoid } from 'nanoid';

interface Entry {
  type: string;
  timestamp: string;
  content: string;
  toolName?: string;
  toolCallId?: string;
  status?: string;
}

interface SessionData {
  id: string;
  metadata: Record<string, unknown>;
  entries: Entry[];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return ''; }
}

function getDuration(start: string, end: string): string {
  try {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  } catch { return ''; }
}

// ─── CSS ───

const CSS = `@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#f5f5f0;--bg-2:#ececea;--bg-3:#e2e2df;--border:#d4d4cf;--border-light:#ddddd8;--text:#1c1c1a;--text-2:#65655f;--text-3:#9a9a92;--accent:#1c1c1a;--green:#3d7a3d;--green-bg:#ddeedd;--red:#b83232;--red-bg:#f5dede;--mono:'JetBrains Mono',monospace;--sans:'Inter',-apple-system,sans-serif}
body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh;-webkit-font-smoothing:antialiased}
.page{max-width:820px;margin:0 auto;padding:0 24px}

/* Nav */
nav{display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-bottom:1px solid var(--border-light)}
.logo{display:flex;align-items:center;gap:8px;text-decoration:none;font-size:14px;font-weight:600;color:var(--text)}
.logo-mark{width:24px;height:24px;border-radius:6px;background:var(--text);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--bg);font-weight:700;font-family:var(--mono)}
.btn-copy{padding:5px 14px;border-radius:6px;font-size:12px;font-weight:600;background:var(--text);border:1px solid var(--text);color:var(--bg);cursor:pointer;font-family:var(--sans)}

/* Header */
.header{padding:32px 0 24px;border-bottom:1px solid var(--border-light)}
.breadcrumb{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text-3);margin-bottom:12px}
.breadcrumb .agent{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:500;background:var(--bg-2);border:1px solid var(--border-light);color:var(--text-2);font-family:var(--mono)}
.header h1{font-size:24px;font-weight:700;letter-spacing:-0.025em;line-height:1.4;margin-bottom:12px}
.meta-line{display:flex;flex-wrap:wrap;gap:16px;font-size:12px;color:var(--text-3)}

/* Stats */
.stats-bar{display:flex;gap:24px;padding:16px 0;border-bottom:1px solid var(--border-light);margin-bottom:8px}
.sb-item{text-align:center}
.sb-n{font-size:18px;font-weight:700;font-family:var(--mono);color:var(--text)}
.sb-l{font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:0.06em}

/* Controls */
.controls{display:flex;gap:8px;padding:12px 0 20px;border-bottom:1px solid var(--border-light);margin-bottom:0}
.search{flex:1;min-width:180px;padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;font-family:var(--sans);outline:none;transition:border-color .15s}
.search:focus{border-color:var(--text-3)}
.search::placeholder{color:var(--text-3)}
.ctrl-btn{padding:6px 12px;border-radius:6px;font-size:12px;font-weight:500;background:var(--bg);border:1px solid var(--border);color:var(--text-2);cursor:pointer;font-family:var(--sans);transition:background .15s;white-space:nowrap}
.ctrl-btn:hover{background:var(--bg-2)}
.ctrl-btn.active{background:var(--bg-3);color:var(--text);border-color:var(--text-3)}

/* Entries */
.entries{padding-bottom:60px}
.entry{padding:20px 0;border-bottom:1px solid var(--border-light)}
.entry:last-child{border-bottom:none}
.e-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.e-who{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:var(--text)}
.avatar{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;flex-shrink:0}
.av-user{background:var(--text)}
.av-bot{background:var(--text-2)}
.av-tool{background:var(--text-3)}
.av-think{background:var(--border);color:var(--text-3)}
.e-ts{font-size:11px;color:var(--text-3);font-family:var(--mono)}
.e-body{font-size:14px;line-height:1.75;color:var(--text);white-space:pre-wrap;word-break:break-word}
.e-body.long{max-height:200px;overflow:hidden;position:relative}
.e-body.long::after{content:'';position:absolute;bottom:0;left:0;right:0;height:60px;background:linear-gradient(transparent,var(--bg));pointer-events:none}
.show-more{margin-top:6px;background:none;border:none;color:var(--text-2);cursor:pointer;font-size:12px;font-family:var(--sans);text-decoration:underline;text-underline-offset:2px}
.show-more:hover{color:var(--text)}
.e-body code{background:var(--bg-2);padding:2px 6px;border-radius:4px;font-family:var(--mono);font-size:12.5px;border:1px solid var(--border-light)}
.e-body pre{background:var(--bg-2);border:1px solid var(--border-light);border-radius:8px;padding:14px 16px;margin:10px 0;overflow-x:auto;font-family:var(--mono);font-size:12.5px;line-height:1.55;color:var(--text-2)}

/* Thinking */
.entry-thinking{display:none}
.entry-thinking.show{display:block}
.entry-thinking .e-body{font-size:13px;color:var(--text-3);font-style:italic}
.entry-thinking .e-body.long::after{background:linear-gradient(transparent,var(--bg))}

/* Tool */
.entry-tool{background:var(--bg-2);margin:0 -24px;padding:16px 24px;border-bottom:1px solid var(--border-light)}
.tool-header-line{display:flex;align-items:center;gap:8px}
.tool-fn{font-family:var(--mono);font-size:12.5px;font-weight:500;color:var(--text)}
.tool-ok{font-size:10px;font-weight:600;color:var(--green);padding:1px 6px;border-radius:10px;background:var(--green-bg)}
.tool-err{font-size:10px;font-weight:600;color:var(--red);padding:1px 6px;border-radius:10px;background:var(--red-bg)}

/* Expandable tool body */
.tool-expand{border:1px solid var(--border-light);border-radius:6px;margin-top:8px;overflow:hidden}
.tool-expand-btn{width:100%;display:flex;align-items:center;gap:6px;padding:8px 12px;background:var(--bg);border:none;cursor:pointer;color:var(--text-2);font-size:12px;font-family:var(--mono);text-align:left}
.tool-expand-btn:hover{background:var(--bg-2)}
.tool-expand-btn .arrow{color:var(--text-3);transition:transform .15s;display:inline-block;font-size:10px}
.tool-expand-btn .arrow.open{transform:rotate(90deg)}
.tool-detail{display:none;border-top:1px solid var(--border-light)}
.tool-detail.open{display:block}
.tool-input-block{padding:12px 14px;font-family:var(--mono);font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-word;color:var(--text);max-height:300px;overflow:auto}
.tool-output-block{padding:12px 14px;border-top:1px solid var(--border-light);font-family:var(--mono);font-size:11.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;max-height:300px;overflow:auto}
.tool-output-block.ok{background:var(--green-bg);color:#2d5a2d}
.tool-output-block.err{background:var(--red-bg);color:#8b2020}

/* Footer */
footer{padding:24px 0;text-align:center;font-size:11px;color:var(--text-3);border-top:1px solid var(--border-light)}
footer a{color:var(--text-2);text-decoration:none;font-weight:500}

@media(max-width:640px){.page{padding:0 16px}.header h1{font-size:20px}.stats-bar{gap:16px}.entry-tool{margin:0 -16px;padding:12px 16px}.controls{flex-direction:column}}`;

// ─── HTML Generator ───

function generateHtml(session: SessionData): string {
  const meta = session.metadata as Record<string, string | number>;
  const entries = session.entries;
  const agent = meta.agent as string;
  const agentLabel = agent === 'claude-code' ? 'Claude Code' : agent === 'codex' ? 'Codex' : String(agent);
  const toolCalls = entries.filter(e => e.type === 'tool_call').length;
  const userMsgs = entries.filter(e => e.type === 'user').length;
  const duration = getDuration(meta.startedAt as string, meta.endedAt as string);
  const date = new Date(meta.startedAt as string).toLocaleDateString();
  const filesChanged = new Set(
    entries.filter(e => e.type === 'tool_call' && (e.toolName === 'Write' || e.toolName === 'Edit'))
      .map(e => e.content.split('\n')[0])
  ).size;

  // Build entry HTML
  let entriesHtml = '';
  let i = 0;
  while (i < entries.length) {
    const entry = entries[i];

    if (entry.type === 'thinking') {
      entriesHtml += renderThinking(entry);
      i++;
      continue;
    }

    if (entry.type === 'tool_call') {
      const result = (i + 1 < entries.length && entries[i + 1].type === 'tool_result' &&
        entries[i + 1].toolCallId === entry.toolCallId) ? entries[i + 1] : null;
      entriesHtml += renderToolGroup(entry, result, i);
      i += result ? 2 : 1;
      continue;
    }

    if (entry.type === 'tool_result' && !entriesHtml.includes(`data-callid="${entry.toolCallId}"`)) {
      entriesHtml += renderEntry(entry);
      i++;
      continue;
    }

    if (entry.type === 'user' || entry.type === 'assistant' || entry.type === 'system') {
      entriesHtml += renderEntry(entry);
    }
    i++;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(meta.title as string)} — CodeCast</title>
<style>${CSS}</style>
</head>
<body>
<div class="page">
  <nav>
    <a href="index.html" class="logo"><span class="logo-mark">C</span> CodeCast</a>
    <button class="btn-copy" onclick="navigator.clipboard.writeText(location.href)">Copy Link</button>
  </nav>

  <div class="header">
    <div class="breadcrumb">
      <span class="agent">${agentLabel}</span>
      <span>/</span>
      ${meta.model ? `<span>${escapeHtml(meta.model as string)}</span>` : ''}
    </div>
    <h1>${escapeHtml(meta.title as string)}</h1>
    <div class="meta-line">
      ${meta.project ? `<span>${escapeHtml(meta.project as string)}</span>` : ''}
      <span>${duration}</span>
      <span>${userMsgs} messages &middot; ${toolCalls} tool calls</span>
      <span>${date}</span>
    </div>
  </div>

  <div class="stats-bar">
    <div class="sb-item"><div class="sb-n">${userMsgs}</div><div class="sb-l">Messages</div></div>
    <div class="sb-item"><div class="sb-n">${toolCalls}</div><div class="sb-l">Tool Calls</div></div>
    <div class="sb-item"><div class="sb-n">${filesChanged}</div><div class="sb-l">Files</div></div>
    <div class="sb-item"><div class="sb-n">${duration}</div><div class="sb-l">Duration</div></div>
  </div>

  <div class="controls">
    <input type="text" class="search" placeholder="Search in session..." id="searchInput">
    <button class="ctrl-btn" id="thinkingToggle" onclick="toggleThinking()">Thinking</button>
  </div>

  <div class="entries" id="entries">
${entriesHtml}
  </div>

  <footer>Shared via <a href="https://code-cast.dev">CodeCast</a></footer>
</div>
<script>
function toggleTool(idx){
  const d=document.getElementById('tool-detail-'+idx);
  const a=document.getElementById('tool-arrow-'+idx);
  if(d.classList.contains('open')){d.classList.remove('open');a.classList.remove('open')}
  else{d.classList.add('open');a.classList.add('open')}
}
function toggleThinking(){
  const btn=document.getElementById('thinkingToggle');
  const els=document.querySelectorAll('.entry-thinking');
  const showing=btn.classList.contains('active');
  btn.classList.toggle('active');
  btn.textContent=showing?'Thinking':'Hide Thinking';
  els.forEach(el=>showing?el.classList.remove('show'):el.classList.add('show'));
}
function expandContent(btn){
  const content=btn.previousElementSibling;
  content.classList.remove('long');
  btn.remove();
}
document.getElementById('searchInput').addEventListener('input',function(e){
  const q=e.target.value.toLowerCase();
  document.querySelectorAll('.entries > *').forEach(el=>{
    if(!q){el.style.display='';return}
    el.style.display=el.textContent.toLowerCase().includes(q)?'':'none';
  });
});
</script>
</body>
</html>`;
}

// ─── Entry Renderers ───

function renderEntry(entry: Entry): string {
  const avatarMap: Record<string, { cls: string; letter: string; name: string }> = {
    user:        { cls: 'av-user', letter: 'Y', name: 'You' },
    assistant:   { cls: 'av-bot',  letter: 'C', name: 'Claude' },
    system:      { cls: 'av-tool', letter: 'S', name: 'System' },
    tool_result: { cls: 'av-tool', letter: 'R', name: 'Result' },
  };
  const { cls, letter, name } = avatarMap[entry.type] || { cls: 'av-tool', letter: '?', name: entry.type };
  const isLong = entry.content.length > 600;
  const displayContent = isLong ? entry.content.substring(0, 600) + '...' : entry.content;

  return `    <div class="entry">
      <div class="e-head">
        <span class="e-who"><span class="avatar ${cls}">${letter}</span> ${name}</span>
        ${entry.timestamp ? `<span class="e-ts">${formatTime(entry.timestamp)}</span>` : ''}
      </div>
      <div class="e-body${isLong ? ' long' : ''}">${escapeHtml(displayContent)}</div>
      ${isLong ? '<button class="show-more" onclick="expandContent(this)">Show more</button>' : ''}
    </div>`;
}

function renderThinking(entry: Entry): string {
  const isLong = entry.content.length > 400;
  const displayContent = isLong ? entry.content.substring(0, 400) + '...' : entry.content;
  return `    <div class="entry entry-thinking">
      <div class="e-head">
        <span class="e-who"><span class="avatar av-think">T</span> <span style="color:var(--text-3)">Thinking</span></span>
        ${entry.timestamp ? `<span class="e-ts">${formatTime(entry.timestamp)}</span>` : ''}
      </div>
      <div class="e-body${isLong ? ' long' : ''}">${escapeHtml(displayContent)}</div>
      ${isLong ? '<button class="show-more" onclick="expandContent(this)">Show more</button>' : ''}
    </div>`;
}

function renderToolGroup(call: Entry, result: Entry | null, idx: number): string {
  const isError = result?.status === 'error';
  const toolName = escapeHtml(call.toolName || 'Tool');
  const firstLetter = toolName.charAt(0).toUpperCase();
  const preview = escapeHtml(call.content.split('\n')[0].substring(0, 100));

  return `    <div class="entry entry-tool" data-callid="${call.toolCallId || ''}">
      <div class="e-head">
        <div class="tool-header-line">
          <span class="avatar av-tool" style="width:20px;height:20px;font-size:9px">${firstLetter}</span>
          <span class="tool-fn">${toolName}</span>
          <span class="${isError ? 'tool-err' : 'tool-ok'}">${isError ? 'error' : 'success'}</span>
        </div>
        ${call.timestamp ? `<span class="e-ts">${formatTime(call.timestamp)}</span>` : ''}
      </div>
      <div class="tool-expand">
        <button class="tool-expand-btn" onclick="toggleTool(${idx})">
          <span class="arrow" id="tool-arrow-${idx}">&#9654;</span>
          <span>${preview}</span>
        </button>
        <div class="tool-detail" id="tool-detail-${idx}">
          <div class="tool-input-block">${escapeHtml(call.content)}</div>
          ${result ? `<div class="tool-output-block ${isError ? 'err' : 'ok'}">${escapeHtml(result.content)}</div>` : ''}
        </div>
      </div>
    </div>`;
}

// ─── Index Page ───

const INDEX_CSS = `@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#f5f5f0;--bg-2:#ececea;--border:#d4d4cf;--border-light:#ddddd8;--text:#1c1c1a;--text-2:#65655f;--text-3:#9a9a92;--mono:'JetBrains Mono',monospace;--sans:'Inter',-apple-system,sans-serif}
body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh;-webkit-font-smoothing:antialiased}
.page{max-width:820px;margin:0 auto;padding:48px 24px}
.logo-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.logo-mark{width:28px;height:28px;border-radius:7px;background:var(--text);display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--bg);font-weight:700;font-family:var(--mono)}
h1{font-size:24px;font-weight:700;letter-spacing:-0.02em}
.subtitle{color:var(--text-3);font-size:13px;margin-bottom:32px}
.card{display:block;padding:16px 20px;background:var(--bg);border:1px solid var(--border-light);border-radius:8px;margin-bottom:8px;transition:all .15s;text-decoration:none;color:var(--text)}
.card:hover{border-color:var(--border);background:var(--bg-2)}
.card-title{font-size:14px;font-weight:600;margin-bottom:6px;line-height:1.4}
.card-agent{display:inline-block;padding:1px 7px;border-radius:3px;font-size:10px;font-weight:600;font-family:var(--mono);background:var(--bg-2);border:1px solid var(--border-light);color:var(--text-2);margin-right:6px;vertical-align:1px}
.card-meta{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--text-3)}
footer{margin-top:40px;padding-top:20px;border-top:1px solid var(--border-light);text-align:center;color:var(--text-3);font-size:11px}
footer a{color:var(--text-2);text-decoration:none;font-weight:500}
@media(max-width:640px){.page{padding:32px 16px}h1{font-size:20px}}`;

// ─── Main ───

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: npx tsx src/generate-html.ts <output-dir> <session1.jsonl> [session2.jsonl ...]');
  process.exit(1);
}

const outDir = resolve(args[0]);
const sessionFiles = args.slice(1);

mkdirSync(outDir, { recursive: true });

const indexEntries: { file: string; title: string; agent: string; project: string; date: string; entries: number; duration: string }[] = [];

for (const file of sessionFiles) {
  try {
    console.log(`Processing: ${file.split('/').pop()}`);
    const parsed = parseSession(resolve(file));
    const { session: redacted, summary } = redactSession(parsed);
    const id = nanoid(8);
    const sessionData: SessionData = {
      id,
      metadata: redacted.metadata as unknown as Record<string, unknown>,
      entries: redacted.entries,
    };
    const html = generateHtml(sessionData);
    const fileName = `${id}.html`;
    writeFileSync(join(outDir, fileName), html);

    const meta = redacted.metadata;
    indexEntries.push({
      file: fileName,
      title: meta.title,
      agent: meta.agent,
      project: meta.project || '',
      date: new Date(meta.startedAt).toLocaleDateString(),
      entries: meta.entryCount,
      duration: getDuration(meta.startedAt, meta.endedAt),
    });

    const cats = Object.entries(summary.categories).map(([k, v]) => `${v} ${k}`).join(', ');
    console.log(`  -> ${meta.entryCount} entries, redacted: ${cats || 'none'}`);
  } catch (err: unknown) {
    console.error(`  x Failed: ${(err as Error).message}`);
  }
}

// Generate index page
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CodeCast — Session Gallery</title>
<style>${INDEX_CSS}</style>
</head>
<body>
<div class="page">
  <div class="logo-row"><span class="logo-mark">C</span> <h1>CodeCast</h1></div>
  <p class="subtitle">${indexEntries.length} shared sessions</p>
${indexEntries.map(e => {
  const label = e.agent === 'claude-code' ? 'Claude Code' : e.agent === 'codex' ? 'Codex' : e.agent;
  return `  <a href="${e.file}" class="card">
    <div class="card-title"><span class="card-agent">${label}</span>${escapeHtml(e.title)}</div>
    <div class="card-meta">
      ${e.project ? `<span>${escapeHtml(e.project)}</span>` : ''}
      <span>${e.date}</span>
      <span>${e.duration}</span>
      <span>${e.entries} entries</span>
    </div>
  </a>`;
}).join('\n')}
  <footer>Shared via <a href="https://code-cast.dev">CodeCast</a></footer>
</div>
</body>
</html>`;

writeFileSync(join(outDir, 'index.html'), indexHtml);
console.log(`\nDone: ${indexEntries.length} session pages + index.html`);
console.log(`Open: ${join(outDir, 'index.html')}`);
