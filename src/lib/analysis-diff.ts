import type { ChangesSummary, StackSnapshotItem } from "./analysis-types";

/**
 * Build a key for a stack item. Prefers supplement_id; falls back to a
 * normalized name for user-submitted/freehand entries.
 */
function itemKey(item: StackSnapshotItem): string {
  if (item.supplement_id) return `id:${item.supplement_id}`;
  return `name:${item.name.trim().toLowerCase()}`;
}

function isModified(a: StackSnapshotItem, b: StackSnapshotItem): boolean {
  return (
    (a.dose ?? "") !== (b.dose ?? "") ||
    (a.timing ?? "") !== (b.timing ?? "") ||
    (a.frequency ?? "") !== (b.frequency ?? "") ||
    (a.brand ?? "") !== (b.brand ?? "")
  );
}

export function diffSnapshot(
  snapshot: StackSnapshotItem[],
  current: StackSnapshotItem[],
): ChangesSummary {
  const snapByKey = new Map(snapshot.map(i => [itemKey(i), i]));
  const curByKey = new Map(current.map(i => [itemKey(i), i]));

  let added = 0;
  let removed = 0;
  let modified = 0;

  for (const [key, cur] of curByKey) {
    const prev = snapByKey.get(key);
    if (!prev) {
      added += 1;
    } else if (isModified(prev, cur)) {
      modified += 1;
    }
  }
  for (const key of snapByKey.keys()) {
    if (!curByKey.has(key)) removed += 1;
  }

  return { added, removed, modified };
}

export function changesSummaryHasChanges(c: ChangesSummary): boolean {
  return c.added + c.removed + c.modified > 0;
}
