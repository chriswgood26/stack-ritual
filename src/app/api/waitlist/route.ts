import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const WAITLIST_FILE = path.join(process.cwd(), "data", "waitlist.json");

function ensureDataDir() {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(WAITLIST_FILE)) fs.writeFileSync(WAITLIST_FILE, "[]");
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    ensureDataDir();
    const existing = JSON.parse(fs.readFileSync(WAITLIST_FILE, "utf-8"));

    if (existing.find((e: { email: string }) => e.email === email)) {
      return NextResponse.json({ message: "already_subscribed" }, { status: 200 });
    }

    existing.push({ email, joinedAt: new Date().toISOString() });
    fs.writeFileSync(WAITLIST_FILE, JSON.stringify(existing, null, 2));

    return NextResponse.json({ message: "success" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    ensureDataDir();
    const existing = JSON.parse(fs.readFileSync(WAITLIST_FILE, "utf-8"));
    return NextResponse.json({ count: existing.length, emails: existing });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
