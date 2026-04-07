import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import TimezoneProvider from "@/components/TimezoneProvider";
import PageTracker from "@/components/PageTracker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Stack Ritual — Stack your habits. Own your health.",
  description: "Build consistent supplement and wellness habits with smart scheduling, daily check-offs, streak tracking, and doctor-ready summaries.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: [
      { url: "/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
    other: [
      { rel: "apple-touch-icon", url: "/apple-touch-icon.svg" },
    ],
  },
  other: {
    "impact-site-verification": "359487ab-3ea9-426b-b73b-e654d683f27c",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <TimezoneProvider />
          <PageTracker />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
