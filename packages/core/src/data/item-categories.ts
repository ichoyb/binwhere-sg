import type { ClassifyResult } from '../types/classify';

export interface CategoryItem {
  name: string;
  result: ClassifyResult;
}

export interface ItemCategory {
  id: string;
  label: string;
  icon: string;
  items: CategoryItem[];
}

/**
 * Pre-generated classification results for the dropdown category selector.
 * Drafted by the same text model the live classifier uses, with a category-specific
 * prompt aligned to the same channel rules, then human-reviewed for accuracy. The
 * review is the point: these strings ship without a model in the loop, so they are
 * held to a higher bar than a live answer that the user can re-run.
 *
 * To regenerate: TOKENHUB_API_KEY=... node scripts/generate-categories.mjs
 */
export const ITEM_CATEGORIES: ItemCategory[] = [
  {
    id: 'paper',
    label: 'Paper & Cardboard',
    icon: '\u{1F4C4}',
    items: [
      {
        name: 'Newspaper',
        result: {
          item: 'Newspaper',
          status: 'recyclable',
          confidence: 0.95,
          channel: 'blue_bin',
          reason: 'Newspapers are clean, dry paper products that are widely recyclable in Singapore\'s blue bin system.',
          preparation: ['Keep dry and clean', 'Remove any plastic wrapping', 'Stack neatly or fold'],
          tip: 'Bundle newspapers together to save space in the blue bin.',
        },
      },
      {
        name: 'Cardboard Box',
        result: {
          item: 'Cardboard Box',
          status: 'recyclable',
          confidence: 0.95,
          channel: 'blue_bin',
          reason: 'Cardboard boxes are recyclable. Flatten them to save space in the blue bin.',
          preparation: ['Remove all tape and labels if possible', 'Flatten the box', 'Keep dry — wet cardboard goes to general waste'],
          tip: 'Cut large boxes into smaller pieces for easier recycling.',
        },
      },
      {
        name: 'Magazine',
        result: {
          item: 'Magazine',
          status: 'recyclable',
          confidence: 0.9,
          channel: 'blue_bin',
          reason: 'Magazines, including glossy pages, are accepted in Singapore\'s blue recycling bins.',
          preparation: ['Remove plastic wrapping', 'Keep dry'],
          tip: 'No need to remove staples — the recycling process handles them.',
        },
      },
      {
        name: 'Office Paper',
        result: {
          item: 'Office Paper',
          status: 'recyclable',
          confidence: 0.95,
          channel: 'blue_bin',
          reason: 'Office paper (printed or blank) is one of the most commonly recycled materials in the blue bin.',
          preparation: ['Remove plastic folders or binder clips', 'Keep dry'],
          tip: 'Shredded paper can also go into the blue bin — place it in a paper bag to prevent scattering.',
        },
      },
      {
        name: 'Envelope',
        result: {
          item: 'Envelope',
          status: 'recyclable',
          confidence: 0.85,
          channel: 'blue_bin',
          reason: 'Paper envelopes are recyclable. Envelopes with small plastic windows are also accepted.',
          preparation: ['Remove any non-paper contents', 'Keep dry'],
          tip: 'Padded envelopes with bubble wrap should have the bubble wrap separated and disposed of separately.',
        },
      },
      {
        name: 'Paper Bag',
        result: {
          item: 'Paper Bag',
          status: 'recyclable',
          confidence: 0.9,
          channel: 'blue_bin',
          reason: 'Clean paper bags are recyclable in the blue bin.',
          preparation: ['Remove any handles made of rope or ribbon', 'Flatten the bag', 'Ensure it is clean and dry'],
          tip: 'Reuse paper bags for shopping before recycling them.',
        },
      },
      {
        name: 'Egg Carton (Paper)',
        result: {
          item: 'Egg Carton (Paper)',
          status: 'recyclable',
          confidence: 0.85,
          channel: 'blue_bin',
          reason: 'Paper egg cartons are recyclable if clean and dry. Styrofoam egg cartons are NOT recyclable.',
          preparation: ['Ensure it is the paper/cardboard type, not styrofoam', 'Remove any food residue', 'Keep dry'],
          tip: 'Styrofoam egg cartons go to general waste — only paper ones are recyclable.',
        },
      },
      {
        name: 'Milk Carton / Tetra Pak',
        result: {
          item: 'Milk Carton / Tetra Pak',
          status: 'recyclable',
          confidence: 0.85,
          channel: 'blue_bin',
          reason: 'Tetra Pak cartons are recyclable in Singapore. Rinse before recycling.',
          preparation: ['Rinse out remaining liquid', 'Flatten the carton', 'Keep the cap on after rinsing'],
          tip: 'Tetra Pak has a dedicated recycling process — don\'t worry about the mixed materials.',
        },
      },
    ],
  },
  {
    id: 'plastic',
    label: 'Plastic',
    icon: '\u267B\uFE0F',
    items: [
      {
        name: 'PET Bottle',
        result: {
          item: 'PET Bottle',
          status: 'recyclable',
          confidence: 0.95,
          channel: 'blue_bin',
          reason: 'PET (polyethylene terephthalate) bottles are one of the most recyclable plastics. Look for the #1 recycling symbol.',
          preparation: ['Empty and rinse the bottle', 'Remove the cap (recycle separately)', 'Do not crush it — crushed containers are refused at Return Points'],
          tip: 'If it carries a Deposit Mark, take it to a BCRS Return Point instead and get S$0.10 back. Without a Deposit Mark, the Blue Recycling Bin is right.',
        },
      },
      {
        name: 'Plastic Container',
        result: {
          item: 'Plastic Container',
          status: 'recyclable',
          confidence: 0.9,
          channel: 'blue_bin',
          reason: 'Most rigid plastic containers (takeaway boxes, food containers) are recyclable if clean and dry.',
          preparation: ['Rinse out food residue', 'Let it dry', 'Check for recycling symbol (#1-#7)'],
          tip: 'Heavily stained containers that can\'t be cleaned should go to general waste.',
        },
      },
      {
        name: 'Plastic Bag (Clean)',
        result: {
          item: 'Plastic Bag (Clean)',
          status: 'recyclable',
          confidence: 0.8,
          channel: 'blue_bin',
          reason: 'Clean, dry plastic bags can be recycled in the blue bin. Dirty or wet bags go to general waste.',
          preparation: ['Ensure the bag is clean and dry', 'Tie bags together to prevent them from flying away'],
          tip: 'Consider reusing plastic bags before recycling. Dirty bags contaminate other recyclables.',
        },
      },
      {
        name: 'Shampoo Bottle',
        result: {
          item: 'Shampoo Bottle',
          status: 'recyclable',
          confidence: 0.9,
          channel: 'blue_bin',
          reason: 'Shampoo and body wash bottles (usually HDPE #2 or PP #5) are recyclable in the blue bin.',
          preparation: ['Empty the bottle completely', 'Rinse with water', 'Leave the cap on'],
          tip: 'No need to remove the label or pump — just ensure it\'s rinsed out.',
        },
      },
      {
        name: 'Yoghurt Cup',
        result: {
          item: 'Yoghurt Cup',
          status: 'recyclable',
          confidence: 0.85,
          channel: 'blue_bin',
          reason: 'Plastic yoghurt cups are recyclable if rinsed clean. The foil lid can be recycled too.',
          preparation: ['Scrape out remaining yoghurt', 'Rinse the cup', 'Peel off and rinse the foil lid (recycle separately)'],
          tip: 'A quick rinse is enough — it doesn\'t need to be spotless.',
        },
      },
      {
        name: 'Styrofoam',
        result: {
          item: 'Styrofoam',
          status: 'not_recyclable',
          confidence: 0.95,
          channel: 'general_waste',
          reason: 'Styrofoam (expanded polystyrene) is not recyclable in Singapore\'s blue bin system. It must go to general waste.',
          preparation: ['Place in general waste bin', 'Do NOT put in blue bin — it contaminates recyclables'],
          tip: 'Avoid styrofoam containers when possible. Bring your own reusable containers.',
        },
      },
      {
        name: 'Cling Wrap',
        result: {
          item: 'Cling Wrap',
          status: 'not_recyclable',
          confidence: 0.9,
          channel: 'general_waste',
          reason: 'Cling wrap (plastic film) is not recyclable in Singapore\'s blue bin system due to contamination and sorting difficulties.',
          preparation: ['Dispose in general waste bin'],
          tip: 'Consider switching to reusable beeswax wraps or silicone lids as eco-friendly alternatives.',
        },
      },
    ],
  },
  {
    id: 'metal',
    label: 'Metal',
    icon: '\u{1F527}',
    items: [
      {
        name: 'Aluminium Can',
        result: {
          item: 'Aluminium Can',
          status: 'recyclable',
          confidence: 0.95,
          channel: 'blue_bin',
          reason: 'Aluminium cans are highly recyclable and can be recycled indefinitely without quality loss.',
          preparation: ['Empty the can', 'Give it a quick rinse', 'Do not crush it — crushed containers are refused at Return Points'],
          tip: 'If it carries a Deposit Mark, take it to a BCRS Return Point instead and get S$0.10 back. Without a Deposit Mark, the Blue Recycling Bin is right.',
        },
      },
      {
        name: 'Tin Can',
        result: {
          item: 'Tin Can',
          status: 'recyclable',
          confidence: 0.95,
          channel: 'blue_bin',
          reason: 'Tin cans (steel/tinplate food cans) are recyclable in the blue bin.',
          preparation: ['Rinse out food residue', 'Remove paper labels if easy (optional)', 'Push the lid inside the can for safety'],
          tip: 'Labels are fine to leave on — they burn off during the recycling process.',
        },
      },
      {
        name: 'Metal Lid',
        result: {
          item: 'Metal Lid',
          status: 'recyclable',
          confidence: 0.9,
          channel: 'blue_bin',
          reason: 'Metal lids from jars and bottles are recyclable in the blue bin.',
          preparation: ['Rinse off food residue', 'Place separately in the blue bin'],
          tip: 'Small metal lids can be collected inside a tin can to prevent them from falling through sorting machines.',
        },
      },
      {
        name: 'Aerosol Can (Empty)',
        result: {
          item: 'Aerosol Can (Empty)',
          status: 'recyclable',
          confidence: 0.85,
          channel: 'blue_bin',
          reason: 'Empty aerosol cans are recyclable in the blue bin. They must be completely empty.',
          preparation: ['Ensure the can is completely empty', 'Do NOT puncture or crush the can', 'Remove the plastic cap if possible'],
          tip: 'Partially full aerosol cans are hazardous waste — bring them to a hazardous waste collection point.',
        },
      },
      {
        name: 'Aluminium Foil (Clean)',
        result: {
          item: 'Aluminium Foil (Clean)',
          status: 'recyclable',
          confidence: 0.85,
          channel: 'blue_bin',
          reason: 'Clean aluminium foil is recyclable. Foil contaminated with food grease is not.',
          preparation: ['Wipe or rinse off food residue', 'Scrunch into a ball (easier to sort)', 'Only recycle if reasonably clean'],
          tip: 'Heavily greased foil (e.g. from BBQ) should go to general waste.',
        },
      },
    ],
  },
  {
    id: 'glass',
    label: 'Glass',
    icon: '\u{1FAD9}',
    items: [
      {
        name: 'Glass Bottle',
        result: {
          item: 'Glass Bottle',
          status: 'recyclable',
          confidence: 0.95,
          channel: 'blue_bin',
          reason: 'Glass bottles are recyclable in Singapore\'s blue bin. Glass can be recycled endlessly without quality loss.',
          preparation: ['Empty and rinse the bottle', 'Remove the cap (metal caps are recyclable too)', 'No need to remove labels'],
          tip: 'Handle with care to avoid breakage. Broken glass should be wrapped in newspaper before placing in the bin.',
        },
      },
      {
        name: 'Glass Jar',
        result: {
          item: 'Glass Jar',
          status: 'recyclable',
          confidence: 0.95,
          channel: 'blue_bin',
          reason: 'Glass jars (jam, sauce, pickle jars) are recyclable in the blue bin.',
          preparation: ['Rinse out food residue', 'Remove metal lid (recycle separately)', 'No need to remove labels'],
          tip: 'A quick rinse is sufficient — it doesn\'t need to be spotless.',
        },
      },
      {
        name: 'Wine Bottle',
        result: {
          item: 'Wine Bottle',
          status: 'recyclable',
          confidence: 0.9,
          channel: 'blue_bin',
          reason: 'Wine bottles are made of recyclable glass and can go in the blue bin.',
          preparation: ['Empty the bottle', 'Remove the cork (cork is not recyclable in blue bin)', 'Rinse if possible'],
          tip: 'Natural corks can be composted. Synthetic corks go to general waste.',
        },
      },
      {
        name: 'Mirror',
        result: {
          item: 'Mirror',
          status: 'not_recyclable',
          confidence: 0.9,
          channel: 'general_waste',
          reason: 'Mirrors are NOT recyclable in the blue bin. The reflective coating and glass composition differ from container glass and contaminate the recycling process.',
          preparation: ['Wrap carefully in newspaper to prevent injury', 'Place in general waste', 'For large mirrors, schedule bulky waste pickup'],
          tip: 'Consider donating mirrors in good condition to second-hand shops.',
        },
      },
      {
        name: 'Pyrex / Ceramic',
        result: {
          item: 'Pyrex / Ceramic',
          status: 'not_recyclable',
          confidence: 0.9,
          channel: 'general_waste',
          reason: 'Pyrex (borosilicate glass) and ceramics have different melting points from regular glass. They contaminate glass recycling and must go to general waste.',
          preparation: ['Wrap broken pieces in newspaper', 'Label "sharp" if broken', 'Place in general waste bin'],
          tip: 'Donate unbroken Pyrex or ceramic items to second-hand shops instead of throwing them away.',
        },
      },
    ],
  },
  {
    id: 'electronics',
    label: 'Electronics',
    icon: '\u{1F4BB}',
    items: [
      {
        name: 'Laptop',
        result: {
          item: 'Laptop',
          status: 'special_handling',
          confidence: 0.95,
          channel: 'ewaste',
          reason: 'Laptops are regulated e-waste in Singapore. They contain valuable metals and hazardous components that require proper recycling at designated e-waste collection points.',
          preparation: ['Back up and wipe personal data', 'Remove any external accessories', 'Keep the battery inside (collection points handle it)'],
          tip: 'Working laptops in good condition can be donated to charities like Engineering Good.',
        },
      },
      {
        name: 'Mobile Phone',
        result: {
          item: 'Mobile Phone',
          status: 'special_handling',
          confidence: 0.95,
          channel: 'ewaste',
          reason: 'Mobile phones are regulated e-waste. They must be disposed of at designated e-waste collection points, not in blue bins or general waste.',
          preparation: ['Factory reset and remove personal data', 'Remove SIM card and memory card', 'Remove phone case (recycle case separately)'],
          tip: 'StarHub, Singtel and M1 stores accept old phones for recycling. Working phones can be donated.',
        },
      },
      {
        name: 'Tablet',
        result: {
          item: 'Tablet',
          status: 'special_handling',
          confidence: 0.95,
          channel: 'ewaste',
          reason: 'Tablets are regulated e-waste containing lithium batteries and precious metals. Bring to an e-waste collection point.',
          preparation: ['Factory reset and wipe personal data', 'Remove protective case and screen protector'],
          tip: 'Consider donating working tablets to Digital for Life programs or charities.',
        },
      },
      {
        name: 'TV / Monitor',
        result: {
          item: 'TV / Monitor',
          status: 'special_handling',
          confidence: 0.95,
          channel: 'ewaste',
          reason: 'TVs and monitors are regulated e-waste. Under Singapore\'s Extended Producer Responsibility scheme, retailers offering delivery must provide 1-for-1 takeback.',
          preparation: ['Disconnect all cables', 'Wipe personal data if it\'s a smart TV'],
          tip: 'When buying a new TV, ask the retailer for 1-for-1 takeback of your old one — it\'s free.',
        },
      },
      {
        name: 'Printer',
        result: {
          item: 'Printer',
          status: 'special_handling',
          confidence: 0.9,
          channel: 'ewaste',
          reason: 'Printers are ICT equipment classified as regulated e-waste. They must go to e-waste collection points.',
          preparation: ['Remove ink/toner cartridges (recycle separately)', 'Remove any paper from trays', 'Disconnect cables'],
          tip: 'Some printer brands (HP, Canon) have cartridge recycling programs — check their websites.',
        },
      },
      {
        name: 'Cables & Chargers',
        result: {
          item: 'Cables & Chargers',
          status: 'special_handling',
          confidence: 0.9,
          channel: 'ewaste',
          reason: 'Cables and chargers contain copper and other metals. They should be recycled at e-waste collection points.',
          preparation: ['Bundle cables neatly', 'Separate different types if possible'],
          tip: 'E-waste collection bins in malls and community centres accept small items like cables.',
        },
      },
      {
        name: 'Power Bank',
        result: {
          item: 'Power Bank',
          status: 'special_handling',
          confidence: 0.9,
          channel: 'ewaste_battery',
          reason: 'Power banks contain lithium-ion batteries which are hazardous if improperly disposed. They must go to battery/e-waste collection points.',
          preparation: ['Discharge if possible before disposal', 'Do NOT puncture or crush', 'Tape over exposed contacts'],
          tip: 'Swollen or damaged power banks are a fire hazard — handle carefully and bring to an e-waste point promptly.',
        },
      },
    ],
  },
  {
    id: 'batteries',
    label: 'Batteries',
    icon: '\u{1F50B}',
    items: [
      {
        name: 'AA / AAA Battery',
        result: {
          item: 'AA / AAA Battery',
          status: 'special_handling',
          confidence: 0.95,
          channel: 'ewaste_battery',
          reason: 'All batteries are regulated waste in Singapore. They contain heavy metals and chemicals that are harmful if sent to landfill.',
          preparation: ['Tape over the terminals with non-conductive tape to prevent short circuits', 'Store in a non-metallic container', 'Do NOT throw in general waste or blue bin'],
          tip: 'Battery recycling bins are available at many supermarkets, community centres, and electronics stores.',
        },
      },
      {
        name: 'Button Cell Battery',
        result: {
          item: 'Button Cell Battery',
          status: 'special_handling',
          confidence: 0.95,
          channel: 'ewaste_battery',
          reason: 'Button cell batteries (found in watches, hearing aids, toys) contain mercury or silver oxide. They must be recycled at designated collection points.',
          preparation: ['Tape over both sides of the battery', 'Keep away from children (swallowing hazard)', 'Store safely until disposal'],
          tip: 'Button cells are small but very toxic — never dispose of them in general waste.',
        },
      },
      {
        name: 'Lithium-Ion Battery',
        result: {
          item: 'Lithium-Ion Battery',
          status: 'special_handling',
          confidence: 0.95,
          channel: 'ewaste_battery',
          reason: 'Lithium-ion batteries (from phones, laptops, e-scooters) are a fire hazard if improperly disposed. They require special handling at e-waste collection points.',
          preparation: ['Tape over the terminals', 'Do NOT puncture, crush, or expose to heat', 'Place in a fireproof bag if swollen'],
          tip: 'Swollen lithium batteries can catch fire — bring to a collection point immediately and handle with care.',
        },
      },
      {
        name: 'Car Battery',
        result: {
          item: 'Car Battery',
          status: 'special_handling',
          confidence: 0.9,
          channel: 'ewaste_battery',
          reason: 'Car batteries (lead-acid) contain sulfuric acid and lead. They are hazardous and must be disposed of properly at designated collection points.',
          preparation: ['Keep upright to prevent acid leakage', 'Do NOT open or drain', 'Transport carefully in a secure container'],
          tip: 'Most car workshops and battery retailers accept old car batteries for recycling.',
        },
      },
    ],
  },
  {
    id: 'textile',
    label: 'Textile & Clothes',
    icon: '\u{1F455}',
    items: [
      {
        name: 'T-Shirt',
        result: {
          item: 'T-Shirt',
          status: 'consider_donating',
          confidence: 0.9,
          channel: 'textile',
          reason: 'Clothing in wearable condition should be donated or placed in textile recycling bins. Even worn-out textiles can be recycled into industrial rags or insulation.',
          preparation: ['Wash and dry before donating', 'Fold neatly and place in a bag', 'Separate wearable from damaged items'],
          tip: 'Textile recycling bins (e.g. from SG Recycle, Cloop) are found at HDB void decks and malls.',
        },
      },
      {
        name: 'Jeans',
        result: {
          item: 'Jeans',
          status: 'consider_donating',
          confidence: 0.9,
          channel: 'textile',
          reason: 'Denim jeans are highly durable and can be donated if in good condition, or recycled into textile fibre.',
          preparation: ['Wash before donating', 'Empty all pockets', 'Remove non-textile accessories if damaged'],
          tip: 'Some brands (H&M, Uniqlo) have in-store garment collection programs.',
        },
      },
      {
        name: 'Shoes',
        result: {
          item: 'Shoes',
          status: 'consider_donating',
          confidence: 0.85,
          channel: 'textile',
          reason: 'Shoes in wearable condition can be donated via textile collection bins or charity organizations.',
          preparation: ['Clean the shoes', 'Tie pairs together or use a rubber band', 'Place in a bag'],
          tip: 'Soles Up! and The Salvation Army accept used shoes in Singapore.',
        },
      },
      {
        name: 'Handbag',
        result: {
          item: 'Handbag',
          status: 'consider_donating',
          confidence: 0.85,
          channel: 'textile',
          reason: 'Handbags in usable condition should be donated. Textile collection bins accept bags as well.',
          preparation: ['Empty all contents', 'Wipe clean', 'Place in textile collection bin or donate directly'],
          tip: 'Good quality bags can be sold on platforms like Carousell for reuse.',
        },
      },
      {
        name: 'Curtains',
        result: {
          item: 'Curtains',
          status: 'consider_donating',
          confidence: 0.85,
          channel: 'textile',
          reason: 'Curtains are textiles that can be recycled or donated via textile collection bins.',
          preparation: ['Remove hooks and rings', 'Wash if possible', 'Fold and bag neatly'],
          tip: 'Large textile items can also be donated to charities like The Salvation Army with free pickup.',
        },
      },
      {
        name: 'Bedsheets',
        result: {
          item: 'Bedsheets',
          status: 'consider_donating',
          confidence: 0.85,
          channel: 'textile',
          reason: 'Bedsheets and linen can be donated if in good condition or recycled through textile collection points.',
          preparation: ['Wash and dry thoroughly', 'Fold neatly', 'Place in bag for textile collection bin'],
          tip: 'Old bedsheets can be repurposed as cleaning rags at home before recycling.',
        },
      },
    ],
  },
  {
    id: 'lighting',
    label: 'Lighting',
    icon: '\u{1F4A1}',
    items: [
      {
        name: 'Fluorescent Tube',
        result: {
          item: 'Fluorescent Tube',
          status: 'special_handling',
          confidence: 0.95,
          channel: 'lighting',
          reason: 'Fluorescent tubes contain mercury and must not be placed in general waste or blue bins. They require disposal at designated lighting waste collection points.',
          preparation: ['Handle with care — do not break', 'Keep in original packaging if possible', 'Transport carefully to collection point'],
          tip: 'Many hardware stores and community recycling programmes accept fluorescent tubes.',
        },
      },
      {
        name: 'CFL Bulb',
        result: {
          item: 'CFL Bulb',
          status: 'special_handling',
          confidence: 0.95,
          channel: 'lighting',
          reason: 'Compact fluorescent lamp (CFL) bulbs contain a small amount of mercury. They must be recycled at lighting waste collection points.',
          preparation: ['Handle gently to avoid breakage', 'Place in a sealed bag for transport', 'If broken, ventilate the area and sweep up carefully'],
          tip: 'Consider switching to LED bulbs — they last longer, use less energy, and contain no mercury.',
        },
      },
      {
        name: 'LED Bulb',
        result: {
          item: 'LED Bulb',
          status: 'special_handling',
          confidence: 0.85,
          channel: 'lighting',
          reason: 'LED bulbs contain electronic components and should be recycled at e-waste or lighting collection points, even though they don\'t contain mercury.',
          preparation: ['Let the bulb cool before handling', 'Place in original packaging if available'],
          tip: 'LED bulbs last 15,000-50,000 hours — much longer than incandescent or CFL alternatives.',
        },
      },
      {
        name: 'Incandescent Bulb',
        result: {
          item: 'Incandescent Bulb',
          status: 'not_recyclable',
          confidence: 0.85,
          channel: 'general_waste',
          reason: 'Incandescent bulbs are not hazardous (no mercury) but are also not recyclable. They should go to general waste.',
          preparation: ['Wrap in newspaper or paper to prevent breakage', 'Place in general waste bin'],
          tip: 'Incandescent bulbs are being phased out globally. Switch to LED for energy savings.',
        },
      },
    ],
  },
  {
    id: 'hazardous',
    label: 'Hazardous Waste',
    icon: '\u26A0\uFE0F',
    items: [
      {
        name: 'Paint',
        result: {
          item: 'Paint',
          status: 'special_handling',
          confidence: 0.95,
          channel: 'hazardous',
          reason: 'Paint contains toxic chemicals and solvents. It must be disposed of at designated hazardous waste collection points. Never pour down drains or into general waste.',
          preparation: ['Keep in original container with lid sealed', 'Do NOT mix different types of paint', 'Transport upright to avoid spills'],
          tip: 'Dried-out paint cans (completely dry with no liquid) can go to general waste. Let small amounts dry out naturally.',
        },
      },
      {
        name: 'Pesticide',
        result: {
          item: 'Pesticide',
          status: 'special_handling',
          confidence: 0.95,
          channel: 'hazardous',
          reason: 'Pesticides and insecticides are toxic chemicals that must be disposed of at hazardous waste collection points. They contaminate soil and water if improperly discarded.',
          preparation: ['Keep in original labeled container', 'Seal tightly to prevent leaks', 'Do NOT transfer to food containers'],
          tip: 'NEA organises periodic hazardous waste collection drives — check nea.gov.sg for schedules.',
        },
      },
      {
        name: 'Motor Oil',
        result: {
          item: 'Motor Oil',
          status: 'special_handling',
          confidence: 0.95,
          channel: 'hazardous',
          reason: 'Used motor oil is a hazardous material. One litre can contaminate one million litres of water. It must go to hazardous waste collection.',
          preparation: ['Store in a sealed, leak-proof container', 'Do NOT mix with other fluids', 'Transport upright and secure'],
          tip: 'Most car workshops accept used motor oil for proper disposal and recycling.',
        },
      },
      {
        name: 'Cleaning Chemical',
        result: {
          item: 'Cleaning Chemical',
          status: 'special_handling',
          confidence: 0.9,
          channel: 'hazardous',
          reason: 'Household cleaning chemicals (bleach, drain cleaner, oven cleaner) are hazardous waste. They should be brought to designated collection points.',
          preparation: ['Keep in original container', 'Ensure lid is tightly sealed', 'Do NOT mix different chemicals — this can create toxic gases'],
          tip: 'Switch to eco-friendly cleaning products (vinegar, baking soda) to reduce hazardous waste.',
        },
      },
      {
        name: 'Expired Medicine',
        result: {
          item: 'Expired Medicine',
          status: 'special_handling',
          confidence: 0.9,
          channel: 'hazardous',
          reason: 'Expired or unused medicines should not be flushed or thrown in general waste. They can contaminate water supplies and soil.',
          preparation: ['Keep in original packaging', 'Remove personal information from labels', 'Bring to a collection point or pharmacy'],
          tip: 'Many Watsons and Guardian pharmacies in Singapore accept unused medicines for safe disposal.',
        },
      },
    ],
  },
  {
    id: 'furniture',
    label: 'Furniture & Bulky',
    icon: '\u{1F6CB}\uFE0F',
    items: [
      {
        name: 'Sofa',
        result: {
          item: 'Sofa',
          status: 'special_handling',
          confidence: 0.9,
          channel: 'bulky_waste',
          reason: 'Sofas are bulky waste items that do not fit in regular bins. Schedule a bulky waste removal with your town council or HDB.',
          preparation: ['Remove cushion covers for textile recycling if possible', 'Place at designated bulky waste area in your estate'],
          tip: 'If the sofa is in good condition, consider donating via Carousell Free, Pass It On, or The Salvation Army.',
        },
      },
      {
        name: 'Mattress',
        result: {
          item: 'Mattress',
          status: 'special_handling',
          confidence: 0.9,
          channel: 'bulky_waste',
          reason: 'Mattresses are bulky waste. They need to be scheduled for pickup by your town council or disposed of at the designated bulky waste area.',
          preparation: ['Remove bedsheets and mattress protector', 'If possible, fold or roll the mattress for easier handling'],
          tip: 'Some mattress retailers offer removal of your old mattress when delivering a new one.',
        },
      },
      {
        name: 'Table',
        result: {
          item: 'Table',
          status: 'special_handling',
          confidence: 0.85,
          channel: 'bulky_waste',
          reason: 'Tables are bulky waste items. Contact your town council for scheduled bulky waste collection.',
          preparation: ['Remove any detachable legs or parts for easier handling', 'Clear all items from the table'],
          tip: 'Good condition tables can be listed on Carousell Free or donated to The Salvation Army.',
        },
      },
      {
        name: 'Chair',
        result: {
          item: 'Chair',
          status: 'special_handling',
          confidence: 0.85,
          channel: 'bulky_waste',
          reason: 'Chairs are classified as bulky waste. Dispose via your estate\'s bulky waste collection schedule.',
          preparation: ['Fold if it\'s a foldable chair', 'Remove cushions for textile recycling if applicable'],
          tip: 'Office chairs with gas cylinders should be handled carefully — the cylinder is under pressure.',
        },
      },
      {
        name: 'Bookshelf',
        result: {
          item: 'Bookshelf',
          status: 'special_handling',
          confidence: 0.85,
          channel: 'bulky_waste',
          reason: 'Bookshelves are bulky waste items. Schedule collection through your town council or HDB.',
          preparation: ['Remove all items from shelves', 'Disassemble if possible for easier transport', 'Remove screws and hardware'],
          tip: 'Donate bookshelves in good condition — many community groups and charities welcome furniture donations.',
        },
      },
    ],
  },
];
