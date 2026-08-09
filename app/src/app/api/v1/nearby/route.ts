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
import { formatReturnPointOpeningHours } from '@/lib/bcrs';
import { checkRateLimit, DEFAULT_LIMITS } from '@/lib/rate-limit';

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

/** Convert "FERNVALE ROAD" to "Fernvale Road". */
function toTitleCase(value: string): string {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Extract KML description table values used by the blue-bin dataset. */
function parseDescriptionHtml(html: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /<th>(\w+)<\/th>\s*<td>(.*?)<\/td>/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    attrs[match[1]] = match[2].trim();
  }
  return attrs;
}

function parseAccepts(description: string): string {
  const normalized = description.toLowerCase();
  if (normalized.includes('all regulated')) return 'All regulated e-waste';
  if (normalized.includes('non-regulated')) return 'Small appliances';
  const parts: string[] = [];
  if (normalized.includes('ict')) parts.push('ICT equipment');
  if (normalized.includes('batter')) parts.push('Batteries');
  if (normalized.includes('lamp')) parts.push('Lamps');
  return parts.join(', ');
}

function matchesEwasteChannel(description: string, channel: string): boolean {
  const normalized = description.toLowerCase();
  if (normalized.includes('all regulated')) return true;
  if (channel === 'ewaste') return true;
  if (channel === 'ewaste_battery') return normalized.includes('batter');
  if (channel === 'lighting') return normalized.includes('lamp');
  return true;
}

export async function GET(request: NextRequest) {
  const blocked = checkRateLimit(request, DEFAULT_LIMITS);
  if (blocked) return blocked;

  const parsedInput = NearbyQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsedInput.success) {
    return errorResponse(
      'INVALID_INPUT',
      'Invalid input',
      400,
      parsedInput.error.issues,
    );
  }
  const input = parsedInput.data;

  try {
    const isEwaste = input.channel === 'ewaste'
      || input.channel === 'ewaste_battery'
      || input.channel === 'lighting';
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
      return errorResponse(
        'DATA_UNAVAILABLE',
        'Recycling point data is unavailable',
        503,
      );
    }

    const needsEwasteFilter = input.channel === 'ewaste_battery'
      || input.channel === 'lighting';
    const needsDonationFilter = isDonation && !!input.acceptedItem;
    const queryLimit = needsEwasteFilter || needsDonationFilter
      ? input.limit * 4
      : input.limit;

    const rawResults = index.queryRadius(
      { latitude: input.lat, longitude: input.lng },
      input.radius,
      queryLimit,
    );

    let filtered = rawResults;
    if (needsEwasteFilter) {
      filtered = rawResults.filter((result) => {
        const description = (result.properties.DESCRIPTION as string) || '';
        return matchesEwasteChannel(description, input.channel);
      }).slice(0, input.limit);
    } else if (needsDonationFilter && input.acceptedItem) {
      const acceptedItem = input.acceptedItem.toLowerCase();
      filtered = rawResults.filter((result) => {
        const accepted = ((result.properties.ACCEPTEDITEMS as string) || '').toLowerCase();
        return accepted.includes(acceptedItem);
      }).slice(0, input.limit);
    }

    const parsedResponse = NearbyResponseSchema.safeParse({
      channel: input.channel,
      center: { lat: input.lat, lng: input.lng },
      radiusKm: input.radius,
      count: filtered.length,
      results: filtered.map((result) => {
        const description = (result.properties.Description as string) || '';
        const parsedDescription = description
          ? parseDescriptionHtml(description)
          : {};
        const property = (key: string) =>
          (result.properties[key] as string) || parsedDescription[key] || '';

        const block = property('ADDRESSBLOCKHOUSENUMBER');
        const street = property('ADDRESSSTREETNAME');
        const building = property('ADDRESSBUILDINGNAME');

        let name: string;
        let address: string;
        if (input.channel === 'blue_bin') {
          const parts: string[] = [];
          if (block) parts.push(`Blk ${block}`);
          if (street) parts.push(toTitleCase(street));
          name = parts.join(' ') || (building ? toTitleCase(building) : 'Blue Bin');
          address = building ? toTitleCase(building) : '';
        } else if (input.channel === 'textile') {
          name = property('NAME') || 'Textile Bin';
          address = property('DESCRIPTION');
        } else if (isReturnPoint) {
          name = property('NAME') || 'Return Point';
          address = '';
        } else if (isDonation) {
          name = property('NAME') || 'Donation Point';
          address = property('FULLADDRESS')
            || [block, street, building].filter(Boolean).join(', ');
        } else {
          name = property('NAME')
            || (result.properties.Name as string)
            || 'E-Waste Point';
          address = street;
        }

        const ewasteDescription = (result.properties.DESCRIPTION as string) || '';
        const accepts = isEwaste ? parseAccepts(ewasteDescription) : undefined;
        const donationAccepts = isDonation
          ? property('ACCEPTEDITEMS') || undefined
          : undefined;
        const reuseType = isDonation
          ? property('REUSETYPE') || undefined
          : undefined;
        const openingHours = isReturnPoint
          ? formatReturnPointOpeningHours(result.properties.OPENING_HOURS)
          : undefined;
        const machineStatus = isReturnPoint
          ? property('MACHINE_STATUS') || undefined
          : undefined;

        return {
          name,
          address,
          postalCode: property('ADDRESSPOSTALCODE'),
          distanceKm: Math.round(result.distanceKm * 1000) / 1000,
          lat: result.coordinates.latitude,
          lng: result.coordinates.longitude,
          ...(accepts && { accepts }),
          ...(donationAccepts && { accepts: donationAccepts }),
          ...(reuseType && { reuseType }),
          ...(openingHours && { openingHours }),
          ...(machineStatus && { machineStatus }),
        };
      }),
    });

    if (!parsedResponse.success) {
      console.error(
        '[api/v1/nearby] Invalid response:',
        parsedResponse.error.issues,
      );
      return errorResponse(
        'INVALID_RESPONSE',
        'Invalid nearby response',
        502,
      );
    }

    return NextResponse.json(parsedResponse.data);
  } catch (error) {
    console.error('[api/v1/nearby] Error:', error);
    return errorResponse('NEARBY_QUERY_FAILED', 'Nearby query failed', 500);
  }
}
