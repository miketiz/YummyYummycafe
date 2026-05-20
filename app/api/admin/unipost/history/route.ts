import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE_URL = process.env.UNIPOST_API_BASE_URL || "https://api.unipost.dev/v1";

async function fetchJson(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = { message: text };
  }
  return { response, json };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Try to fetch a media item's URL from UniPost by media_id */
async function fetchMediaUrl(mediaId: string, apiKey: string): Promise<string> {
  try {
    const { json } = await fetchJson(`${BASE_URL}/media/${encodeURIComponent(mediaId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = asRecord(json.data ?? json);
    return pickString(data.url, data.public_url, data.cdn_url, data.download_url) || "";
  } catch {
    return "";
  }
}

/**
 * Process an array of items with async work in batches of `batchSize`.
 * This prevents overwhelming the UniPost rate limit with parallel requests.
 */
async function batchProcess<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export async function GET(request: Request) {
  const apiKey = process.env.UNIPOST_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing UNIPOST_API_KEY" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const platform = searchParams.get("platform") || undefined;
  const fromDate = searchParams.get("from") || undefined;
  const toDate = searchParams.get("to") || undefined;
  const limit = searchParams.get("limit") || "20";
  const cursor = searchParams.get("cursor") || undefined;

  const query = new URLSearchParams();
  query.set("limit", limit);
  if (status) query.set("status", status);
  if (platform) query.set("platform", platform);
  if (fromDate) query.set("from", fromDate);
  if (toDate) query.set("to", toDate);
  if (cursor) query.set("cursor", cursor);

  const { response, json } = await fetchJson(`${BASE_URL}/posts?${query.toString()}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const message = pickString(json.message, asRecord(json.error).message) || "Failed to fetch posts";
    return NextResponse.json({ error: message }, { status: response.status });
  }

  const rawPosts = Array.isArray(json.data) ? json.data : [];
  const meta = asRecord(json.meta);
  const nextCursor = pickString(meta.next_cursor, json.next_cursor) || null;

  // First pass: extract all data without media fetches
  const parsedPosts = rawPosts.map((raw: unknown) => {
    const p = asRecord(raw);
    const results = Array.isArray(p.results) ? p.results.map((r: unknown) => asRecord(r)) : [];
    const metadata = asRecord(p.metadata);

    let totalLikes = 0;
    let totalComments = 0;
    for (const r of results) {
      totalLikes += safeNumber(r.likes || r.like_count);
      totalComments += safeNumber(r.comments || r.comment_count);
    }

    const rawMediaIds = p.media_ids || p.mediaIds;
    const mediaIds = Array.isArray(rawMediaIds) ? rawMediaIds.map(String) : [];

    // Check for media_urls directly on the post
    const rawMediaUrls = p.media_urls || p.mediaUrls;
    let mediaUrls: string[] = [];
    if (Array.isArray(rawMediaUrls)) {
      mediaUrls = rawMediaUrls.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
    }

    // Check results for permalink or media_url
    for (const r of results) {
      const resultUrl = pickString(r.permalink, r.media_url, r.url, r.share_url, r.canonical_url);
      if (resultUrl) {
        mediaUrls.push(resultUrl);
      }
    }

    return {
      id: pickString(p.id),
      caption: pickString(p.caption),
      itemName: pickString(metadata.itemName, metadata.item_name, metadata.product) || "Instagram Post",
      postedAt: pickString(p.published_at, p.posted_at, p.created_at, p.scheduled_at),
      likes: totalLikes,
      comments: totalComments,
      status: pickString(p.status),
      mediaIds,
      mediaUrls,
    };
  });

  // Second pass: batch-fetch media URLs (5 at a time) only for posts without URLs already
  const postsNeedingMedia = parsedPosts.map((p, idx) => ({ idx, ...p }));
  const postsWithMediaUrls = await batchProcess(postsNeedingMedia, 5, async (post) => {
    // If we already have media URLs from the post response, use them directly
    if (post.mediaUrls.length > 0) {
      return { ...post, mediaUrls: post.mediaUrls };
    }

    // Otherwise fetch from media IDs (only first one)
    if (post.mediaIds.length > 0) {
      const fetchedUrl = await fetchMediaUrl(post.mediaIds[0], apiKey);
      if (fetchedUrl) {
        return { ...post, mediaUrls: [fetchedUrl] };
      }
    }

    return { ...post, mediaUrls: [] as string[] };
  });

  // Sort back to original order (in case batch processing reorders)
  postsWithMediaUrls.sort((a, b) => a.idx - b.idx);

  const posts = postsWithMediaUrls.map(({ idx, mediaIds, ...rest }) => rest);

  return NextResponse.json({ posts, nextCursor });
}