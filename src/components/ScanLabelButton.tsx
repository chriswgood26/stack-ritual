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
