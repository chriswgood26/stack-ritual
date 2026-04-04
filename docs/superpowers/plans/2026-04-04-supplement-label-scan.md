# Supplement Label Scan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a label scanning feature that uses the phone camera + Claude Vision to extract supplement details and auto-fill the add-to-stack flow.

**Architecture:** A `ScanLabelButton` component captures an image via camera (mobile) or file picker (desktop), sends it as base64 to `POST /api/supplements/scan`, which calls Claude Vision for structured extraction, searches the supplement DB for matches, and returns results. A `ScanResultsModal` lets the user review, edit, and add the scanned supplement — either as a single item or broken into individual ingredients.

**Tech Stack:** Anthropic SDK (`@anthropic-ai/sdk`), Claude `claude-sonnet-4-6` for vision, React components, existing Supabase stack/supplement endpoints

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/components/ScanLabelButton.tsx` | Camera/file input, base64 conversion, loading state, device detection |
| `src/components/ScanResultsModal.tsx` | Display extracted data, edit fields, single vs breakout mode, add to stack |
| `src/app/api/supplements/scan/route.ts` | Auth + subscription check, Claude Vision call, DB match lookup, structured response |
| `src/app/dashboard/stack/page.tsx` | Add ScanLabelButton to stack page (modify) |
| `src/components/AddCustomSupplement.tsx` | Add ScanLabelButton inside add flow (modify) |

---

### Task 1: Install Anthropic SDK and add env var

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the Anthropic SDK**

Run:
```bash
cd ~/projects/stack-ritual && npm install @anthropic-ai/sdk
```

- [ ] **Step 2: Add ANTHROPIC_API_KEY to .env.local**

Add to `~/projects/stack-ritual/.env.local`:
```
ANTHROPIC_API_KEY=<your-api-key-from-console.anthropic.com>
```

- [ ] **Step 3: Add ANTHROPIC_API_KEY to Vercel**

Run:
```bash
cd ~/projects/stack-ritual
printf '<your-api-key>' | vercel env add ANTHROPIC_API_KEY production --yes
printf '<your-api-key>' | vercel env add ANTHROPIC_API_KEY development --yes
```

- [ ] **Step 4: Verify SDK loads**

Run:
```bash
cd ~/projects/stack-ritual && node -e "const { default: Anthropic } = require('@anthropic-ai/sdk'); console.log('SDK loaded');"
```
Expected: `SDK loaded`

- [ ] **Step 5: Commit**

```bash
cd ~/projects/stack-ritual && git add package.json package-lock.json && git commit -m "chore: install @anthropic-ai/sdk for label scanning"
```

---

### Task 2: Create the scan API route

**Files:**
- Create: `src/app/api/supplements/scan/route.ts`

- [ ] **Step 1: Create the scan route**

```typescript
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check subscription — Plus or Pro required
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .single();

  if (!sub || !["plus", "pro"].includes(sub.plan) || sub.status !== "active") {
    return NextResponse.json({ error: "subscription_required" }, { status: 403 });
  }

  const body = await req.json();
  const { image } = body;

  if (!image) {
    return NextResponse.json({ error: "image required" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not configured");
    return NextResponse.json({ error: "Scan service not configured" }, { status: 503 });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Strip data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const mediaType = image.startsWith("data:image/png") ? "image/png" : "image/jpeg";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64Data },
            },
            {
              type: "text",
              text: `Analyze this supplement label image. Extract the following information and return ONLY valid JSON (no markdown, no code fences):

{
  "productName": "full product name",
  "brand": "manufacturer/brand name",
  "dosePerServing": "dose per serving e.g. '500mg' or '2 capsules'",
  "servingSize": "serving size description",
  "totalQuantity": number of servings or units in container (number only),
  "quantityUnit": "capsules" or "tablets" or "softgels" or "ml" etc,
  "category": one of "vitamins", "minerals", "nootropics", "adaptogens", "longevity", "sleep", "gut-health", "hormones", "amino-acids", "herbs", "phytonutrients", "other",
  "confidence": "high" or "medium" or "low",
  "ingredients": [
    { "name": "ingredient name", "amount": "amount per serving e.g. '500mg'" }
  ]
}

If this is not a supplement label, return: { "error": "not_supplement_label" }
If parts are unreadable, still return what you can and set confidence to "low".
Return ONLY the JSON object, nothing else.`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    let scanResult: Record<string, unknown>;
    try {
      scanResult = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "image_unreadable" }, { status: 422 });
    }

    if (scanResult.error === "not_supplement_label") {
      return NextResponse.json({ error: "not_supplement_label" }, { status: 422 });
    }

    // Search for match in official supplement DB
    const productName = (scanResult.productName as string) || "";
    let matchedSupplement = null;
    if (productName) {
      const searchTerms = productName.toLowerCase().split(/\s+/).slice(0, 3).join(" ");
      const { data: match } = await supabaseAdmin
        .from("supplements")
        .select("id, name, slug")
        .ilike("name", `%${searchTerms}%`)
        .limit(1)
        .single();
      if (match) matchedSupplement = match;
    }

    return NextResponse.json({ ...scanResult, matchedSupplement });
  } catch (e) {
    console.error("Scan error:", e);
    return NextResponse.json({ error: "scan_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd ~/projects/stack-ritual && npx tsc --noEmit 2>&1 | grep scan`
Expected: No errors related to the scan route.

- [ ] **Step 3: Commit**

```bash
cd ~/projects/stack-ritual && git add src/app/api/supplements/scan/route.ts && git commit -m "feat: add /api/supplements/scan route with Claude Vision"
```

---

### Task 3: Create ScanLabelButton component

**Files:**
- Create: `src/components/ScanLabelButton.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { useState, useRef } from "react";

export interface ScanResult {
  productName: string;
  brand: string;
  dosePerServing: string;
  servingSize: string;
  totalQuantity: number;
  quantityUnit: string;
  category: string;
  confidence: "high" | "medium" | "low";
  ingredients: { name: string; amount: string }[];
  matchedSupplement: { id: string; name: string; slug: string } | null;
}

interface Props {
  onScanComplete: (data: ScanResult) => void;
  onError: (message: string) => void;
  isPlusOrPro: boolean;
  onUpgradePrompt?: () => void;
  className?: string;
  variant?: "button" | "link";
}

export default function ScanLabelButton({ onScanComplete, onError, isPlusOrPro, onUpgradePrompt, className = "", variant = "button" }: Props) {
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  async function handleFile(file: File) {
    setScanning(true);
    try {
      // Convert to base64
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const dataUrl = `data:${file.type};base64,${base64}`;

      const res = await fetch("/api/supplements/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ image: dataUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "subscription_required") {
          onUpgradePrompt?.();
          return;
        }
        if (data.error === "not_supplement_label") {
          onError("This doesn't appear to be a supplement label. Try again.");
          return;
        }
        if (data.error === "image_unreadable") {
          onError("Couldn't read the label. Try a clearer photo.");
          return;
        }
        onError("Scan failed. Please try again.");
        return;
      }

      onScanComplete(data as ScanResult);
    } catch {
      onError("Scan failed. Please try again.");
    } finally {
      setScanning(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleClick() {
    if (!isPlusOrPro) {
      onUpgradePrompt?.();
      return;
    }
    inputRef.current?.click();
  }

  const baseStyles = variant === "button"
    ? "bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-800 transition-colors inline-flex items-center gap-2"
    : "text-emerald-700 text-sm font-medium hover:text-emerald-800 transition-colors inline-flex items-center gap-1.5";

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={isMobile ? "environment" : undefined}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button onClick={handleClick} disabled={scanning} className={`${baseStyles} ${className} ${scanning ? "opacity-60 cursor-wait" : ""}`}>
        {scanning ? (
          <>
            <span className="animate-spin">⏳</span>
            Scanning...
          </>
        ) : (
          <>
            📷 {variant === "button" ? "Scan Label" : "Scan a label"}
          </>
        )}
      </button>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd ~/projects/stack-ritual && npx tsc --noEmit 2>&1 | grep -i scan`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd ~/projects/stack-ritual && git add src/components/ScanLabelButton.tsx && git commit -m "feat: add ScanLabelButton component with camera/file input"
```

---

### Task 4: Create ScanResultsModal component

**Files:**
- Create: `src/components/ScanResultsModal.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ScanResult } from "./ScanLabelButton";

interface Props {
  data: ScanResult;
  onClose: () => void;
}

export default function ScanResultsModal({ data, onClose }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"single" | "breakout">("single");
  const [productName, setProductName] = useState(data.productName || "");
  const [brand, setBrand] = useState(data.brand || "");
  const [dose, setDose] = useState(data.dosePerServing || "");
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(
    () => new Set(data.ingredients.map((_, i) => i))
  );
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  function toggleIngredient(index: number) {
    setSelectedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function addSingle() {
    setAdding(true);
    setError("");
    try {
      if (data.matchedSupplement) {
        // Add official supplement
        const res = await fetch("/api/stack/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            supplement_id: data.matchedSupplement.id,
            dose,
            brand,
          }),
        });
        const result = await res.json();
        if (result.message === "already_in_stack") {
          setError("This supplement is already in your stack.");
          setAdding(false);
          return;
        }
      } else {
        // Submit as custom supplement
        await fetch("/api/supplements/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: productName,
            category: data.category || "other",
            dose,
            brand,
            icon: "💊",
          }),
        });
      }

      // Update quantity if extracted
      if (data.totalQuantity && data.quantityUnit) {
        // Quantity will be set after stack item is created — handled by a follow-up update
        // The stack page will refresh and show the new item
      }

      router.refresh();
      onClose();
    } catch {
      setError("Failed to add. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function addBreakout() {
    setAdding(true);
    setError("");
    try {
      const selected = data.ingredients.filter((_, i) => selectedIngredients.has(i));
      for (const ing of selected) {
        await fetch("/api/supplements/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: ing.name,
            category: data.category || "vitamins",
            dose: ing.amount,
            brand,
            icon: "💊",
          }),
        });
      }
      router.refresh();
      onClose();
    } catch {
      setError("Failed to add some supplements. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  const inputClass = "w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-bold text-stone-900">Scanned Supplement</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg">✕</button>
        </div>

        {data.confidence === "low" && (
          <div className="mx-5 mt-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-3 py-2">
            ⚠️ Some fields couldn't be read clearly. Please review and correct.
          </div>
        )}

        <div className="p-5 space-y-3">
          {data.matchedSupplement && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl px-3 py-2">
              ✓ Matched to our database: <strong>{data.matchedSupplement.name}</strong>
            </div>
          )}

          <div>
            <label className="text-xs text-stone-500 mb-1 block">Product Name</label>
            <input value={productName} onChange={e => setProductName(e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Brand</label>
              <input value={brand} onChange={e => setBrand(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Dose per serving</label>
              <input value={dose} onChange={e => setDose(e.target.value)} className={inputClass} />
            </div>
          </div>
          {data.totalQuantity > 0 && (
            <div className="text-xs text-stone-500">
              📦 {data.totalQuantity} {data.quantityUnit} in container
            </div>
          )}

          {/* Mode toggle */}
          {data.ingredients.length > 1 && (
            <div className="pt-2 border-t border-stone-100">
              <div className="flex gap-2">
                <button onClick={() => setMode("single")}
                  className={`flex-1 text-xs py-2 rounded-xl font-medium transition-colors ${mode === "single" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-500"}`}>
                  Add as one supplement
                </button>
                <button onClick={() => setMode("breakout")}
                  className={`flex-1 text-xs py-2 rounded-xl font-medium transition-colors ${mode === "breakout" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-500"}`}>
                  Break into {data.ingredients.length} items
                </button>
              </div>
            </div>
          )}

          {/* Breakout ingredient list */}
          {mode === "breakout" && data.ingredients.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {data.ingredients.map((ing, i) => (
                <label key={i} className="flex items-center gap-2.5 px-3 py-2 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100">
                  <input type="checkbox" checked={selectedIngredients.has(i)} onChange={() => toggleIngredient(i)}
                    className="w-4 h-4 accent-emerald-600 rounded" />
                  <span className="text-sm text-stone-800 flex-1">{ing.name}</span>
                  <span className="text-xs text-stone-500">{ing.amount}</span>
                </label>
              ))}
            </div>
          )}

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button
            onClick={mode === "single" ? addSingle : addBreakout}
            disabled={adding || (mode === "breakout" && selectedIngredients.size === 0)}
            className="w-full bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-800 transition-colors disabled:opacity-50">
            {adding ? "Adding..." : mode === "single" ? "Add to my stack" : `Add ${selectedIngredients.size} supplements to stack`}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd ~/projects/stack-ritual && npx tsc --noEmit 2>&1 | grep -i scan`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd ~/projects/stack-ritual && git add src/components/ScanResultsModal.tsx && git commit -m "feat: add ScanResultsModal for reviewing scanned supplement data"
```

---

### Task 5: Add ScanLabelButton to the stack page

**Files:**
- Modify: `src/app/dashboard/stack/page.tsx`

- [ ] **Step 1: Create a client wrapper component for the scan flow on the stack page**

Since `stack/page.tsx` is a server component, create a small client component that manages the scan state:

Create `src/components/StackScanButton.tsx`:

```typescript
"use client";

import { useState } from "react";
import ScanLabelButton from "./ScanLabelButton";
import ScanResultsModal from "./ScanResultsModal";
import type { ScanResult } from "./ScanLabelButton";

export default function StackScanButton({ isPlusOrPro }: { isPlusOrPro: boolean }) {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <>
      <ScanLabelButton
        isPlusOrPro={isPlusOrPro}
        onScanComplete={data => { setError(""); setScanResult(data); }}
        onError={msg => { setError(msg); setTimeout(() => setError(""), 5000); }}
        onUpgradePrompt={() => setShowUpgrade(true)}
        className="flex-1 bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium py-2.5 rounded-xl text-center"
      />
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm shadow-lg">
          {error}
        </div>
      )}
      {scanResult && <ScanResultsModal data={scanResult} onClose={() => setScanResult(null)} />}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowUpgrade(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm text-center" onClick={e => e.stopPropagation()}>
            <div className="text-3xl mb-3">📷</div>
            <h3 className="font-bold text-stone-900 mb-2">Label Scanning</h3>
            <p className="text-sm text-stone-500 mb-4">Scan supplement labels with your camera to auto-fill your stack. Available on Plus and Pro plans.</p>
            <a href="/dashboard/profile" className="bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-800 transition-colors inline-block">
              Upgrade now
            </a>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Add StackScanButton to the stack page**

In `src/app/dashboard/stack/page.tsx`, add the import at the top:

```typescript
import StackScanButton from "@/components/StackScanButton";
```

Then find the stats card section (around line 58-67) where the action buttons are. Add the scan button after the existing buttons. Change the `<div className="flex gap-2">` section to:

```typescript
          <div className="flex gap-2">
            <Link href="/dashboard/print"
              className="flex-1 bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium py-2.5 rounded-xl text-center">
              🖨️ Print summary
            </Link>
            <Link href="/dashboard/search"
              className="flex-1 bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium py-2.5 rounded-xl text-center">
              + Add to My Stack
            </Link>
            <StackScanButton isPlusOrPro={isPlusOrPro} />
          </div>
```

Also need to check the user's subscription. Before the return statement in the server component, add:

```typescript
  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .single();
  const isPlusOrPro = subscription?.status === "active" && ["plus", "pro"].includes(subscription?.plan || "");
```

- [ ] **Step 3: Verify build**

Run: `cd ~/projects/stack-ritual && npx tsc --noEmit 2>&1 | head -5`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd ~/projects/stack-ritual && git add src/components/StackScanButton.tsx src/app/dashboard/stack/page.tsx && git commit -m "feat: add scan label button to stack page"
```

---

### Task 6: Add ScanLabelButton to the add supplement flow

**Files:**
- Modify: `src/components/AddCustomSupplement.tsx`

- [ ] **Step 1: Add scan option to the AddCustomSupplement component**

At the top of `src/components/AddCustomSupplement.tsx`, add imports:

```typescript
import ScanLabelButton from "./ScanLabelButton";
import ScanResultsModal from "./ScanResultsModal";
import type { ScanResult } from "./ScanLabelButton";
```

Inside the component function, add state for scan results (after the existing state declarations):

```typescript
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState("");
```

Find the search input section (Step 1 of the form). Add the scan option right above the search input:

```typescript
            <div className="flex items-center gap-3 mb-3">
              <ScanLabelButton
                isPlusOrPro={true}
                onScanComplete={data => { setScanError(""); setScanResult(data); }}
                onError={msg => { setScanError(msg); setTimeout(() => setScanError(""), 5000); }}
                variant="link"
              />
              {scanError && <span className="text-xs text-red-500">{scanError}</span>}
            </div>
```

Right before the closing `</>` of the component's return, add:

```typescript
      {scanResult && <ScanResultsModal data={scanResult} onClose={() => setScanResult(null)} />}
```

- [ ] **Step 2: Verify build**

Run: `cd ~/projects/stack-ritual && npx tsc --noEmit 2>&1 | head -5`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd ~/projects/stack-ritual && git add src/components/AddCustomSupplement.tsx && git commit -m "feat: add scan label option to add supplement flow"
```

---

### Task 7: Build verification and deploy

- [ ] **Step 1: Run full build**

Run: `cd ~/projects/stack-ritual && npm run build 2>&1 | tail -15`
Expected: Build completes successfully (may show pre-existing Supabase env var warning).

- [ ] **Step 2: Test locally** (optional)

Run: `cd ~/projects/stack-ritual && npm run dev`
- Open `http://localhost:3000/dashboard/stack`
- Verify "📷 Scan Label" button appears in the stats card
- Verify clicking it opens camera/file picker
- Take a photo of a supplement bottle
- Verify ScanResultsModal appears with extracted data

- [ ] **Step 3: Deploy**

Run: `cd ~/projects/stack-ritual && vercel --prod 2>&1 | tail -5`
Expected: Successful deployment.

- [ ] **Step 4: Commit any remaining changes**

```bash
cd ~/projects/stack-ritual && git add -A && git commit -m "feat: supplement label scanning with Claude Vision"
```
