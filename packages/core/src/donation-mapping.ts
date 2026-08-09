/**
 * Map an item name to the NEA ACCEPTEDITEMS category for donation point filtering.
 * Returns undefined if no matching category found (will show all donation points).
 */

const MAPPINGS: [RegExp, string][] = [
  [/shirt|jeans|dress|jacket|clothes|clothing|pants|skirt|blouse|sweater|coat|hoodie|uniform|scarf|socks|underwear|bra/i, 'Clothing'],
  [/shoe|sneaker|sandal|boot|slipper|heel/i, 'Shoes'],
  [/bag|handbag|backpack|purse|wallet|luggage|suitcase/i, 'Bags and accessories'],
  [/book|magazine|textbook|novel|comic|encyclopedia/i, 'Books'],
  [/sofa|table|chair|shelf|cabinet|desk|mattress|bed|wardrobe|cupboard|drawer|bench|stool|rack|bookcase/i, 'Furniture'],
  [/toy|doll|lego|puzzle|board game|stuffed|plush|action figure/i, 'Toys'],
  [/laptop|phone|tablet|computer|printer|monitor|keyboard|mouse|router|modem|scanner|hard drive|headphone|speaker|camera/i, 'ICT equipment'],
  [/fridge|washer|dryer|oven|microwave|air.?con|dishwasher|iron|vacuum|fan|heater|rice cooker|kettle|toaster|blender/i, 'Large home appliances'],
];

export function mapItemToAcceptedItem(item: string): string | undefined {
  for (const [re, cat] of MAPPINGS) {
    if (re.test(item)) return cat;
  }
  return undefined;
}
