import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getBlueBinIndex, getEwasteIndex, getTextileIndex } from '@/lib/data-gov';

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
  channel: z.enum(['blue_bin', 'ewaste', 'ewaste_battery', 'lighting', 'textile']),
  limit: z.coerce.number().int().min(1).max(20).default(5),
  radius: z.coerce.number().min(0.1).max(5).default(1),
});

/** Parse DESCRIPTION into human-readable accepts string */
function parseAccepts(description: string): string {
  const d = description.toLowerCase();
  if (d.includes('all regulated')) return 'All regulated e-waste';
  if (d.includes('non-regulated')) return 'Small appliances';
  const parts: string[] = [];
  if (d.includes('ict')) parts.push('ICT equipment');
  if (d.includes('batter')) parts.push('Batteries');
  if (d.includes('lamp')) parts.push('Lamps');
  return parts.join(', ') || '';
}

/** Check if an e-waste point accepts the given sub-channel */
function matchesEwasteChannel(description: string, channel: string): boolean {
  const d = description.toLowerCase();
  // "all regulated" points accept everything
  if (d.includes('all regulated')) return true;
  if (channel === 'ewaste') return true; // no filtering for generic ewaste
  if (channel === 'ewaste_battery') return d.includes('batter');
  if (channel === 'lighting') return d.includes('lamp');
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const input = NearbyInputSchema.parse(params);

    const isEwaste = input.channel === 'ewaste' || input.channel === 'ewaste_battery' || input.channel === 'lighting';
    const index = input.channel === 'blue_bin'
      ? getBlueBinIndex()
      : input.channel === 'textile'
        ? getTextileIndex()
        : getEwasteIndex();

    if (!index) {
      return NextResponse.json(
        { error: 'Data not available. Run "npm run prebuild" to generate data.' },
        { status: 503 },
      );
    }

    // For sub-channels (ewaste_battery, lighting), fetch extra candidates for post-filtering
    const needsFilter = input.channel === 'ewaste_battery' || input.channel === 'lighting';
    const queryLimit = needsFilter ? input.limit * 4 : input.limit;

    const rawResults = index.queryRadius(
      { latitude: input.lat, longitude: input.lng },
      input.radius,
      queryLimit,
    );

    // Filter e-waste sub-channels by DESCRIPTION
    const filtered = needsFilter
      ? rawResults.filter((r) => {
          const desc = (r.properties.DESCRIPTION as string) || '';
          return matchesEwasteChannel(desc, input.channel);
        }).slice(0, input.limit)
      : rawResults;

    return NextResponse.json({
      channel: input.channel,
      center: { lat: input.lat, lng: input.lng },
      radiusKm: input.radius,
      count: filtered.length,
      results: filtered.map((r) => {
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
        let address: string;
        if (input.channel === 'blue_bin') {
          // Blue bins: "Blk 407 Fernvale Road" or "Sunset Way Residence"
          const parts: string[] = [];
          if (block) parts.push(`Blk ${block}`);
          if (street) parts.push(toTitleCase(street));
          name = parts.join(' ') || (building ? toTitleCase(building) : 'Blue Bin');
          address = building ? toTitleCase(building) : '';
        } else if (input.channel === 'textile') {
          // Textile: place name like "Kebun Baru Court (SG0159)"
          name = prop('NAME') || 'Textile Bin';
          address = prop('DESCRIPTION');
        } else {
          // E-waste: use the specific operator/program name
          name = prop('NAME') || (r.properties.Name as string) || 'E-Waste Point';
          address = street;
        }

        // Parse accepts for e-waste points
        const ewasteDesc = (r.properties.DESCRIPTION as string) || '';
        const accepts = isEwaste ? parseAccepts(ewasteDesc) : undefined;

        return {
          name,
          address,
          postalCode: prop('ADDRESSPOSTALCODE'),
          distanceKm: Math.round(r.distanceKm * 1000) / 1000,
          lat: r.coordinates.latitude,
          lng: r.coordinates.longitude,
          ...(accepts && { accepts }),
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
