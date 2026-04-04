# Supplement Label Scan Feature

**Date:** 2026-04-04
**Status:** Approved

## Summary

Add the ability for Plus and Pro users to scan a supplement bottle label with their phone camera (or upload a photo on desktop), extract product details via Claude Vision API, and auto-fill the "Add to Stack" flow. Users can add the scanned product as a single stack item or break it out into individual ingredient stack items.

## Architecture

1. User taps "Scan Label" button (available on stack page and within add flow)
2. On mobile: camera opens directly. On desktop: file picker opens.
3. Captured image sent as base64 to `POST /api/supplements/scan`
4. Route validates auth + Plus/Pro subscription, then calls Claude Vision API with structured extraction prompt
5. Claude returns structured JSON with product name, brand, dose, serving size, quantity, and individual ingredients
6. Client receives response and shows `ScanResultsModal` for user review
7. System searches official supplement DB for a match on product name
8. If matched → pre-fills existing "Add to Stack" modal with dose, brand, quantity
9. If no match → pre-fills custom supplement form with extracted data
10. If user chooses "Break into individual supplements" → checklist of ingredients, each selected one added as a separate stack item
11. Image is never stored — processed in memory and discarded

## Subscription Gating

- **Free tier:** Scan button visible but disabled with upgrade prompt
- **Plus and Pro:** Full access to scan feature

## Components

### 1. ScanLabelButton

Reusable component used in two locations:
- `/dashboard/stack` page — as a prominent button alongside existing add options
- Inside the add supplement flow — as an option next to the search bar

Behavior:
- Detects mobile vs desktop
- Mobile: renders `<input type="file" accept="image/*" capture="environment">` (opens camera)
- Desktop: renders `<input type="file" accept="image/*">` (file picker)
- Shows loading spinner while API processes
- Calls `onScanComplete(data)` callback with extracted data
- Calls `onError(message)` callback on failure

### 2. ScanResultsModal

Displays extracted supplement data for user review before adding to stack.

**Default view (single supplement):**
- Product name (editable)
- Brand (editable)
- Dose per serving (editable)
- Serving size
- Total quantity + unit (for inventory tracking)
- "Add to my stack" button → calls existing add flow
- "Break into individual supplements" toggle

**Breakout view (individual ingredients):**
- Checklist of extracted ingredients with name and amount
- All checked by default
- User unchecks any they don't want
- "Add selected (X) to my stack" button → adds each as separate stack item

### 3. POST /api/supplements/scan

**Auth:** Clerk auth required, Plus or Pro subscription required.

**Request:** `{ image: string }` (base64-encoded image data)

**Claude Vision prompt:** Structured prompt requesting JSON output with:
- productName, brand, dosePerServing, servingSize, totalQuantity, quantityUnit, category
- ingredients array: `[{ name, amount }]`
- confidence: "high" | "medium" | "low"

**Response:**
```json
{
  "productName": "Garden of Life Vitamin Code Men",
  "brand": "Garden of Life",
  "dosePerServing": "2 capsules",
  "servingSize": "2 capsules",
  "totalQuantity": 120,
  "quantityUnit": "capsules",
  "category": "vitamins",
  "confidence": "high",
  "ingredients": [
    { "name": "Vitamin A", "amount": "4500 IU" },
    { "name": "Vitamin C", "amount": "90 mg" },
    { "name": "Vitamin D3", "amount": "1000 IU" }
  ],
  "matchedSupplement": null | { "id": "uuid", "name": "...", "slug": "..." }
}
```

The route also searches the official supplements DB for a match on productName and returns it in `matchedSupplement` if found.

**Error response:**
```json
{ "error": "not_supplement_label" | "image_unreadable" | "subscription_required" }
```

## Database Changes

None. Scan results feed into existing endpoints:
- `POST /api/stack/add` — for matched official supplements
- `POST /api/supplements/submit` — for unmatched custom supplements

Inventory fields (`quantity_total`, `quantity_remaining`, `quantity_unit`) are populated from the scan's `totalQuantity`, `quantityUnit` values via the existing `POST /api/stack/update` endpoint after the item is added.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Blurry/unreadable image | Claude returns `confidence: "low"` → UI shows warning: "Some fields couldn't be read. Please review and fill in missing info." Modal still opens with partial data. |
| Not a supplement label | API returns `{ error: "not_supplement_label" }` → toast: "This doesn't appear to be a supplement label. Try again." |
| Claude API failure / rate limit | Toast: "Scan failed. Please try again." with retry option. |
| Free tier user taps scan | Upgrade prompt modal with feature description instead of camera. |
| No ingredients extractable | Ingredients array returns empty → "Break into individual supplements" option hidden. |

## UI Placement

**Stack page (`/dashboard/stack`):**
- "Scan Label" button with camera icon, placed next to the existing add supplement button
- Same visual style as other action buttons (emerald theme)

**Add flow:**
- "Scan a label" option shown above or alongside the search input in the add supplement flow
- Styled as an alternative entry point: "📷 Scan a label" link/button

## Claude Vision API

- Uses the Anthropic SDK directly (already a dependency via `@anthropic-ai/sdk` or can use the REST API)
- Model: `claude-sonnet-4-6` (cost-effective for vision tasks, ~$0.01-0.03 per image)
- Image sent as base64 in the `image` content block
- Prompt instructs Claude to return only valid JSON, no markdown wrapping
- Max tokens: 1000 (sufficient for structured extraction)

## Scope

**In scope:**
- Single-photo scan of supplement facts label
- Auto-fill existing add flows
- Single product and breakout-to-ingredients modes
- Inventory quantity extraction

**Out of scope:**
- Multi-photo scanning (front + back of bottle)
- Barcode/UPC scanning
- Automatic reorder link generation from scan
- Scan history / saved scans
