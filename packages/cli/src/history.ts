import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.codecast');
const HISTORY_FILE = join(CONFIG_DIR, 'history.json');
const MAX_ENTRIES = 100;

export interface HistoryEntry {
  id: string;
  url: string;
  manageToken?: string;
  createdAt: string;
  server: string;
}

export function getHistory(): HistoryEntry[] {
  if (!existsSync(HISTORY_FILE)) return [];
  try {
    const data = JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]): void {
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2), { mode: 0o600 });
}

export function addToHistory(entry: HistoryEntry): void {
  const history = getHistory();
  // Remove existing entry with same id if present
  const filtered = history.filter(h => h.id !== entry.id);
  // Prepend new entry
  filtered.unshift(entry);
  // Trim to max
  saveHistory(filtered.slice(0, MAX_ENTRIES));
}

export function findInHistory(id: string): HistoryEntry | undefined {
  return getHistory().find(h => h.id === id);
}

export function removeFromHistory(id: string): void {
  const history = getHistory();
  saveHistory(history.filter(h => h.id !== id));
}
