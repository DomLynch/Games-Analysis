// Licence: GPL-3.0 (donor, ModernUO). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Shape only: a player's heard-line window, copied into a report at filing time, attached only to harassment reports.
export const WINDOW_MS = 20 * 60 * 1000; // data: retention window (donor EntryDuration 20 min)

export interface HeardLine { speakerId: string; text: string; atMs: number; }

export class HeardWindow {
  private lines: HeardLine[] = [];

  add(line: HeardLine): void {
    this.lines.push(line);
    this.prune(line.atMs);
  }

  // Fix for the donor defect: prune before any read, so a copy never carries lines older than the window.
  snapshot(nowMs: number): HeardLine[] {
    this.prune(nowMs);
    return this.lines.slice();
  }

  private prune(nowMs: number): void {
    while (this.lines.length > 0 && nowMs - this.lines[0].atMs > WINDOW_MS) {
      this.lines.shift();
    }
  }
}

export type ReportKind = 'verbal-harassment' | 'physical-harassment' | 'bug' | 'stuck' | 'other';

export interface Report {
  reporterId: string;
  kind: ReportKind;
  note: string;
  evidence: HeardLine[] | null;
  atMs: number;
}

const openByReporter = new Map<string, Report>();

// One open report per reporter. Evidence is attached only for harassment kinds that need it.
export function fileReport(
  reporterId: string, kind: ReportKind, note: string, heard: HeardWindow, nowMs: number
): Report | 'already-open' {
  if (openByReporter.has(reporterId)) {
    return 'already-open';
  }

  const evidence = kind === 'verbal-harassment' ? heard.snapshot(nowMs) : null;
  const report: Report = { reporterId, kind, note, evidence, atMs: nowMs };
  openByReporter.set(reporterId, report);
  return report;
}

export {};
