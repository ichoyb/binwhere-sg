import type { EwasteAccept } from '@binwhere/core';

type EwasteItem = 'ict' | 'battery' | 'lamp' | 'non_regulated' | 'large_appliance' | 'electric_mobility';

interface EwasteCollection {
  service: 'bin' | 'manned' | 'drop_off_and_bin' | 'collection_drive';
  items: readonly EwasteItem[];
  accepts: string;
}

const EWASTE_DESCRIPTIONS = new Map<string, EwasteCollection>([
  ['Bin collection; E-waste accepted: ICT equipment, Batteries and Lamps only', {
    service: 'bin', items: ['ict', 'battery', 'lamp'], accepts: 'ICT equipment, Batteries, Lamps',
  }],
  ['Bin collection; E-waste accepted: Batteries and Lamps only', {
    service: 'bin', items: ['battery', 'lamp'], accepts: 'Batteries, Lamps',
  }],
  ['Bin collection; E-waste accepted: Batteries only', {
    service: 'bin', items: ['battery'], accepts: 'Batteries',
  }],
  ['Manned collection (Contact staff for disposal); ; ; E-waste accepted: ICT equipment and Batteries only', {
    service: 'manned', items: ['ict', 'battery'], accepts: 'ICT equipment, Batteries',
  }],
  ['Bin collection; E-waste accepted: Non-regulated products only; E.g. Small household appliances, gaming consoles, audio systems, power supplies', {
    service: 'bin', items: ['non_regulated'], accepts: 'Small appliances',
  }],
  ['Manned collection (Contact staff for disposal); ; ; E-waste accepted: ICT equipment, Batteries and Lamps only', {
    service: 'manned', items: ['ict', 'battery', 'lamp'], accepts: 'ICT equipment, Batteries, Lamps',
  }],
  ['Manned collection (Contact staff for disposal); ; ; E-waste accepted: Batteries and Lamps only', {
    service: 'manned', items: ['battery', 'lamp'], accepts: 'Batteries, Lamps',
  }],
  ['Drop-off and Bin collection; All regulated consumer products under First Schedule at https://go.gov.sg/prod-def-sl, Large Household Appliances, ICT Equipment, Portable Batteries, Lamps, Electric Mobility Devices', {
    service: 'drop_off_and_bin', items: ['ict', 'battery', 'lamp', 'large_appliance', 'electric_mobility'],
    accepts: 'All regulated e-waste',
  }],
  ['E-waste collection drive; E-waste accepted: All regulated consumer products under First Schedule at https://go.gov.sg/prod-def-sl', {
    service: 'collection_drive', items: ['ict', 'battery', 'lamp', 'large_appliance', 'electric_mobility'],
    accepts: 'All regulated e-waste',
  }],
]);

export function getEwasteAccepts(items: readonly EwasteItem[]): EwasteAccept[] {
  if (items.includes('large_appliance') || items.includes('electric_mobility')) {
    const regulated = ['ict', 'battery', 'lamp', 'large_appliance', 'electric_mobility'] as const;
    if (!regulated.every((item) => items.includes(item))) {
      throw new Error('E-waste large appliances and electric mobility require all five regulated categories');
    }
    return ['all_regulated'];
  }
  return items.filter((item): item is Exclude<EwasteItem, 'large_appliance' | 'electric_mobility'> =>
    item !== 'large_appliance' && item !== 'electric_mobility');
}

for (const collection of EWASTE_DESCRIPTIONS.values()) getEwasteAccepts(collection.items);

export function parseEwasteDescription(description: string, objectId: unknown): EwasteCollection {
  const collection = EWASTE_DESCRIPTIONS.get(description.trim().replace(/\s+/g, ' '));
  if (!collection) {
    throw new Error(`E-waste OBJECTID ${objectId}: unknown DESCRIPTION ${JSON.stringify(description)}`);
  }
  return collection;
}
