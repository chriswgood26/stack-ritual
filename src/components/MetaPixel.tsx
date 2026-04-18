"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Pixel is only rendered on public/marketing routes — never inside the
// authenticated app or admin. Acquisition conversion data isn't useful past
// signup, and it keeps the logged-in experience off Meta's pipeline.
const PUBLIC_PREFIXES = [
  "/affiliate-program",
  "/disclaimer",
  "/done",
  "/faq",
  "/help",
  "/privacy",
  "/share",
  "/sign-in",
  "/sign-up",
  "/sign-up-complete",
  "/sms",
  "/terms",
  "/unsubscribe",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export default function MetaPixel() {
  const pathname = usePathname();
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  // Fire PageView on every client-side route change within public paths.
  // The initial load's PageView is fired by the inline snippet below.
  useEffect(() => {
    if (!pixelId) return;
    if (!isPublicPath(pathname)) return;
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("track", "PageView");
    }
  }, [pathname, pixelId]);

  if (!pixelId) return null;
  if (!isPublicPath(pathname)) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      {/* No-script fallback so the pixel still counts a page view for users
          with JS disabled (rare, but Meta's install instructions include it). */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
