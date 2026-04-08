// Tiny shared store so the My Stack search bar can hand its current query
// off to the Add-to-my-stack panel when it opens. Module-level singleton in
// the client bundle — both components import from this same module instance.

let current = "";
const listeners = new Set<(q: string) => void>();

export function setStackQuery(q: string) {
  current = q;
  listeners.forEach(fn => fn(q));
}

export function getStackQuery() {
  return current;
}

export function subscribeStackQuery(fn: (q: string) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
