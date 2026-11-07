import { NextRequest, NextResponse } from 'next/server';
import {
  ApiV2ErrorResponseSchema,
  RouteRequestSchema,
  RouteResponseSchema,
  type ApiV2ErrorCode,
  type RouteRequest,
} from '@binwhere/core';
import { getRateLimitFailure, ROUTE_LIMITS } from '@/lib/rate-limit';
import { readJsonBodyWithLimit } from '@/lib/http-utils';
import { clientId, gridCell, logEvent } from '@/lib/telemetry';

const MAX_BODY_BYTES = 2 * 1024;
let activeRequests = 0;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const client = clientId(request);
  let originCell: string | undefined = undefined;
  let destinationCell: string | undefined = undefined;
  let roadNetworkVersion: string | undefined;
  const record = (status: number, code?: ApiV2ErrorCode) => logEvent('route', {
    client,
    ok: status === 200,
    http: status,
    code,
    originCell,
    destinationCell,
    roadNetworkVersion,
    ms: Date.now() - startedAt,
  });
  const fail = (code: ApiV2ErrorCode, error: string, status: number, headers?: HeadersInit) => {
    record(status, code);
    return NextResponse.json(ApiV2ErrorResponseSchema.parse({ code, error }), { status, headers });
  };

  const blocked = getRateLimitFailure(request, ROUTE_LIMITS);
  if (blocked) {
    return fail(
      blocked.code,
      blocked.error,
      blocked.status,
      blocked.status === 429 ? { 'Retry-After': String(blocked.retryAfterS) } : undefined,
    );
  }

  let input: RouteRequest;
  try {
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      return fail('INVALID_INPUT', 'Expected application/json', 400);
    }
    input = RouteRequestSchema.parse(await readJsonBodyWithLimit(request, MAX_BODY_BYTES));
  } catch {
    return fail('INVALID_INPUT', 'Invalid input', 400);
  }
  originCell = gridCell(input.origin.lat, input.origin.lng);
  destinationCell = gridCell(input.destination.lat, input.destination.lng);

  const port = process.env.BINWHERE_ROUTING_PORT ?? '5000';
  if (!/^[1-9]\d{0,4}$/.test(port) || Number(port) > 65535) {
    return fail('ROUTING_UNAVAILABLE', 'Invalid BINWHERE_ROUTING_PORT configuration', 503);
  }
  if (activeRequests >= 2) {
    return fail('SERVER_BUSY', 'Routing service is busy', 503);
  }

  activeRequests++;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  let receivedResponse = false;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/route/v1/foot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coordinates: [
          [input.origin.lng, input.origin.lat],
          [input.destination.lng, input.destination.lat],
        ],
        radiuses: [50, 50],
        overview: 'full',
        geometries: 'geojson',
      }),
      signal: controller.signal,
      redirect: 'manual',
      cache: 'no-store',
    });
    receivedResponse = true;
    if (response.status !== 200 && response.status !== 400) {
      await response.body?.cancel();
      return fail('INVALID_RESPONSE', 'Invalid routing response', 502);
    }
    const body = await response.json();
    if (body?.code === 'NoSegment') {
      return fail('ROUTE_NOT_ON_NETWORK', 'No walkable road within 50 m', 422);
    }
    if (body?.code === 'NoRoute') {
      return fail('ROUTE_NOT_FOUND', 'No walking route found', 422);
    }
    if (!response.ok || body?.code !== 'Ok') {
      return fail('INVALID_RESPONSE', 'Invalid routing response', 502);
    }

    const version = typeof body.data_version === 'string' ? body.data_version.split('@') : [];
    const route = body.routes?.[0];
    const origin = body.waypoints?.[0];
    const destination = body.waypoints?.[1];
    const parsed = RouteResponseSchema.safeParse({
      geometry: route?.geometry,
      distanceM: route?.distance,
      durationS: route?.duration,
      snappedOrigin: { lat: origin?.location?.[1], lng: origin?.location?.[0], offsetM: origin?.distance },
      snappedDestination: { lat: destination?.location?.[1], lng: destination?.location?.[0], offsetM: destination?.distance },
      roadNetworkVersion: version.length === 2 ? version[0] : undefined,
      osmDataTimestamp: version.length === 2 ? version[1] : undefined,
    });
    if (!parsed.success) {
      const parsedVersion = RouteResponseSchema.shape.roadNetworkVersion.safeParse(version[0]);
      if (parsedVersion.success) roadNetworkVersion = parsedVersion.data;
      return fail('INVALID_RESPONSE', 'Invalid routing response', 502);
    }

    roadNetworkVersion = parsed.data.roadNetworkVersion;
    record(200);
    return NextResponse.json(parsed.data);
  } catch {
    if (controller.signal.aborted) {
      return fail('ROUTING_TIMEOUT', 'Routing service timed out', 504);
    }
    return receivedResponse
      ? fail('INVALID_RESPONSE', 'Invalid routing response', 502)
      : fail('ROUTING_UNAVAILABLE', 'Routing service is unavailable', 503);
  } finally {
    clearTimeout(timeout);
    activeRequests--;
  }
}
