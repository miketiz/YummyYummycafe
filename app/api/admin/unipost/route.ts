import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Use index signature to allow any response fields from the UniPost API
type UniPostJson = Record<string, unknown>;

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function pickStringArray(...values: unknown[]) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const strings = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      if (strings.length > 0) {
        return strings;
      }
    }

    if (typeof value === "string" && value.trim()) {
      return [value.trim()];
    }
  }

  return [];
}

async function readUniPostJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as UniPostJson;
  } catch {
    return { message: text };
  }
}

function uniPostError(json: UniPostJson, fallback: string) {
  return pickString(json.message, json.error, asRecord(json.error).message) || fallback;
}

async function resolveUniPostAccountId(apiKey: string, baseUrl: string, configuredAccountId: string) {
  const response = await fetch(`${baseUrl}/accounts`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const json = await readUniPostJson(response);
  const accounts = Array.isArray(json.data) ? json.data : [];

  if (configuredAccountId) {
    const configuredMatch = accounts.find((account) => {
      const record = asRecord(account);
      return record.id === configuredAccountId || record.external_account_id === configuredAccountId;
    });

    if (configuredMatch) {
      return String(asRecord(configuredMatch).id || configuredAccountId);
    }
  }

  const activeInstagramAccount = accounts.find((account) => {
    const record = asRecord(account);
    return record.platform === "instagram" && record.status === "active";
  });

  if (activeInstagramAccount) {
    return String(asRecord(activeInstagramAccount).id || "");
  }

  return "";
}

/**
 * Wait for a media item to reach status "uploaded" / "ready" by polling GET /v1/media.
 * Times out after ~15 seconds (5 polls × 3s delay).
 */
async function waitForMediaReady(mediaId: string, authHeaders: Record<string, string>, baseUrl: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise((r) => setTimeout(r, 3000));

    const response = await fetch(`${baseUrl}/media/${encodeURIComponent(mediaId)}`, {
      headers: authHeaders,
    });

    const json = await readUniPostJson(response);

    if (!response.ok) {
      return { ok: false, error: `Failed to fetch media status: ${pickString(json.message, asRecord(json.error).message) || "unknown"}` };
    }

    const data = asRecord(json.data ?? json);
    const status = pickString(data.status, data.state);

    if (status === "uploaded" || status === "ready" || status === "completed") {
      const url = pickString(data.url, data.public_url, data.cdn_url, data.download_url);
      return { ok: true, url: url || "" };
    }

    if (status === "failed" || status === "error") {
      return { ok: false, error: `Media upload failed with status: "${status}"` };
    }
  }

  return { ok: false, error: "Media upload did not complete within the expected time (~15s)" };
}

function formatUniPostErrorResponse(json: UniPostJson): string {
  const parts: string[] = [];

  if (json.message && typeof json.message === "string") {
    parts.push(json.message);
  }

  const error = json.error;
  if (error && typeof error === "object") {
    const errRecord = error as Record<string, unknown>;
    if (errRecord.message && typeof errRecord.message === "string") parts.push(String(errRecord.message));
    if (errRecord.details && typeof errRecord.details === "string") parts.push(String(errRecord.details));

    // Extract nested issues array from error.issues (UniPost validation errors)
    const issues = Array.isArray(errRecord.issues) ? errRecord.issues : [];
    for (const issue of issues) {
      if (issue && typeof issue === "object") {
        const issueRecord = issue as Record<string, unknown>;
        const issueMsg = pickString(issueRecord.message, issueRecord.detail);
        if (issueMsg) parts.push(`• ${issueMsg}`);
      }
    }
  } else if (error && typeof error === "string") {
    parts.push(error);
  }

  // Check for top-level validation_errors / errors arrays
  const validationErrors: unknown =
    (Array.isArray(json.validation_errors) ? json.validation_errors : undefined) ??
    (Array.isArray(json.errors) ? json.errors : undefined);

  if (Array.isArray(validationErrors) && validationErrors.length > 0) {
    for (const ve of validationErrors) {
      if (typeof ve === "string") parts.push(`• ${ve}`);
      else if (ve && typeof ve === "object") {
        const veRecord = ve as Record<string, unknown>;
        if (veRecord.message) parts.push(`• ${veRecord.message}`);
        else parts.push(`• ${JSON.stringify(ve)}`);
      }
    }
  }

  return parts.length > 0 ? parts.join(" | ") : "";
}

export async function POST(request: Request) {
  const apiKey = process.env.UNIPOST_API_KEY;
  const accountId = process.env.UNIPOST_INSTAGRAM_ACCOUNT_ID;
  const configuredAccountId = process.env.UNIPOST_SOCIAL_ACCOUNT_ID || accountId || "";
  const baseUrl = process.env.UNIPOST_API_BASE_URL || "https://api.unipost.dev/v1";

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing UNIPOST_API_KEY in .env.local",
      },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const caption = getString(formData.get("caption"));
  const scheduledAt = getString(formData.get("scheduledAt"));
  const itemName = getString(formData.get("itemName"));
  const style = getString(formData.get("style"));
  const image = formData.get("image");

  if (!caption) {
    return NextResponse.json({ error: "Caption is required" }, { status: 400 });
  }

  if (!(image instanceof File)) {
    return NextResponse.json(
      { error: "Instagram publishing requires an image file" },
      { status: 400 },
    );
  }

  if (image.type !== "image/jpeg") {
    return NextResponse.json(
      { error: "Instagram โพสต์ฟีดรองรับเฉพาะไฟล์ JPG/JPEG เท่านั้น" },
      { status: 400 },
    );
  }

  const authHeaders = {
    Authorization: `Bearer ${apiKey}`,
  };

  const resolvedAccountId = await resolveUniPostAccountId(apiKey, baseUrl, configuredAccountId);

  if (!resolvedAccountId) {
    return NextResponse.json(
      {
        error:
          "No active Instagram account found in UniPost. Please connect an account or set a valid UNIPOST_INSTAGRAM_ACCOUNT_ID.",
      },
      { status: 500 },
    );
  }

  // ── Step 1: Reserve media via /v1/media ──────────────────────
  const reserveResponse = await fetch(`${baseUrl}/media`, {
    method: "POST",
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: image.name || "instagram-post.jpg",
      content_type: image.type || "image/jpeg",
      size_bytes: image.size,
    }),
  });

  const reserveJson = await readUniPostJson(reserveResponse);
  if (!reserveResponse.ok) {
    console.error("[UniPost] Media reserve failed:", JSON.stringify(reserveJson));
    return NextResponse.json(
      { error: uniPostError(reserveJson, "Failed to reserve UniPost media upload") },
      { status: reserveResponse.status },
    );
  }

  const reserveData = asRecord(reserveJson.data);
  const uploadUrl = pickString(
    reserveJson.upload_url,
    reserveJson.uploadUrl,
    reserveData.upload_url,
    reserveData.uploadUrl,
  );
  const mediaIds = pickStringArray(
    reserveJson.media_ids,
    reserveJson.mediaIds,
    reserveJson.media_id,
    reserveJson.mediaId,
    reserveJson.id,
    reserveData.media_ids,
    reserveData.mediaIds,
    reserveData.media_id,
    reserveData.mediaId,
    reserveData.id,
  );
  // The media URL (public CDN URL) may be returned in the reserve response
  const mediaUrl = pickString(
    reserveJson.media_url,
    reserveJson.url,
    reserveData.media_url,
    reserveData.url,
  );

  if (!uploadUrl || mediaIds.length === 0) {
    console.error("[UniPost] Media reserve missing fields. Response:", JSON.stringify(reserveJson));
    return NextResponse.json(
      { error: "UniPost media response did not include upload_url or media_id" },
      { status: 502 },
    );
  }

  // ── Step 2: Upload image binary to presigned URL ─────────────
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": image.type || "application/octet-stream",
    },
    body: image,
  });

  if (!uploadResponse.ok) {
    const text = await uploadResponse.text().catch(() => "");
    console.error("[UniPost] Media upload failed:", text);
    return NextResponse.json(
      { error: text || "Failed to upload image to UniPost" },
      { status: uploadResponse.status },
    );
  }

  // ── Step 3: Wait for media to be ready ──────────────────────
  // UniPost needs time to process the uploaded bytes. Poll until status is "uploaded"/"ready".
  const mediaId = mediaIds[0];
  const mediaReady = await waitForMediaReady(mediaId, authHeaders, baseUrl);

  if (!mediaReady.ok) {
    console.error("[UniPost] Media not ready after upload:", mediaReady.error);
    return NextResponse.json(
      { error: mediaReady.error || "Media upload did not complete in time" },
      { status: 502 },
    );
  }

  const resolvedMediaUrl = mediaUrl || mediaReady.url || "";

  // ── Step 4: Create post via /v1/posts ────────────────────────
  const idempotencyKey = [
    "yummyyummy",
    resolvedAccountId,
    itemName || "instagram",
    scheduledAt || new Date().toISOString(),
    String(caption.length),
  ]
    .join("-")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 160);

  const createPayload: Record<string, unknown> = {
    caption,
    account_ids: [resolvedAccountId],
    media_ids: mediaIds,
    idempotency_key: idempotencyKey,
  };

  // Instagram posts require media_urls in addition to media_ids
  if (resolvedMediaUrl) {
    createPayload.media_urls = [resolvedMediaUrl];
  }

  if (scheduledAt) {
    createPayload.scheduled_at = new Date(scheduledAt).toISOString();
  }

  let postResponse = await fetch(`${baseUrl}/posts`, {
    method: "POST",
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createPayload),
  });

  let postJson = await readUniPostJson(postResponse);

  // If first attempt fails, retry with platform_posts format (UniPost SDK fallback)
  if (!postResponse.ok) {
    console.error("[UniPost] First post creation attempt failed:", JSON.stringify(postJson));

    const fallbackPayload: Record<string, unknown> = {
      platform_posts: [
        {
          account_id: resolvedAccountId,
          caption,
          media_ids: mediaIds,
        },
      ],
      idempotency_key: `${idempotencyKey}-platform-posts`,
    };

    if (resolvedMediaUrl) {
      (fallbackPayload.platform_posts as Record<string, unknown>[])[0].media_urls = [resolvedMediaUrl];
    }

    if (scheduledAt) {
      fallbackPayload.scheduled_at = new Date(scheduledAt).toISOString();
    }

    postResponse = await fetch(`${baseUrl}/posts`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fallbackPayload),
    });
    postJson = await readUniPostJson(postResponse);
  }

  // If still failing, return detailed error
  if (!postResponse.ok) {
    console.error("[UniPost] Final post creation failed:", JSON.stringify(postJson));
    const detailedError = formatUniPostErrorResponse(postJson) || uniPostError(postJson, "Failed to create UniPost post");
    return NextResponse.json(
      { error: detailedError },
      { status: postResponse.status },
    );
  }

  return NextResponse.json({
    ok: true,
    post: postJson.data ?? postJson,
  });
}