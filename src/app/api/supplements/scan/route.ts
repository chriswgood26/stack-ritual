import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check subscription — Pro required
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .single();

  if (!sub || sub.plan !== "pro" || sub.status !== "active") {
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
