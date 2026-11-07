import { NextRequest, NextResponse } from 'next/server';
import { ApiV2ErrorResponseSchema, PointsResponseSchema, type ApiV2ErrorCode } from '@binwhere/core';
import { getPointsData } from '@/lib/points';
import { getRateLimitFailure, POINTS_LIMITS } from '@/lib/rate-limit';
import { clientId, logEvent } from '@/lib/telemetry';

const CACHE_CONTROL = 'private, no-cache';

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const client = clientId(request);
  const fail = (code: ApiV2ErrorCode, error: string, status: number, headers?: HeadersInit) => {
    logEvent('points', { client, ok: false, http: status, code, ms: Date.now() - startedAt });
    return NextResponse.json(ApiV2ErrorResponseSchema.parse({ code, error }), { status, headers });
  };

  const blocked = getRateLimitFailure(request, POINTS_LIMITS);
  if (blocked) {
    return fail(
      blocked.code,
      blocked.error,
      blocked.status,
      blocked.status === 429 ? { 'Retry-After': String(blocked.retryAfterS) } : undefined,
    );
  }

  try {
    const parsed = PointsResponseSchema.safeParse(getPointsData());
    if (!parsed.success) {
      return fail('INVALID_RESPONSE', 'Invalid points response', 502);
    }

    const data = parsed.data;
    const versionTag = `"${data.dataVersion}"`;
    const etag = `W/${versionTag}`;
    const headers = { ETag: etag, 'Cache-Control': CACHE_CONTROL };
    const unchanged = request.headers.get('if-none-match')?.split(',').some((value) => {
      const tag = value.trim();
      return tag === '*' || tag.replace(/^W\//, '') === versionTag;
    });
    const status = unchanged ? 304 : 200;
    logEvent('points', {
      client,
      ok: true,
      http: status,
      dataVersion: data.dataVersion,
      results: Object.values(data.layers).reduce((total, rows) => total + rows.length, 0),
      ms: Date.now() - startedAt,
    });
    return unchanged
      ? new NextResponse(null, { status, headers })
      : NextResponse.json(data, { headers });
  } catch (error) {
    console.error('[api/v2/points] Error:', error);
    return fail('POINTS_DATA_UNAVAILABLE', 'Recycling point data is unavailable', 503);
  }
}
