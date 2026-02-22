import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getBlueBinIndex, getEwasteIndex } from '@/lib/data-gov';

const NearbyInputSchema = z.object({
  lat: z.coerce.number().min(1.15).max(1.47),
  lng: z.coerce.number().min(103.6).max(104.05),
  channel: z.enum(['blue_bin', 'ewaste']),
  limit: z.coerce.number().int().min(1).max(20).default(5),
  radius: z.coerce.number().min(0.1).max(5).default(1),
});

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const input = NearbyInputSchema.parse(params);

    const index = input.channel === 'blue_bin' ? getBlueBinIndex() : getEwasteIndex();

    if (!index) {
      return NextResponse.json(
        { error: 'Data not available. Run "npm run prebuild" to generate data.' },
        { status: 503 },
      );
    }

    const results = index.queryRadius(
      { latitude: input.lat, longitude: input.lng },
      input.radius,
      input.limit,
    );

    return NextResponse.json({
      channel: input.channel,
      center: { lat: input.lat, lng: input.lng },
      radiusKm: input.radius,
      count: results.length,
      results: results.map((r) => ({
        name: r.properties.NAME || r.properties.Name || 'Unknown',
        address: r.properties.ADDRESSSTREETNAME || '',
        postalCode: r.properties.ADDRESSPOSTALCODE || '',
        distanceKm: Math.round(r.distanceKm * 1000) / 1000,
        lat: r.coordinates.latitude,
        lng: r.coordinates.longitude,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 },
      );
    }

    console.error('[api/nearby] Error:', error);
    return NextResponse.json(
      { error: 'Query failed' },
      { status: 500 },
    );
  }
}
