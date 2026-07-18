import { NextResponse } from 'next/server';

// Liveness endpoint for the web service (used by the Compose health check).
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ status: 'ok' });
}
