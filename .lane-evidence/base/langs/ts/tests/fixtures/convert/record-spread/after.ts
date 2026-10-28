// record-spread: a write into a record held in a field of a local record becomes a spread rebuild of that record
type Report = { by: Record<string, number>; seen: number };

export function counts(words: string[]): Report {
  const report: Report = { by: {}, seen: 0 };
  for (const w of words) {
    report.by = { ...report.by, [w]: (report.by[w] ?? 0) + 1 };
    report.seen += 1;
  }
  return report;
}
