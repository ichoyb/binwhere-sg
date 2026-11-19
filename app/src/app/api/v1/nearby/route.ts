import { NextRequest, NextResponse } from 'next/server';
import {
  NearbyQuerySchema,
  NearbyResponseSchema,
  type ApiErrorCode,
} from '@binwhere/core';
import {
  getBlueBinIndex,
  getEwasteIndex,
  getTextileIndex,
  getReuseChannelsIndex,
  getReturnPointIndex,
} from '@/lib/data-gov';
import { getPointDetails } from '@/lib/point-details';
import { queryNearby } from '@/lib/nearby';
import { checkRateLimit, DEFAULT_LIMITS } from '@/lib/rate-limit';
import { clientId, gridCell, logEvent } from '@/lib/telemetry';

function errorResponse(
  code: ApiErrorCode,
  error: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    { code, error, ...(details === undefined ? {} : { details }) },
    { status },
  );
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const client = clientId(request);
  const elapsed = () => Date.now() - startedAt;

  const blocked = checkRateLimit(request, DEFAULT_LIMITS);
  if (blocked) {
    // A throttled caller used to leave no trace: the user sees a channel that
    // looks broken, and the server recorded nothing to contradict that.
    logEvent('nearby', {
      client,
      ok: false,
      http: blocked.status,
      code: blocked.status === 403 ? 'FORBIDDEN' : 'RATE_LIMITED',
      ms: elapsed(),
    });
    return blocked;
  }

  const parsedInput = NearbyQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsedInput.success) {
    logEvent('nearby', {
      client,
      ok: false,
      http: 400,
      code: 'INVALID_INPUT',
      ms: elapsed(),
    });
    return errorResponse(
      'INVALID_INPUT',
      'Invalid input',
      400,
      parsedInput.error.issues,
    );
  }
  const input = parsedInput.data;
  // Rounded to a ~1 km cell: enough to spot uncovered areas, never a person.
  const cell = gridCell(input.lat, input.lng);

  try {
    const isDonation = input.channel === 'donation';
    const isReturnPoint = input.channel === 'return_point';
    const index = input.channel === 'blue_bin'
      ? getBlueBinIndex()
      : isReturnPoint
        ? getReturnPointIndex()
        : input.channel === 'textile'
          ? getTextileIndex()
          : isDonation
            ? getReuseChannelsIndex()
            : getEwasteIndex();

    if (!index) {
      logEvent('nearby', {
        client,
        ok: false,
        http: 503,
        code: 'DATA_UNAVAILABLE',
        channel: input.channel,
        kind: input.itemKind,
        cell,
        ms: elapsed(),
      });
      return errorResponse(
        'DATA_UNAVAILABLE',
        'Recycling point data is unavailable',
        503,
      );
    }

    const filtered = queryNearby(index, input);

    const parsedResponse = NearbyResponseSchema.safeParse({
      channel: input.channel,
      center: { lat: input.lat, lng: input.lng },
      radiusKm: input.radius,
      count: filtered.length,
      results: filtered.map((result) => {
        const { name, address, postalCode, ...details } = getPointDetails(result.properties, input.channel);
        return {
          name,
          address,
          postalCode,
          distanceKm: Math.round(result.distanceKm * 1000) / 1000,
          lat: result.coordinates.latitude,
          lng: result.coordinates.longitude,
          ...details,
        };
      }),
    });

    if (!parsedResponse.success) {
      console.error(
        '[api/v1/nearby] Invalid response:',
        parsedResponse.error.issues,
      );
      logEvent('nearby', {
        client,
        ok: false,
        http: 502,
        code: 'INVALID_RESPONSE',
        channel: input.channel,
        kind: input.itemKind,
        cell,
        ms: elapsed(),
      });
      return errorResponse(
        'INVALID_RESPONSE',
        'Invalid nearby response',
        502,
      );
    }

    // results=0 is the signal an access log cannot carry: this is still a 200.
    logEvent('nearby', {
      client,
      ok: true,
      http: 200,
      channel: input.channel,
      kind: input.itemKind,
      cell,
      radiusKm: input.radius,
      results: parsedResponse.data.count,
      ms: elapsed(),
    });
    return NextResponse.json(parsedResponse.data);
  } catch (error) {
    console.error('[api/v1/nearby] Error:', error);
    logEvent('nearby', {
      client,
      ok: false,
      http: 500,
      code: 'NEARBY_QUERY_FAILED',
      channel: input.channel,
      kind: input.itemKind,
      cell,
      ms: elapsed(),
    });
    return errorResponse('NEARBY_QUERY_FAILED', 'Nearby query failed', 500);
  }
}
