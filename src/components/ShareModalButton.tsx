"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Props {
  isPayingPro: boolean;
}

type ReferralData = {
  code: string;
  referralLink: string;
  totalReferred: number;
  totalCredited: number;
  creditsRemaining: number;
  maxCredits: number;
};

const SHARE_URL = "https://stackritual.com";
const SHARE_TEXT =
  "I've been using Stack Ritual to track my supplements and optimize my health routine. Check it out!";

export default function ShareModalButton({ isPayingPro }: Props) {
  const [open, setOpen] = useState(false);
  const [plainCopied, setPlainCopied] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-between px-4 py-4 w-full hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🔗</span>
          <div className="text-left">
            <span className="font-medium text-stone-900 text-sm block">Share Stack Ritual</span>
            <span className="text-xs text-stone-400">Invite a friend, refer for credits, or earn as an affiliate</span>
          </div>
        </div>
        <span className="text-stone-300">›</span>
      </button>

      {open && (
        <ShareModal
          isPayingPro={isPayingPro}
          plainCopied={plainCopied}
          onPlainCopied={setPlainCopied}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ShareModal({
  isPayingPro,
  plainCopied,
  onPlainCopied,
  onClose,
}: {
  isPayingPro: boolean;
  plainCopied: boolean;
  onPlainCopied: (v: boolean) => void;
  onClose: () => void;
}) {
  async function handlePlainShare() {
    const shareData = {
      title: "Stack Ritual",
      text: SHARE_TEXT,
      url: SHARE_URL,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      onPlainCopied(true);
      setTimeout(() => onPlainCopied(false), 2500);
    } catch {
      prompt("Copy this link to share Stack Ritual:", SHARE_URL);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 pb-8">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-stone-900 text-lg">Share Stack Ritual</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-stone-400 hover:text-stone-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Option 1: Plain share with a friend */}
        <button
          onClick={handlePlainShare}
          className="w-full bg-white border border-stone-200 rounded-xl p-4 text-left hover:border-emerald-300 transition-colors"
        >
          <div className="flex items-start gap-3">
            <span className="text-xl">🔗</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-stone-900 text-sm">Share with a friend</div>
              <p className="text-xs text-stone-500 mt-0.5">
                {plainCopied ? "✓ Link copied!" : "Open your device's share sheet or copy a link to Stack Ritual."}
              </p>
            </div>
          </div>
        </button>

        {/* Option 2: Referral program — paying Pro only */}
        <ReferralOption isPayingPro={isPayingPro} onClose={onClose} />

        {/* Option 3: Affiliate program */}
        <Link
          href="/affiliate-program"
          onClick={onClose}
          className="block bg-white border border-stone-200 rounded-xl p-4 hover:border-emerald-300 transition-colors"
        >
          <div className="flex items-start gap-3">
            <span className="text-xl">💰</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-stone-900 text-sm">Become an affiliate</div>
              <p className="text-xs text-stone-500 mt-0.5">
                Earn 50% on the first month and 10% recurring for every subscriber you bring on.
              </p>
            </div>
            <span className="text-stone-300">›</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

function ReferralOption({ isPayingPro, onClose }: { isPayingPro: boolean; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(false);
  const [friendEmail, setFriendEmail] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!expanded || data || loading) return;
    setLoading(true);
    fetch("/api/referrals")
      .then(r => r.json())
      .then((d: ReferralData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [expanded, data, loading]);

  if (!isPayingPro) {
    return (
      <div className="w-full bg-stone-50 border border-stone-200 rounded-xl p-4 opacity-75">
        <div className="flex items-start gap-3">
          <span className="text-xl grayscale">🎁</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-500 text-sm">Refer &amp; Earn Pro credits</span>
              <span className="text-[10px] uppercase tracking-wide bg-stone-200 text-stone-500 px-1.5 py-0.5 rounded font-semibold">Paying Pro</span>
            </div>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Referral credits are only available on paid Pro subscriptions. Your comped plan is free for life — use &ldquo;Share with a friend&rdquo; instead to evangelize, or{" "}
              <Link href="/affiliate-program" onClick={onClose} className="text-emerald-700 font-medium hover:underline">
                check out our affiliate program
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full bg-white border border-stone-200 rounded-xl p-4 text-left hover:border-emerald-300 transition-colors"
      >
        <div className="flex items-start gap-3">
          <span className="text-xl">🎁</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-900 text-sm">Refer &amp; Earn Pro credits</span>
              <span className="text-[10px] uppercase tracking-wide bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">Pro</span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Send your link to a friend. When they join Pro, you get a free month (up to 6).
            </p>
          </div>
          <span className="text-stone-300">›</span>
        </div>
      </button>
    );
  }

  async function copyLink() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.referralLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      prompt("Copy your referral link:", data.referralLink);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!friendEmail.trim()) return;
    setSending(true);
    setStatus("idle");
    setErrorMsg("");
    try {
      const res = await fetch("/api/referrals/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: friendEmail.trim(), note: note.trim() || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(body.error || "Something went wrong.");
      } else {
        setStatus("sent");
        setFriendEmail("");
        setNote("");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="w-full bg-white border border-emerald-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-xl">🎁</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-900 text-sm">Refer &amp; Earn Pro credits</span>
            <span className="text-[10px] uppercase tracking-wide bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">Pro</span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Send your link to a friend. When they join Pro, you get a free month (up to 6).
          </p>
        </div>
      </div>

      {loading && <p className="text-xs text-stone-400">Loading your referral link…</p>}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-stone-50 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-stone-900">{data.totalReferred}</div>
              <div className="text-[10px] text-stone-500">Referred</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-emerald-700">{data.totalCredited}</div>
              <div className="text-[10px] text-stone-500">Credited</div>
            </div>
            <div className="bg-stone-50 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-stone-900">{data.creditsRemaining}</div>
              <div className="text-[10px] text-stone-500">Remaining</div>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={data.referralLink}
              className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-600 truncate"
            />
            <button
              onClick={copyLink}
              className="bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap"
            >
              {linkCopied ? "Copied!" : "Copy"}
            </button>
          </div>

          <form onSubmit={handleSend} className="space-y-2">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide">
              Email a friend directly
            </label>
            <input
              type="email"
              required
              value={friendEmail}
              onChange={e => setFriendEmail(e.target.value)}
              placeholder="friend@example.com"
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <textarea
              value={note}
              onChange={e => setNote(e.target.value.slice(0, 500))}
              placeholder="Add a personal note (optional)"
              rows={2}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
            <button
              type="submit"
              disabled={sending || !friendEmail.trim()}
              className="w-full bg-emerald-700 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send invite"}
            </button>
            {status === "sent" && (
              <p className="text-xs text-emerald-700 font-medium">✓ Invite sent!</p>
            )}
            {status === "error" && (
              <p className="text-xs text-red-600">{errorMsg}</p>
            )}
          </form>
        </>
      )}
    </div>
  );
}
