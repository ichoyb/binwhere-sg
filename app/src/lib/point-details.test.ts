import assert from 'node:assert/strict';
import { getPointDetails } from './point-details';

function runTest(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}

const blueBins = [
  { block: '', street: '', building: '', name: 'Blue Bin', address: '' },
  { block: '407', street: '', building: '', name: 'Blk 407', address: '' },
  { block: '', street: 'FERNVALE ROAD', building: '', name: 'Fernvale Road', address: '' },
  { block: '', street: '', building: 'COMMUNITY CLUB', name: 'Community Club', address: 'Community Club' },
  { block: '407', street: 'FERNVALE ROAD', building: '', name: 'Blk 407 Fernvale Road', address: '' },
  { block: '407', street: '', building: 'COMMUNITY CLUB', name: 'Blk 407', address: 'Community Club' },
  { block: '', street: 'FERNVALE ROAD', building: 'COMMUNITY CLUB', name: 'Fernvale Road', address: 'Community Club' },
  { block: '407', street: 'FERNVALE ROAD', building: 'COMMUNITY CLUB', name: 'Blk 407 Fernvale Road', address: 'Community Club' },
];

for (const [index, { block, street, building, name, address }] of blueBins.entries()) {
  runTest(`blue bin display fields ${index + 1}`, () => {
    assert.deepEqual(getPointDetails({
      ADDRESSBLOCKHOUSENUMBER: block,
      ADDRESSSTREETNAME: street,
      ADDRESSBUILDINGNAME: building,
      ADDRESSPOSTALCODE: '790407',
    }, 'blue_bin'), { name, address, postalCode: '790407' });
  });
}

runTest('blue bins read KML attributes and prefer direct properties', () => {
  const properties = {
    ADDRESSBLOCKHOUSENUMBER: '408',
    Description: '<table><th>ADDRESSBLOCKHOUSENUMBER</th><td> 407 </td>'
      + '<th>ADDRESSSTREETNAME</th><td> FERNVALE ROAD </td>'
      + '<th>ADDRESSBUILDINGNAME</th><td> COMMUNITY CLUB </td>'
      + '<th>ADDRESSPOSTALCODE</th><td> 790407 </td></table>',
  };
  assert.deepEqual(getPointDetails(properties, 'blue_bin'), {
    name: 'Blk 408 Fernvale Road', address: 'Community Club', postalCode: '790407',
  });
});

runTest('textile keeps the source name and location description', () => {
  assert.deepEqual(getPointDetails({ NAME: 'Bedok North', DESCRIPTION: 'Near Lift E' }, 'textile'), {
    name: 'Bedok North', address: 'Near Lift E', postalCode: '',
  });
  assert.deepEqual(getPointDetails({}, 'textile'), { name: 'Textile Bin', address: '', postalCode: '' });
});

runTest('return points expose address, formatted opening hours and machine status', () => {
  assert.deepEqual(getPointDetails({
    NAME: 'Block 54 Geylang Bahru', FULLADDRESS: '54 Geylang Bahru, 330054',
    ADDRESSPOSTALCODE: '330054', OPENING_HOURS: 'Mon - Sun:  24 Hrs', MACHINE_STATUS: 'Available',
  }, 'return_point'), {
    name: 'Block 54 Geylang Bahru', address: '54 Geylang Bahru, 330054', postalCode: '330054',
    openingHours: '24 Hours', machineStatus: 'Available',
  });
  assert.deepEqual(getPointDetails({}, 'return_point'), { name: 'Return Point', address: '', postalCode: '' });
});

runTest('donation prefers full address and exposes accepted items and reuse type', () => {
  assert.deepEqual(getPointDetails({
    NAME: 'Donation Centre', FULLADDRESS: '315 Outram Road', ADDRESSBLOCKHOUSENUMBER: '99',
    ADDRESSSTREETNAME: 'Other Road', ACCEPTEDITEMS: 'Clothing, Furniture', REUSETYPE: 'Donate',
  }, 'donation'), {
    name: 'Donation Centre', address: '315 Outram Road', postalCode: '',
    accepts: 'Clothing, Furniture', reuseType: 'Donate',
  });
});

runTest('donation builds its address from available source components', () => {
  assert.deepEqual(getPointDetails({
    ADDRESSBLOCKHOUSENUMBER: '315', ADDRESSSTREETNAME: 'Outram Road',
    ADDRESSBUILDINGNAME: 'Tan Boon Liat Building #08-06A',
  }, 'donation'), {
    name: 'Donation Point', address: '315, Outram Road, Tan Boon Liat Building #08-06A', postalCode: '',
  });
  assert.deepEqual(getPointDetails({ ADDRESSSTREETNAME: 'Outram Road' }, 'donation'), {
    name: 'Donation Point', address: 'Outram Road', postalCode: '',
  });
});

runTest('e-waste prefers NAME, then Name, then the existing default', () => {
  for (const [properties, expected] of [
    [{ NAME: 'ALBA', Name: 'Legacy name' }, 'ALBA'],
    [{ Name: 'Legacy name' }, 'Legacy name'],
    [{}, 'E-Waste Point'],
  ] as const) {
    assert.deepEqual(getPointDetails({ ...properties, ADDRESSSTREETNAME: 'Alexandra Road',
      DESCRIPTION: 'Bin collection; E-waste accepted: Batteries only' }, 'ewaste'), {
      name: expected, address: 'Alexandra Road', postalCode: '', accepts: 'Batteries',
    });
  }
});

runTest('e-waste accepted-item labels use the exact recognized source descriptions', () => {
  const descriptions = [
    ['Bin collection; E-waste accepted: ICT equipment, Batteries and Lamps only', 'ICT equipment, Batteries, Lamps'],
    ['Bin collection; E-waste accepted: Batteries and Lamps only', 'Batteries, Lamps'],
    ['Bin collection; E-waste accepted: Batteries only', 'Batteries'],
    ['Manned collection (Contact staff for disposal); ; ; E-waste accepted: ICT equipment and Batteries only', 'ICT equipment, Batteries'],
    ['Bin collection; E-waste accepted: Non-regulated products only; E.g. Small household appliances, gaming consoles, audio systems, power supplies', 'Small appliances'],
    ['Manned collection (Contact staff for disposal); ; ; E-waste accepted: ICT equipment, Batteries and Lamps only', 'ICT equipment, Batteries, Lamps'],
    ['Manned collection (Contact staff for disposal); ; ; E-waste accepted: Batteries and Lamps only', 'Batteries, Lamps'],
    ['Drop-off and Bin collection; All regulated consumer products under First Schedule at https://go.gov.sg/prod-def-sl, Large Household Appliances, ICT Equipment, Portable Batteries, Lamps, Electric Mobility Devices', 'All regulated e-waste'],
  ] as const;
  for (const channel of ['ewaste', 'ewaste_battery', 'lighting'] as const) {
    for (const [DESCRIPTION, accepts] of descriptions) {
      assert.deepEqual(getPointDetails({ DESCRIPTION }, channel), {
        name: 'E-Waste Point', address: '', postalCode: '', accepts,
      });
    }
  }
});

console.log('All point detail tests passed');
