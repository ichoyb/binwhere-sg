import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getBlueBinIndex, getEwasteIndex } from '@/lib/data-gov';

/** Convert "FERNVALE ROAD" → "Fernvale Road" */
function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Extract attribute values from KML Description HTML table.
 * Blue bin data stores fields like ADDRESSSTREETNAME inside an HTML table
 * in the Description property, not as top-level properties.
 */
function parseDescriptionHtml(html: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  // Match <th>KEY</th> <td>VALUE</td> pairs
  const re = /<th>(\w+)<\/th>\s*<td>(.*?)<\/td>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    attrs[m[1]] = m[2].trim();
  }
  return attrs;
}

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
      results: results.map((r) => {
        // Blue bin data has fields inside Description HTML; e-waste has them as top-level props
        const desc = (r.properties.Description as string) || '';
        const parsed = desc ? parseDescriptionHtml(desc) : {};
        const prop = (key: string) =>
          (r.properties[key] as string) || parsed[key] || '';

        const block = prop('ADDRESSBLOCKHOUSENUMBER');
        const street = prop('ADDRESSSTREETNAME');
        const building = prop('ADDRESSBUILDINGNAME');

        // Build a readable name from address fields
        let name: string;
        if (input.channel === 'blue_bin') {
          // Blue bins: "Blk 407 Fernvale Road" or "Sunset Way Residence"
          const parts: string[] = [];
          if (block) parts.push(`Blk ${block}`);
          if (street) parts.push(toTitleCase(street));
          name = parts.join(' ') || (building ? toTitleCase(building) : 'Blue Bin');
        } else {
          // E-waste: use the specific operator/program name
          name = prop('NAME') || (r.properties.Name as string) || 'E-Waste Point';
        }

        // Address line: building name or postal code for context
        const address = input.channel === 'blue_bin'
          ? (building ? toTitleCase(building) : '')
          : street;

        return {
          name,
          address,
          postalCode: prop('ADDRESSPOSTALCODE'),
          distanceKm: Math.round(r.distanceKm * 1000) / 1000,
          lat: r.coordinates.latitude,
          lng: r.coordinates.longitude,
        };
      }),
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
