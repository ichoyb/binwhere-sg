import { NextResponse } from 'next/server';

/**
 * V1 Chatbox API — stub, and now a stub with no provider behind it.
 *
 * The tool_use client that used to sit here was deleted along with Groq: nothing
 * imported it, this route never called it, and keeping it alive would have meant
 * keeping an SDK and a second vendor account for a feature that has never served a
 * request. Implementing the chatbox starts by choosing a model again, which is the
 * honest state of the work rather than a half-wired path pretending otherwise.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Chatbox is coming in V1. Stay tuned!' },
    { status: 501 },
  );
}
