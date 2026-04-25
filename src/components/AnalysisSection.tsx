"use client";

import { useState, type ReactNode } from "react";

type Props = {
  title: string;
  count: number;
  emptyMessage: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export default function AnalysisSection({
  title,
  count,
  emptyMessage,
  defaultOpen = true,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-stone-200 py-4">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="text-base font-semibold text-stone-900">
          {title}{" "}
          <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
            {count}
          </span>
        </h3>
        <span className="text-stone-400">{open ? "−" : "+"}</span>
      </button>

      {open ? (
        <div className="mt-3">
          {count === 0 ? (
            <p className="text-sm text-stone-500">{emptyMessage}</p>
          ) : (
            children
          )}
        </div>
      ) : null}
    </section>
  );
}
