"use client";

import { useState } from "react";
import Link from "next/link";

interface Experience {
  id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string;
  duration_weeks: number | null;
  created_at: string;
  helpful_count: number;
  supplement: { name: string; slug: string; icon: string } | { name: string; slug: string; icon: string }[] | null;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={i <= rating ? "text-amber-400 text-sm" : "text-stone-200 text-sm"}>★</span>
      ))}
    </div>
  );
}

function DurationBadge({ weeks }: { weeks: number | null }) {
  if (!weeks) return null;
  const label = weeks < 4 ? `${weeks}w` : weeks < 52 ? `${Math.round(weeks/4)}mo` : `${Math.round(weeks/52)}yr`;
  return <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">{label}</span>;
}

export default function ExperiencesFeed({ experiences, currentUserId }: {
  experiences: Experience[];
  currentUserId?: string;
}) {
  const [filter, setFilter] = useState<"all" | "mine">("all");

  const filtered = filter === "mine"
    ? experiences.filter(e => e.user_id === currentUserId)
    : experiences;

  const myCount = experiences.filter(e => e.user_id === currentUserId).length;

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-emerald-700 text-white"
              : "bg-white border border-stone-200 text-stone-600 hover:border-emerald-300"
          }`}
        >
          All experiences ({experiences.length})
        </button>
        {currentUserId && (
          <button
            onClick={() => setFilter("mine")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === "mine"
                ? "bg-emerald-700 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:border-emerald-300"
            }`}
          >
            Mine ({myCount})
          </button>
        )}
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center">
          <div className="text-4xl mb-3">⭐</div>
          <p className="font-semibold text-stone-900 mb-1">
            {filter === "mine" ? "No experiences yet" : "No experiences yet"}
          </p>
          <p className="text-stone-500 text-sm">
            {filter === "mine"
              ? "Share your first experience using the + button above!"
              : "Be the first to share!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(exp => {
            const supp = Array.isArray(exp.supplement) ? exp.supplement[0] : exp.supplement;
            const isOwn = exp.user_id === currentUserId;
            return (
              <div key={exp.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${isOwn ? "border-emerald-200" : "border-stone-100"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-base flex-shrink-0">
                      {supp?.icon || "💊"}
                    </div>
                    <div>
                      <div className="font-semibold text-stone-900 text-sm">{supp?.name}</div>
                      <StarRating rating={exp.rating} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwn && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Mine</span>}
                    <DurationBadge weeks={exp.duration_weeks} />
                    <span className="text-xs text-stone-400">
                      {new Date(exp.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>

                {exp.title && <p className="font-semibold text-stone-900 text-sm mb-1">{exp.title}</p>}
                <p className="text-stone-700 text-sm leading-relaxed">{exp.body}</p>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-50">
                  <button className="text-xs text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-1">
                    👍 Helpful ({exp.helpful_count})
                  </button>
                  {supp?.slug && (
                    <Link href={`/dashboard/search/${supp.slug}`}
                      className="text-xs text-emerald-600 font-medium hover:text-emerald-700 transition-colors">
                      View supplement →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
