import { NextRequest, NextResponse } from 'next/server';

import { clientId, logEvent } from '@/lib/telemetry';

/**
 * V1 Chatbox API — stub, and now a stub with no provider behind it.
 *
 * The tool_use client that used to sit here was deleted along with Groq: nothing
 * imported it, this route never called it, and keeping it alive would have meant
 * keeping an SDK and a second vendor account for a feature that has never served a
 * request. Implementing the chatbox starts by choosing a model again, which is the
 * honest state of the work rather than a half-wired path pretending otherwise.
 *
 * It still emits an event. "Is anyone actually calling this?" is the first input
 * to deciding whether to build it — an old mobile build or a scanner hitting this
 * route is exactly the thing worth knowing, and a 501 leaves no other trace.
 */
export async function POST(request: NextRequest) {
  logEvent('chat', {
    client: clientId(request),
    ok: false,
    http: 501,
    code: 'NOT_IMPLEMENTED',
  });
  return NextResponse.json(
    { error: 'Chatbox is coming in V1. Stay tuned!' },
    { status: 501 },
  );
}
