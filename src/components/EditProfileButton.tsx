"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EditProfileButton({ inCard = false }: { inCard?: boolean }) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  async function handleSave() {
    if (!user) return;
    setLoading(true);
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() });
      setSaved(true);
      setTimeout(() => {
        setOpen(false);
        setSaved(false);
        router.refresh();
      }, 1000);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={inCard
          ? "flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm w-full"
          : "flex items-center justify-between px-4 py-4 w-full hover:bg-stone-50 transition-colors"
        }
      >
        {inCard ? (
          <><span>✏️</span><span className="font-medium">Edit profile name</span></>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="text-xl">✏️</span>
              <span className="font-medium text-stone-900 text-sm">Edit profile name</span>
            </div>
            <span className="text-stone-300">›</span>
          </>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4 pb-8">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-stone-900">Edit your name</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-700 text-xl">✕</button>
            </div>

            {saved ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">✅</div>
                <p className="font-semibold text-emerald-700">Name updated!</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">First name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1.5">Last name (optional)</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setOpen(false)}
                    className="flex-1 border border-stone-200 text-stone-600 py-3 rounded-xl font-medium text-sm hover:bg-stone-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={!firstName.trim() || loading}
                    className="flex-1 bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-800 transition-colors disabled:opacity-60">
                    {loading ? "Saving..." : "Save"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
