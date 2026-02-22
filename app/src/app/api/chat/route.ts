import { NextResponse } from 'next/server';

/**
 * V1 Chatbox API — Stub.
 * Will be implemented in V1 phase with Groq tool_use.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Chatbox is coming in V1. Stay tuned!' },
    { status: 501 },
  );
}
