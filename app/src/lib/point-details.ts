import type { NearbyChannel } from '@binwhere/core';
import { formatReturnPointOpeningHours } from './bcrs';

function toTitleCase(value: string): string {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

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

export function getPointDetails(properties: Record<string, unknown>, channel: NearbyChannel) {
  const isEwaste = channel === 'ewaste' || channel === 'ewaste_battery' || channel === 'lighting';
  const isDonation = channel === 'donation';
  const isReturnPoint = channel === 'return_point';
  const description = (properties.Description as string) || '';
  const parsedDescription = description
    ? parseDescriptionHtml(description)
    : {};
  const property = (key: string) =>
    (properties[key] as string) || parsedDescription[key] || '';

  const block = property('ADDRESSBLOCKHOUSENUMBER');
  const street = property('ADDRESSSTREETNAME');
  const building = property('ADDRESSBUILDINGNAME');

  let name: string;
  let address: string;
  if (channel === 'blue_bin') {
    const parts: string[] = [];
    if (block) parts.push(`Blk ${block}`);
    if (street) parts.push(toTitleCase(street));
    name = parts.join(' ') || (building ? toTitleCase(building) : 'Blue Bin');
    address = building ? toTitleCase(building) : '';
  } else if (channel === 'textile') {
    name = property('NAME') || 'Textile Bin';
    address = property('DESCRIPTION');
  } else if (isReturnPoint) {
    name = property('NAME') || 'Return Point';
    address = property('FULLADDRESS');
  } else if (isDonation) {
    name = property('NAME') || 'Donation Point';
    address = property('FULLADDRESS')
      || [block, street, building].filter(Boolean).join(', ');
  } else {
    name = property('NAME')
      || (properties.Name as string)
      || 'E-Waste Point';
    address = street;
  }

  const ewasteDescription = (properties.DESCRIPTION as string) || '';
  const accepts = isEwaste ? parseAccepts(ewasteDescription) : undefined;
  const donationAccepts = isDonation
    ? property('ACCEPTEDITEMS') || undefined
    : undefined;
  const reuseType = isDonation
    ? property('REUSETYPE') || undefined
    : undefined;
  const openingHours = isReturnPoint
    ? formatReturnPointOpeningHours(properties.OPENING_HOURS)
    : undefined;
  const machineStatus = isReturnPoint
    ? property('MACHINE_STATUS') || undefined
    : undefined;

  return {
    name,
    address,
    postalCode: property('ADDRESSPOSTALCODE'),
    ...(accepts && { accepts }),
    ...(donationAccepts && { accepts: donationAccepts }),
    ...(reuseType && { reuseType }),
    ...(openingHours && { openingHours }),
    ...(machineStatus && { machineStatus }),
  };
}
