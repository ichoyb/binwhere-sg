import type { ChannelType, ClassifyStatus, Locale } from '@binwhere/core';

export const BCRS_POLICY_SOURCE = {
  url: 'https://www.nea.gov.sg/our-services/waste-management/beverage-container-return-scheme/for-consumers',
  productApprovalGuideUrl: 'https://bcrs.sg/files/2026-02-17_Phase_3_Product_Approval_Guide.pdf',
  reviewedAt: '2026-11-02',
  authority: 'National Environment Agency, Singapore',
  invariants: [
    'Route a single intact, uncontaminated prepackaged plastic or metal drink bottle, can or cup to return_point by container category. Capacity only excludes: a stated or visible capacity outside 150ml-3L routes to blue_bin, and an unknown capacity withholds nothing.',
    'The S$0.10 refund requires purchase in Singapore and the Deposit Mark; the machine scans the product barcode and decides acceptance.',
    'A readable 10¢ SG RETURN mark on the drink container fills only an unknown shape or material, never known exclusions.',
    'Observed contamination takes priority over damage, out-of-range volume and explicit text exclusions; these route to general_waste and blue_bin respectively.',
    'Glass, cartons, pouches, non-beverages, powdered drinks, food for special medical purposes and freshly prepared drinks are outside the deposit category.',
    'Multiple containers, outer packaging and scenes without an identifiable container stay not_sure with no action.',
  ],
} as const;

export const BCRS_BASELINE = {
  id: 'sg-bcrs-v22',
  reviewedAt: '2026-11-02',
  holdoutRule: "All previously exposed images, including the four v21 holdouts, are regression cases. After candidate code and labels are frozen, select new pixel-reviewed holdouts with at least two return_point truths and at least two non-return_point truths. Each holdout must pass every classification, action and safety assertion with zero provider errors. Apply the ordered v22 container-category rules to the submitted pixels. Image exactness remains at least 95%, return-point recall at least 90%, and wrong non-null channels and false return points remain zero tolerance. Reject near-duplicate source pairs at 0.995 before any model call. These checks are developer-visible, frozen and non-adaptive, not sealed blind tests.",
} as const;

export interface ExpectedClassification {
  channel: ChannelType | null;
  status: ClassifyStatus;
  /** Exact strings that must survive localisation unchanged. */
  requiredExactText?: readonly string[];
  /** Safety cases using not_sure must stay below the prompt's confidence boundary. */
  maxConfidence?: number;
  /** Candidate action policy; historical profiles retain their original wire output. */
  nextAction?: 'return_container' | 'check_container_type' | null;
}

export interface BcrsTextCase extends ExpectedClassification {
  id: string;
  locale: Locale;
  text: string;
}

interface TextScenario extends ExpectedClassification {
  id: string;
  inputs: Record<Locale, string>;
}

const TEXT_SCENARIOS: readonly TextScenario[] = [
  {
    id: 'official-mark-present',
    channel: 'return_point',
    status: 'recyclable',
    requiredExactText: ['S$0.10'],
    inputs: {
      en: 'Empty 500ml plastic beverage bottle with the official Singapore BCRS Deposit Mark clearly visible. The barcode is intact and the bottle is not crushed.',
      zh: '一个空的500ml塑料饮料瓶，清楚显示新加坡官方BCRS Deposit Mark；条码完整，瓶身未压扁。',
      ms: 'Botol minuman plastik 500ml yang kosong dengan Deposit Mark BCRS Singapura rasmi yang jelas kelihatan. Kod bar masih utuh dan botol tidak kemek.',
      ta: 'அதிகாரப்பூர்வ சிங்கப்பூர் BCRS Deposit Mark தெளிவாகத் தெரியும் காலியான 500ml பிளாஸ்டிக் பான பாட்டில். பார்கோடு சேதமின்றி உள்ளது; பாட்டில் நசுக்கப்படவில்லை.',
    },
  },
  {
    id: 'official-mark-explicitly-absent',
    channel: 'blue_bin',
    status: 'recyclable',
    inputs: {
      en: 'Empty, clean 330ml aluminium beverage can. It does not have the Singapore BCRS Deposit Mark.',
      zh: '一个空的、干净的330ml铝制饮料罐，明确没有新加坡BCRS Deposit Mark。',
      ms: 'Tin minuman aluminium 330ml yang kosong dan bersih. Tin ini tidak mempunyai Deposit Mark BCRS Singapura.',
      ta: 'காலியாகவும் சுத்தமாகவும் உள்ள 330ml அலுமினிய பான கேன். இதில் சிங்கப்பூர் BCRS Deposit Mark இல்லை.',
    },
  },
  {
    id: 'official-mark-unknown',
    channel: 'return_point',
    status: 'recyclable',
    requiredExactText: ['S$0.10'],
    nextAction: 'return_container',
    inputs: {
      en: 'This appears to be a plastic drink bottle, but the information provided does not show whether it has the Singapore BCRS Deposit Mark.',
      zh: '这看起来是一个塑料饮料瓶，但现有信息无法看出它是否带有新加坡BCRS Deposit Mark。',
      ms: 'Ini kelihatan seperti botol minuman plastik, tetapi maklumat yang diberikan tidak menunjukkan sama ada botol ini mempunyai Deposit Mark BCRS Singapura.',
      ta: 'இது ஒரு பிளாஸ்டிக் பான பாட்டில் போலத் தெரிகிறது; ஆனால் இதில் சிங்கப்பூர் BCRS Deposit Mark உள்ளதா என்பதை வழங்கப்பட்ட தகவல் காட்டவில்லை.',
    },
  },
  {
    id: 'ordinary-water-bottle',
    channel: 'return_point',
    status: 'recyclable',
    requiredExactText: ['S$0.10'],
    nextAction: 'return_container',
    inputs: {
      en: 'empty plastic water bottle',
      zh: '空的塑料矿泉水瓶',
      ms: 'botol air minuman plastik kosong',
      ta: 'காலியான பிளாஸ்டிக் குடிநீர் பாட்டில்',
    },
  },
  {
    "id": "crushed-aluminium-can",
    "channel": "blue_bin",
    "status": "recyclable",
    "nextAction": null,
    "inputs": {
      "en": "One empty, clean 330ml aluminium drink can that has been crushed.",
      "zh": "一个空的、干净的330ml铝制饮料罐，已经压扁。",
      "ms": "Satu tin minuman aluminium 330ml yang kosong dan bersih, tetapi telah dikemekkan.",
      "ta": "நசுக்கப்பட்ட, காலியான, சுத்தமான ஒரு 330ml அலுமினிய பான கேன்."
    }
  },
  {
    "id": "five-litre-water-bottle",
    "channel": "blue_bin",
    "status": "recyclable",
    "nextAction": null,
    "inputs": {
      "en": "One empty, clean 5L plastic drinking-water bottle.",
      "zh": "一个空的、干净的5L塑料饮用水瓶。",
      "ms": "Satu botol air minuman plastik 5L yang kosong dan bersih.",
      "ta": "காலியான, சுத்தமான ஒரு 5L பிளாஸ்டிக் குடிநீர் பாட்டில்."
    }
  },
  {
    "id": "hundred-ml-cultured-milk-bottle",
    "channel": "blue_bin",
    "status": "recyclable",
    "nextAction": null,
    "inputs": {
      "en": "One empty, clean 100ml plastic cultured milk drink bottle.",
      "zh": "一个空的、干净的100ml塑料乳酸菌饮料瓶。",
      "ms": "Satu botol minuman susu kultur plastik 100ml yang kosong dan bersih.",
      "ta": "காலியான, சுத்தமான ஒரு 100ml பிளாஸ்டிக் நுண்ணுயிர் சேர்க்கப்பட்ட பால் பான பாட்டில்."
    }
  },
  {
    "id": "drink-can-bought-in-johor-bahru",
    "channel": "blue_bin",
    "status": "recyclable",
    "nextAction": null,
    "inputs": {
      "en": "One empty, clean 330ml aluminium drink can bought in Johor Bahru, Malaysia.",
      "zh": "一个在马来西亚新山买的330ml铝制罐装饮料，罐子是空的、干净的。",
      "ms": "Satu tin minuman aluminium 330ml yang dibeli di Johor Bahru, Malaysia. Tin ini kosong dan bersih.",
      "ta": "மலேசியாவின் ஜொகூர் பாருவில் வாங்கிய ஒரு 330ml அலுமினிய பான கேன். அது காலியாகவும் சுத்தமாகவும் உள்ளது."
    }
  },

];

export const BCRS_TEXT_CASES: readonly BcrsTextCase[] = TEXT_SCENARIOS.flatMap(
  (scenario) => (Object.entries(scenario.inputs) as Array<[Locale, string]>).map(
    ([locale, text]) => ({
      id: `${scenario.id}-${locale}`,
      locale,
      text,
      channel: scenario.channel,
      status: scenario.status,
      requiredExactText: scenario.requiredExactText,
      maxConfidence: scenario.maxConfidence,
      nextAction: scenario.nextAction,
    }),
  ),
);

export interface BcrsImageSource {
  id: string;
  filename: string;
  /** The page establishes provenance and the human-reviewed ground truth. */
  sourcePageUrl: string;
  /** Downloaded only into the gitignored test cache; never redistributed by BinWhere. */
  imageUrl: string;
  sha256: string;
  credit: string;
  licence: string;
  reviewedAt: string;
  provenance: string;
  /** Optional deterministic framing that represents the photo submitted by a user. */
  crop?: { left: number; top: number; width: number; height: number };
}

export const BCRS_IMAGE_SOURCES: readonly BcrsImageSource[] = [
  {
    id: 'official-mark-closeup',
    filename: 'official-mark-closeup.webp',
    sourcePageUrl: 'https://www.straitstimes.com/singapore/environment/after-false-starts-and-muted-launch-can-the-beverage-container-return-scheme-improve-recycling-in',
    imageUrl: 'https://cassette.sphdigital.com.sg/image/straitstimes/c0d41c7631e5b23f37e460a37b5e0194cffbdf55f1c9bfa6e588fca0962bb7cb',
    sha256: '7b81aaa06835332811ce7995aa2651ee25fddcfcdb3b66e99fc913426e434bf3',
    credit: 'ST Photo/Mark Cheong',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "A close-up of one drink label has a readable 10\u00a2 SG RETURN mark printed on its container; it fills unknown category facts. No damage or contamination is visible.",
    crop: { left: 450, top: 0, width: 690, height: 900 },
  },
  {
    id: 'official-marked-pair',
    filename: 'official-marked-pair.jpg',
    sourcePageUrl: 'https://www.channelnewsasia.com/singapore/beverage-container-return-scheme-deposit-vending-machine-6018216',
    imageUrl: 'https://dam.mediacorp.sg/image/upload/s--Vk3t3wmj--/f_auto%2Cq_auto/v1/mediacorp/cna/image/2026/03/26/beverage_containers_with_deposit_mark_on_stickers_1.jpg?itok=QiHn0o2b',
    sha256: 'c8ee48fdac2c38e1ea368c86629fa7f44dcce8a4516a1c7d98fe01e393dc0e64',
    credit: 'BCRS Ltd, via CNA',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "A bottle and a can are co-equal foreground subjects; the photograph does not select one container.",
  },
  {
    id: 'official-marked-bottle',
    filename: 'official-marked-bottle.jpg',
    sourcePageUrl: 'https://www.channelnewsasia.com/singapore/beverage-container-return-points-five-minute-walk-hdb-residents-5895361',
    imageUrl: 'https://dam.mediacorp.sg/image/upload/s--pBqP1eG_--/c_crop%2Ch_1729%2Cw_3074%2Cx_0%2Cy_1/c_fill%2Cg_auto%2Ch_468%2Cw_830/fl_relative%2Cg_south_east%2Cl_mediacorp%3Acna%3Awatermark%3A2021-08%3Acna%2Cw_0.1/f_auto%2Cq_auto/v1/mediacorp/cna/image/2026/01/30/jus_4084.jpg?itok=rJkTQ7-f',
    sha256: '8ae964ff398ced34b9388806bb23db49d86cbd3b3650af27e6f25f6ffbd5b8b8',
    credit: 'CNA/Justin Tan',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "One intact clear plastic drinking-water bottle has a readable 600ml capacity. Container category is established independently of mark legibility.",
  },
  {
    id: 'mark-not-visible-bottle',
    filename: 'mark-not-visible-bottle.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Bottle_of_Water.jpg',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ad/Bottle_of_Water.jpg/1920px-Bottle_of_Water.jpg',
    sha256: 'f3da9b617c7efff48f11460467818b7c6a73a5631c6185f1f8417599fba91f18',
    credit: 'Jiafei Slay Queen, Wikimedia Commons',
    licence: 'CC0 1.0',
    reviewedAt: '2026-10-27',
    provenance: "One intact plastic drinking-water bottle is visible with its cap, shoulders and base; its ordinary handheld size is within 150ml-3L. No contamination is visible.",
  },
  {
    id: 'individual-can-mark-not-visible',
    filename: 'individual-can-mark-not-visible.png',
    sourcePageUrl: 'https://mothership.sg/2026/07/ice-mountain-drinks-fairprice-bcrs-logo/',
    imageUrl: 'https://static.mothership.sg/1/2026/07/coverimage-2026-07-23T171244.845.png',
    sha256: 'ccf96edc9a7450a45b9d88360f44bca84d8d1faf7fa10bd8feee1bb9acb2461d',
    credit: 'Photos from Cheah Kok Keong, via Mothership',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "The deterministic crop selects one metal beverage can inside loose wrapping. Its can geometry and ordinary drink-can size establish the category; the wrapping is not a second container.",
    crop: { left: 650, top: 80, width: 350, height: 445 },
  },
  {
    id: 'empty-glass-bottle',
    filename: 'empty-glass-bottle.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Clear_empty_glass_bottle.jpg',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b3/Clear_empty_glass_bottle.jpg/1920px-Clear_empty_glass_bottle.jpg',
    sha256: '5378c7146cb36ab94eaa2f313570b8977a1fa58734e32042ab5a624cf003e122',
    credit: 'Santeri Viinamäki, Wikimedia Commons',
    licence: 'CC BY-SA 4.0',
    reviewedAt: '2026-10-27',
    provenance: "One clean empty glass beverage bottle follows ordinary glass recycling; glass is outside the deposit category.",
  },
  {
    id: 'negative-crushed-can',
    filename: 'negative-crushed-can.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Crushed_Coke_Can_(3921080513).jpg',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4b/Crushed_Coke_Can_%283921080513%29.jpg/1920px-Crushed_Coke_Can_%283921080513%29.jpg',
    sha256: '77802051b725a00ca1c150f62d86b7c34f2829ef99f0c27d50a2e036a1d8f968',
    credit: 'Ian Muttoo (Flickr), Wikimedia Commons',
    licence: 'CC BY-SA 2.0',
    reviewedAt: '2026-11-01',
    provenance: "One crushed and torn 355 mL aluminium can lies on a drain grate. Crushing puts it outside the deposit category; no residue is visible on the can, so ordinary metal recycling applies.",
  },
  {
    id: 'negative-small-cultured-milk-bottle',
    filename: 'negative-small-cultured-milk-bottle.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Yakult_65ml_Vietnam.JPG',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Yakult_65ml_Vietnam.JPG',
    sha256: '9c1841e7842aca11a4228ecb705d1f18fab9889252e03e1763256ebea3ef9b3d',
    credit: 'Dezzawong, Wikimedia Commons',
    licence: 'CC BY-SA 3.0',
    reviewedAt: '2026-11-01',
    provenance: "One sealed plastic cultured-milk drink bottle shows a readable 65ml capacity. Below 150ml it is outside the deposit category and follows ordinary plastic recycling.",
  },
  {
    id: 'negative-large-water-jug',
    filename: 'negative-large-water-jug.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Garrafa_agua_8L.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Garrafa_agua_8L.jpg',
    sha256: '6d951c96cdf45a5b9f0b0187799b4c013cd79c002de026073581cc82cf32953e',
    credit: 'Xavigivax, Wikimedia Commons',
    licence: 'CC BY-SA 3.0',
    reviewedAt: '2026-11-01',
    provenance: "One large handled plastic drinking-water jug; its form and its scale against the ivy and paving put it visibly far above 3L, outside the deposit category. Condensation on the outside is not contamination.",
  },
  {
    id: 'negative-milk-carton',
    filename: 'negative-milk-carton.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Uni-President_Milk_200ml_by_AGV_20250921.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Uni-President_Milk_200ml_by_AGV_20250921.jpg',
    sha256: 'df8ad60dda52db339a7aaf2b3a5db7644cb220043ef7daf773aff00ae873d9b2',
    credit: 'Solomon203, Wikimedia Commons',
    licence: 'CC BY-SA 4.0',
    reviewedAt: '2026-11-01',
    provenance: "One 200ml Tetra Pak milk carton. Cartons are outside the deposit category and follow ordinary blue-bin recycling.",
  },
  {
    id: 'negative-soap-pump-bottle',
    filename: 'negative-soap-pump-bottle.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Plastic_soap_bottle.jpg',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/Plastic_soap_bottle.jpg/1920px-Plastic_soap_bottle.jpg',
    sha256: '05ecf2f56e1dc8a70f67c7408d1c7ac511cb2359014b712ff9aad4f274abd32e',
    credit: 'Santeri Viinamäki, Wikimedia Commons',
    licence: 'CC BY-SA 4.0',
    reviewedAt: '2026-11-01',
    provenance: "One plastic pump-dispenser bottle. A non-beverage container is outside the deposit category and follows ordinary plastic recycling.",
  },
  {
    id: 'negative-powdered-drink-tin',
    filename: 'negative-powdered-drink-tin.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Milo_tin_circa_2004.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Milo_tin_circa_2004.jpg',
    sha256: 'a3856284da4db17691cf3adef31b40423703df150bab5580752f8ad29d0f8e53',
    credit: 'Hughesdarren, Wikimedia Commons',
    licence: 'CC BY-SA 4.0',
    reviewedAt: '2026-11-01',
    provenance: "One lidded MILO powdered-drink tin. Powdered drinks are outside the deposit category, so the metal tin follows ordinary recycling; surface rust on the lid is not food residue.",
  },
  {
    id: 'holdout-singapore-mark-closeup',
    filename: 'holdout-singapore-mark-closeup.jpg',
    sourcePageUrl: 'https://www.channelnewsasia.com/singapore/beverage-container-return-points-five-minute-walk-hdb-residents-5895361',
    imageUrl: 'https://dam.mediacorp.sg/image/upload/s--o1_HKBiK--/c_crop%2Ch_2546%2Cw_4526%2Cx_0%2Cy_469/c_fill%2Cg_auto%2Ch_468%2Cw_830/fl_relative%2Cg_south_east%2Cl_mediacorp%3Acna%3Awatermark%3A2021-08%3Acna%2Cw_0.1/f_auto%2Cq_auto/v1/mediacorp/cna/image/2026/01/30/jus_4229.jpg?itok=8LCq0jnI',
    sha256: '8bd0ca834cab36c1591fddf729e4c7eec73c8e423d2236b45d03f97f373a8616',
    credit: 'CNA/Justin Tan',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-11-01',
    provenance: "One clear plastic drink bottle fills the frame. Its label reads Content : 1500ml, and a 10¢ SG RETURN sticker is attached to the bottle, so the submitted pixels establish an intact single plastic bottle of in-range capacity.",
  },
  {
    id: 'holdout-foreign-refund-mark',
    filename: 'holdout-foreign-refund-mark.jpg',
    sourcePageUrl: 'https://note.com/ruka926/n/n9c58c8986304',
    imageUrl: 'https://assets.st-note.com/img/1735459313-DMkZ7pd8rnW0Oi31cAKSgLNI.jpg?fit=bounds&height=2000&quality=85&width=2000',
    sha256: '00508d4370d96adedc04c27690548ff242c955181e73b236b028865e3ae0fe63',
    credit: 'Ruka, note.com',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-11-02',
    provenance: "One clear plastic drink bottle is held in a hand; below a tight label crop its ribbed body and the liquid inside are visible. The bottle form with the hand as a size reference establishes an ordinary 150ml-3L bottle under the capacity rubric in docs/classify-eval.md. Ignore the foreign refund wording; the container category routes it to a Return Point, whose barcode check decides acceptance. Relabelled on 2026-11-02 after a candidate had answered return_point, so it is regression evidence only.",
  },
  {
    id: 'holdout-single-sideways-marked-can',
    filename: 'holdout-single-sideways-marked-can.webp',
    sourcePageUrl: 'https://www.straitstimes.com/singapore/environment/a-map-of-waste-atms-new-website-launched-to-help-people-find-beverage-container-return-machines',
    imageUrl: 'https://cassette.sphdigital.com.sg/image/straitstimes/522c9d39efeb9854685ee8d537137b78025d0e4c9db0a982a4d1a33457c50bae',
    sha256: 'a14d5c4eae44e894d0d4498d0013cb47de00282910fb9c360f5c3a004c5a452a',
    credit: 'ST Photo/Shintaro Tay',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "One intact metal beverage can is held sideways in front of a machine. Its physical can shape and hand-relative size establish 150ml-3L; machine context and mark text are unnecessary.",
  },
  {
    id: 'holdout-multiple-marked-containers',
    filename: 'holdout-multiple-marked-containers.webp',
    sourcePageUrl: 'https://www.straitstimes.com/singapore/environment/a-map-of-waste-atms-new-website-launched-to-help-people-find-beverage-container-return-machines',
    imageUrl: 'https://cassette.sphdigital.com.sg/image/straitstimes/92a383910fa10ac8cdb2e4d9fc778f29e054ea14d6ec419b7053f84a18834ae9',
    sha256: '41cdd756549997ae13747c49655ef71ee5baea46c18b35d414a2b7c336de2a06',
    credit: 'NEA, via The Straits Times',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "Several bottles and cans are co-equal subjects; no single container is selected.",
  },
  {
    id: 'holdout-single-clear-marked-bottle-v3',
    filename: 'holdout-single-clear-marked-bottle-v3.jpg',
    sourcePageUrl: 'https://www.channelnewsasia.com/singapore/beverage-container-return-scheme-nea-rebut-accusation-6321081',
    imageUrl: 'https://dam.mediacorp.sg/image/upload/s--Tk-5iWuL--/c_crop,h_1066,w_1332,x_117,y_0/c_fill,g_center,h_598,w_747/fl_relative,g_south_east,l_mediacorp:cna:watermark:2021-08:cna,w_0.1/f_auto,q_auto/v1/mediacorp/cna/image/2026/03/18/sya_2554_0.jpg?itok=Kw6EhqPA',
    sha256: '8e9188d76d3164b3f2e7ea8f72563ebaca60f5eaae50a8f975bda047c8a7f2c1',
    credit: 'CNA/Syamil Sapari',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "One intact plastic drinking-water bottle is held at a machine; its bottle shape and hand-relative size establish the category without readable mark text.",
  },
  {
    id: 'holdout-multiple-containers-collage-v3',
    filename: 'holdout-multiple-containers-collage-v3.webp',
    sourcePageUrl: 'https://www.stomp.sg/stomping-ground/man-brings-10-empty-bottles-bcrs-machine-not-all-eligible-10-cent-refund-asks-whats-point',
    imageUrl: 'https://cassette.sphdigital.com.sg/image/stomp/af75700263dc271480b7a04f33e4e8497af4da302e2de945c332cb20dd8773f3?f=webp&w=960',
    sha256: 'ed58f16ff0161e50bbd52f32d0cff1746a69c8ed5d3cc9493ada55f1e593860f',
    credit: 'STOMP/The Straits Times',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "An editorial collage contains a machine scene and many co-equal beverage containers, without one selected container.",
  },
  {
    id: 'holdout-malaysia-made-singapore-mark-v4',
    filename: 'holdout-malaysia-made-singapore-mark-v4.jpg',
    sourcePageUrl: 'https://mothership.sg/2026/07/bcrs-refund-two-weeks/',
    imageUrl: 'https://static.mothership.sg/1/2026/06/IMG_1105.jpg',
    sha256: 'b112e7f613b278b08d57ff328fa5973afed6157332fc056402444f88494857ae',
    credit: 'Mothership',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "One intact plastic beverage bottle is selected in the foreground and carries a readable 10\u00a2 SG RETURN mark. Manufacturing origin is not the place of purchase.",
  },
  {
    id: 'holdout-single-angle-no-mark-v4',
    filename: 'holdout-single-angle-no-mark-v4.jpg',
    sourcePageUrl: 'https://mothership.sg/2026/07/bcrs-refund-two-weeks/',
    imageUrl: 'https://static.mothership.sg/1/2026/06/IMG_1107.jpg',
    sha256: '9953d8ee186e6a60ad6e33ada47c79d842028bd76a10392cdb1e28fc8efd91b6',
    credit: 'Mothership',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "One metal beverage can is held in the foreground; its can rims and hand-relative size establish the in-range category without a mark requirement.",
  },
  {
    id: 'holdout-single-marked-can-v5',
    filename: 'holdout-single-marked-can-v5.jpg',
    sourcePageUrl: 'https://www.asiaone.com/singapore/bcrs-drink-containers-no-return-mark-no-deposit',
    imageUrl: 'https://www.asiaone.com/sites/default/files/inline-images/BCRS-Deposit-Mark.jpg',
    sha256: '31a671fe84d7f199e3c4ea13f688e3a4204141e6538413ad6f0e71a49118e435',
    credit: 'AsiaOne/Ong Chin Wee',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "One intact red metal beverage can has a readable 10\u00a2 SG RETURN mark on the can. Hands hiding the barcode do not establish barcode damage.",
  },
  {
    id: 'holdout-single-angle-foreign-can-v5',
    filename: 'holdout-single-angle-foreign-can-v5.jpg',
    sourcePageUrl: 'https://mothership.sg/2026/07/bcrs-refund-two-weeks/',
    imageUrl: 'https://static.mothership.sg/1/2026/06/IMG_1102.jpg',
    sha256: 'da71e2ffee0a69bc22c3e30f8be02a0ab7ca644be634ec1095894af67f70db79',
    credit: 'Mothership',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "One intact metal beverage can has a readable 320ml capacity. Origin and ordinary recycling symbols do not change its category.",
  },
  {
    id: 'holdout-marked-bottle-label-v6',
    filename: 'holdout-marked-bottle-label-v6.jpg',
    sourcePageUrl: 'https://www.channelnewsasia.com/singapore/beverage-container-return-scheme-10-cent-deposit-errors-transition-6229386',
    imageUrl: 'https://dam.mediacorp.sg/image/upload/v1/mediacorp/cna/image/2026/07/03/img_20260703_182042.jpg',
    sha256: '93cb9ecdbe9d14e2c139874b4093d23e0147c5e210789d5d0235e9eaa6d4fed6',
    credit: 'CNA/Koh Wan Ting',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "The crop selects one drink label with a readable 10\u00a2 SG RETURN mark on its container, which fills unknown shape or capacity facts.",
    crop: { left: 80, top: 450, width: 460, height: 1000 },
  },
  {
    id: 'holdout-single-angle-malaysia-bottle-v6',
    filename: 'holdout-single-angle-malaysia-bottle-v6.jpg',
    sourcePageUrl: 'https://mothership.sg/2026/07/bcrs-refund-two-weeks/',
    imageUrl: 'https://static.mothership.sg/1/2026/06/IMG_1104.jpg',
    sha256: '3de3524885ea38cc0eca01d043c43fde90265bf8f2e10c8b4a93d510d5a5904d',
    credit: 'Mothership',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "One intact plastic drinking-water bottle is the foreground subject; bottle geometry and hand-relative size establish an ordinary in-range bottle. Manufacturing text does not establish purchase abroad.",
  },
  {
    id: 'holdout-cna-mark-and-barcode-v7',
    filename: 'holdout-cna-mark-and-barcode-v7.jpg',
    sourcePageUrl: 'https://forums.hardwarezone.com.sg/threads/the-beverage-container-return-scheme-is-so-easy-to-defraud.7185337/',
    imageUrl: 'https://i.ibb.co/fzcwDjyv/10-cents-deposit-sticker.jpg',
    sha256: '90132da0b9b35db29643b94a35a6ed1409aaef74014a72113e48caacceb3acb8',
    credit: 'CNA broadcast frame, shared via HardwareZone',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "One plastic drink-bottle label carries a readable 10\u00a2 SG RETURN mark; it fills unknown category facts. The barcode is not an image eligibility prerequisite.",
  },
  {
    id: 'holdout-single-angle-malaysia-can-v7',
    filename: 'holdout-single-angle-malaysia-can-v7.jpeg',
    sourcePageUrl: 'https://forums.hardwarezone.com.sg/threads/discussion-beverage-container-return-scheme.7209348/page-68',
    imageUrl: 'https://i.imgur.com/r2kFG9Z.jpeg',
    sha256: '888748aa4a710a30c8c3dac008c0db85265e98da219312a094851fa2edd82111',
    credit: 'HardwareZone forum contributor',
    licence: 'User-uploaded; evaluation cache only',
    reviewedAt: '2026-11-02',
    provenance: "A recognisable milk-coffee drink label printed on a metal can body is visible, with a curved can-rim fragment at the lower edge. The tight crop shows no readable capacity or size reference; an unknown capacity excludes nothing, so the single metal drink can routes to return_point.",
  },
  {
    id: 'holdout-marked-plastic-cup-v8',
    filename: 'holdout-marked-plastic-cup-v8.jpeg',
    sourcePageUrl: 'https://forums.hardwarezone.com.sg/threads/discussion-beverage-container-return-scheme.7209348/page-86',
    imageUrl: 'https://i.imgur.com/xJlKdSh.jpeg',
    sha256: '7595e9aca8171b6563270794a9c09ee96ea2a069677158ab5b371577b44bd5d9',
    credit: 'HardwareZone forum contributor',
    licence: 'User-uploaded; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "One 200ml prepackaged plastic beverage cup is visible with a readable 10\u00a2 SG RETURN mark on its own label. Cup shape is in scope.",
  },
  {
    id: 'holdout-single-angle-coke-can-v8',
    filename: 'holdout-single-angle-coke-can-v8.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Can_of_Coca-Cola_Y3000.jpg',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/07/Can_of_Coca-Cola_Y3000.jpg/1920px-Can_of_Coca-Cola_Y3000.jpg',
    sha256: '92d6981d9feda5baedd96d2f77ef1e171af9e28e6c319eee8ae3f625ba0216eb',
    credit: 'UndamagedGOODs, Wikimedia Commons',
    licence: 'CC BY-SA 4.0',
    reviewedAt: '2026-10-27',
    provenance: "One intact slim metal beverage can is fully visible, establishing an ordinary in-range can regardless of which label side is shown.",
  },
  {
    id: 'holdout-marked-bottle-and-receipt-v10',
    filename: 'holdout-marked-bottle-and-receipt-v10.jpg',
    sourcePageUrl: 'https://forums.hardwarezone.com.sg/threads/discussion-beverage-container-return-scheme.7209348/page-3',
    imageUrl: 'https://live.staticflickr.com/65535/55362038743_a2e24e07cf_b.jpg',
    sha256: '06cf1f0aabe88dc4acd2ec1f6e78e48e4319496c40eb8fe2e7b5fc1c44c65fab',
    credit: 'HardwareZone forum contributor 86technie',
    licence: 'User-uploaded; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "One intact 500ml plastic drink bottle is the subject beside a receipt. The bottle category, not the receipt charge, determines return_point.",
  },
  {
    id: 'holdout-single-angle-malaysia-can-v10',
    filename: 'holdout-single-angle-malaysia-can-v10.jpeg',
    sourcePageUrl: 'https://forums.hardwarezone.com.sg/threads/discussion-beverage-container-return-scheme.7209348/page-67',
    imageUrl: 'https://i.imgur.com/w4HvfK2.jpeg',
    sha256: '9fb475884e44df42ecfb42f8e88d9077a54d4b050d6290feef65233532cde145',
    credit: 'HardwareZone forum contributor speedsonic',
    licence: 'User-uploaded; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "One intact metal beverage can has a readable 240ml capacity; no mark or country-of-origin inference is needed.",
  },
  {
    id: 'holdout-outer-pack-mark-individual-can-unknown-v11',
    filename: 'holdout-outer-pack-mark-individual-can-unknown-v11.jpeg',
    sourcePageUrl: 'https://www.8world.com/singapore/fnn-can-drink-bcrs-deposit-logo-3226531',
    imageUrl: 'https://dam.mediacorp.sg/image/upload/v1/8world/images/2026/07/23/fnn_bcrs_no_10_cents_logo.jpeg',
    sha256: 'e8230e38ce73b1d00790bf8b41ba6e7b28f5f50a26d24a11a8446c77a55fd22b',
    credit: 'Interviewee-provided photo, via 8world',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "The two-panel photograph presents outer six-pack packaging and an exposed can without selecting one subject. A mark on the wrap cannot establish a single container.",
  },
  {
    id: 'holdout-traveller-mark-and-barcode-v13',
    filename: 'holdout-traveller-mark-and-barcode-v13.webp',
    sourcePageUrl: 'https://www.stomp.sg/trending-now/traveller-carries-plastic-bottle-7-day-trip-australia-brings-it-back-spore-claim-10-cent-refund',
    imageUrl: 'https://cassette.sphdigital.com.sg/image/stomp/5843213c45792059b6ec7c20fac4d7746375b2371d886e8352c9681a506f637c',
    sha256: '3e97e2e30a4a93e7dd671037a2f81bc2a9bb10e6477a887ab412adf7ab463bc9',
    credit: 'Xiaohongshu user @可以坐就别站, via STOMP',
    licence: 'User-uploaded/publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "One intact plastic drinking-water bottle is held in the foreground; the full bottle and hand-relative scale establish the in-range category. Travel context does not establish the purchase location.",
    crop: { left: 0, top: 0, width: 700, height: 840 },
  },
  {
    id: 'holdout-hand-obscured-bottle-v13',
    filename: 'holdout-hand-obscured-bottle-v13.png',
    sourcePageUrl: 'https://vibes.8world.com/in-depth/frontline/bcrs-3242136',
    imageUrl: 'https://dam.mediacorp.sg/image/upload/v1/8world/images/2026/08/08/bcrs_8w_pic1.png',
    sha256: 'b7782b38ee4f1aa0dff6501d00968ad6f133679836e930cddcd23f5a6bee6599',
    credit: '8world',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "The crop selects one intact plastic beverage bottle held by a shopper; the cap, shoulders and body scale establish an in-range bottle despite the hand covering its label.",
    crop: { left: 470, top: 250, width: 430, height: 680 },
  },
  {
    id: 'holdout-single-can-mark-and-barcode-v14',
    filename: 'holdout-single-can-mark-and-barcode-v14.png',
    sourcePageUrl: 'https://www.8world.com/singapore/more-education-urged-to-improve-public-awareness-literacy-on-bcrs-3180601',
    imageUrl: 'https://dam.mediacorp.sg/image/upload/v1/8world/images/2026/06/14/design-untitled-32.png',
    sha256: '4e05b66a65ec3a6315b94026cd969efe01215f56be80a6ceb10222ab7d0dccdb',
    credit: '8world/梁居磊',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "A single physical metal beverage can is shown with a connected enlargement of its printed mark. The readable 10\u00a2 SG RETURN on that same can fills unknown category facts; the enlargement is not a second container.",
  },
  {
    id: 'holdout-multiple-containers-shelf-v14',
    filename: 'holdout-multiple-containers-shelf-v14.webp',
    sourcePageUrl: 'https://www.zaobao.com.sg/news/singapore/story20260620-9237023',
    imageUrl: 'https://cassette.sphdigital.com.sg/image/zaobao-sm/58a5b0c0e386efa6716d743e6a10052dbb14bcd6b4a30bd46d4a93522a5d72b4?f=webp&o=zbimg&oloc=se',
    sha256: 'a90ee4f899ad4b0d5ce2a4eb4dcffe7ccb4193791f8656c0f14e2673b420cb75',
    credit: '新明日报/冯凯麟, via Zaobao',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "Several co-equal plastic and metal beverage containers are visible on a shelf; editorial arrows do not select one subject.",
  },
  {
    id: 'holdout-single-can-mark-and-barcode-v15',
    filename: 'holdout-single-can-mark-and-barcode-v15.webp',
    sourcePageUrl: 'https://www.zaobao.com.sg/news/singapore/story20260730-9413074',
    imageUrl: 'https://cassette.sphdigital.com.sg/image/zaobao/d4a26da1f732b8d84384ab3e0ceb699fa8ae2ccd9ded4292665f457defefcad3',
    sha256: 'f72f485af9ee085e600890f9e6c82440496d2e115573433ca46da37b30334cbb',
    credit: 'Zaobao/周国威',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "One intact metal beverage can has a readable 300ml capacity and is held as the sole foreground subject.",
  },
  {
    id: 'holdout-standalone-mark-product-composite-v15',
    filename: 'holdout-standalone-mark-product-composite-v15.jpg',
    sourcePageUrl: 'https://www.fairprice.com.sg/product/bcrs-jia-jia-herbal-tea-bottle-drink-original-500ml-13281525',
    imageUrl: 'https://media.nedigital.sg/fairprice/fpol/media/images/product/XL/13281525_XL1_20260407.jpg',
    sha256: 'e80cddca63bd640f47a2b5d809b88d474af1246ae551c5da057af911be3b59d2',
    credit: 'FairPrice product catalogue',
    licence: 'Retailer-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "A single intact plastic herbal-drink bottle is fully depicted at ordinary in-range size. The separate Deposit Mark graphic is ignored; the bottle category alone supports return_point.",
  },
  {
    id: 'holdout-single-bottle-mark-and-barcode-v16',
    filename: 'holdout-single-bottle-mark-and-barcode-v16.webp',
    sourcePageUrl: 'https://www.zaobao.com.sg/news/singapore/story20260903-9618188',
    imageUrl: 'https://cassette.sphdigital.com.sg/image/zaobao/e90e6015225f70f06955b832ee0680e6dd81a636f6c3487f2a7bc09cd3aeeca4',
    sha256: '175b5a332cb834b1d26032de3c4d131f60224928593c111436ae018374b5c21d',
    credit: 'Zaobao video frame',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "One selected plastic drink-container label has a readable 10\u00a2 SG RETURN mark printed on the container, filling unknown category facts.",
  },
  {
    id: 'holdout-container-obscured-at-machine-v16',
    filename: 'holdout-container-obscured-at-machine-v16.jpg',
    sourcePageUrl: 'https://vibes.8world.com/in-depth/frontline/bcrs-3242136',
    imageUrl: 'https://dam.mediacorp.sg/image/upload/s--PqEKgINK--/c_fill%2Cg_auto/f_auto%2Cq_auto/v1/8world/images/2026/08/08/bcrs_8w_pic2.png?itok=EHW3GIFS',
    sha256: '73338299479b0da6366788ac78222ee85b7175b9f877eb1f2160e95573811ef5',
    credit: '8world',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "The machine and a user are visible but the physical drink container is hidden by the hand and aperture. Machine instructions and graphics do not establish a container subject.",
  },
  {
    "id": "holdout-water-bottle-front-action-v17",
    "filename": "holdout-water-bottle-front-action-v17.jpg",
    "sourcePageUrl": "https://commons.wikimedia.org/wiki/File:Evian_Bottle.jpg",
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/e/e5/Evian_Bottle.jpg",
    "sha256": "0dfd5f7d9e4e0eba4be4700e261c8812fae2df30fdbe69273a0d48060d040c4f",
    "credit": "James Tamim, Wikimedia Commons",
    "licence": "CC BY-SA 4.0; evaluation cache only, not redistributed",
    reviewedAt: '2026-10-27',
    provenance: "One intact PET drinking-water bottle has a readable 50CL capacity. Water contents can be emptied and are not contamination.",
  },
  {
    "id": "holdout-glass-bottle-action-v17",
    "filename": "holdout-glass-bottle-action-v17.jpg",
    "sourcePageUrl": "https://commons.wikimedia.org/wiki/File:Mythos_001.jpg",
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/2/24/Mythos_001.jpg",
    "sha256": "52a1458a3cc837e39693447cfd23847d5f42a5d241864cf8ce2fd7731c220b85",
    "credit": "Phyrexian, Wikimedia Commons",
    "licence": "Public domain (PD-self); evaluation cache only, not redistributed",
    reviewedAt: '2026-10-27',
    provenance: "One intact green glass beer bottle has no visible contamination. Clean glass follows ordinary recycling.",
  },

  {
    id: 'holdout-plastic-sprite-action-v18',
    filename: 'holdout-plastic-sprite-action-v18.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Bouteille_de_sprite_en_2025.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Bouteille_de_sprite_en_2025.jpg',
    sha256: '7a45348be466b921651eaaed2923680a38e7bd158b323917c674f05cae2e1127',
    credit: 'Mapswiki, Wikimedia Commons',
    licence: 'CC0 1.0',
    reviewedAt: '2026-10-27',
    provenance: "One intact plastic Sprite drink bottle is fully visible at ordinary in-range size. Normal liquid and condensation do not count as contamination.",
  },
  {
    id: 'holdout-glass-sprite-action-v18',
    filename: 'holdout-glass-sprite-action-v18.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Sprite_bottle.JPG',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Sprite_bottle.JPG',
    sha256: '061d36b3d80483e8802b2825f5a26ee194b79dfc8318987e08d79753754a10e4',
    credit: 'Surachit, Wikimedia Commons',
    licence: 'CC BY-SA 2.5',
    reviewedAt: '2026-10-27',
    provenance: "One intact green glass Sprite bottle has no visible contamination. Glass remains outside the deposit category regardless of marks.",
  },
  {
    id: 'holdout-single-bottle-mark-barcode-v19',
    filename: 'holdout-single-bottle-mark-barcode-v19.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:PET_bottles_with_BCRS_return_mark_and_barcode_on_a_sticker_JASWE.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/66/PET_bottles_with_BCRS_return_mark_and_barcode_on_a_sticker_JASWE.jpg',
    sha256: 'dc8ea5f8f8fbd8e54fc08d648ceffc67bc0b1e99e3c899f03d8ebb3ddc045b46',
    credit: 'Justanothersgwikieditor, Wikimedia Commons',
    licence: 'CC BY-SA 4.0; evaluation cache only, not redistributed',
    reviewedAt: '2026-10-27',
    provenance: "The deterministic crop selects one intact 500ml plastic tea bottle as the foreground subject; its container category is in range.",
    crop: { left: 3040, top: 0, width: 992, height: 2268 },
  },
  {
    id: 'holdout-multiple-imported-cans-v19',
    filename: 'holdout-multiple-imported-cans-v19.jpg',
    sourcePageUrl: 'https://mothership.sg/2026/09/drink-containers-without-return-right-logo/',
    imageUrl: 'https://static.mothership.sg/1/2026/09/donki-non-bcrs.jpg',
    sha256: '475175ba7541d9aa957d52699635625edb09d26f0159ac8a6d76b7bacac58a4a',
    credit: 'Mothership',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "Several co-equal imported beverage cans and a promotional sign appear on a shelf; no single container is selected.",
  },
  {
    id: 'holdout-return-machine-bottle-cart-v20',
    filename: 'holdout-return-machine-bottle-cart-v20.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Bottles_collected_from_BCRS_Return_Right_Machine_20260915_174412.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Bottles_collected_from_BCRS_Return_Right_Machine_20260915_174412.jpg',
    sha256: 'f58eff74bafdf9ca2dcbe34b408e4348558025571a1b858298fa5f0dc57f22c1',
    credit: 'ZKang123, Wikimedia Commons',
    licence: 'CC BY-SA 4.0; evaluation cache only, not redistributed',
    reviewedAt: '2026-10-27',
    provenance: "A return machine stands beside a cart with many bagged bottles; no single physical container is the subject. Machine graphics cannot fill that missing subject.",
  },
  {
    id: 'holdout-multiple-paper-cartons-v20',
    filename: 'holdout-multiple-paper-cartons-v20.jpeg',
    sourcePageUrl: 'https://forums.hardwarezone.com.sg/threads/discussion-beverage-container-return-scheme.7209348/post-159670376',
    imageUrl: 'https://i.imgur.com/qVDfjYY.jpeg',
    sha256: 'b9452d445453cc434c26ea1af2794e9fdfb231064c61dea028590f548d9cb3af',
    credit: 'HardwareZone user dexboi',
    licence: 'Publisher-owned; evaluation cache only',
    reviewedAt: '2026-10-27',
    provenance: "Many co-equal paper beverage cartons appear on a supermarket display. Multiple subjects take priority over ordinary carton recycling.",
  },
  {
    id: 'holdout-single-bottle-mark-barcode-v21',
    filename: 'holdout-single-bottle-mark-barcode-v21.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:A_PET_bottle_with_BCRS_return_mark_-_RSKY.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/30/A_PET_bottle_with_BCRS_return_mark_-_RSKY.jpg',
    sha256: '5f2e0e39beccba8db9d4af50e45cf48d6e60e9e221e137418b0f34ea21e250a0',
    credit: 'Robert Sim (Robertsky), Wikimedia Commons',
    licence: 'CC BY-SA 4.0; evaluation cache only, not redistributed',
    reviewedAt: '2026-10-27',
    provenance: "The deterministic crop selects one intact 600ml plastic drinking-water bottle, from its cap to below its label, as the sole foreground subject.",
    crop: { left: 1517, top: 0, width: 1000, height: 2264 },
  },
  {
    id: 'holdout-single-angle-japanese-can-v21',
    filename: 'holdout-single-angle-japanese-can-v21.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Coca-Cola_Okinawa_can.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d1/Coca-Cola_Okinawa_can.jpg',
    sha256: '886bd9c7200c5c56de3db3ed8a61db41867b2dde07c31202104ce3d1ab5f6c16',
    credit: 'Jun, Wikimedia Commons',
    licence: 'CC BY-SA 4.0; evaluation cache only, not redistributed',
    reviewedAt: '2026-10-27',
    provenance: "One intact slim metal Coca-Cola drink can is fully visible at ordinary in-range size. Artwork and the source location do not establish where the user bought it.",
  },
  {
    id: 'holdout-single-angle-recycling-symbol-can-v21',
    filename: 'holdout-single-angle-recycling-symbol-can-v21.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Lotte_Squeeze_Grappe_Ade.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Lotte_Squeeze_Grappe_Ade.jpg',
    sha256: '194259724b7d71faa689943b4d23c7f804c4c0e5ad50bea233d55c47d1dd07c1',
    credit: 'Svetlov Artem, Wikimedia Commons',
    licence: 'CC BY-SA 4.0; evaluation cache only, not redistributed',
    reviewedAt: '2026-10-27',
    provenance: "One intact metal grape-drink can is held as the sole foreground subject; its can geometry and hand-relative scale establish the in-range category. Label languages and ordinary symbols do not change it.",
  },
  {
    id: 'holdout-foreign-deposit-can-v21',
    filename: 'holdout-foreign-deposit-can-v21.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Pilsner_Urquell_2-PANT.JPG',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Pilsner_Urquell_2-PANT.JPG',
    sha256: 'a59ffd0f15617d9e684395ccc405ffdef8575fc17c9c0f89e1c29294ef99da71',
    credit: '01x07x2022000, Wikimedia Commons',
    licence: 'CC0 1.0',
    reviewedAt: '2026-10-27',
    provenance: "One intact metal beer can is fully visible at ordinary in-range size. Foreign deposit text is ignored and does not establish a purchase outside Singapore.",
  },
  {
    id: 'holdout-sarsi-can-v22',
    filename: 'holdout-sarsi-can-v22.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Fnnsarsi.JPG',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Fnnsarsi.JPG',
    sha256: '2b7d0ea1fd4d7db32d38d3f1235287672beb26fcc0ea0a2eeb7cb35a46b4c113',
    credit: 'Yong1986 at English Wikipedia, Wikimedia Commons',
    licence: 'Public domain',
    reviewedAt: '2026-11-02',
    provenance: "One intact metal F&N Sarsi drink can is fully visible from lid to base at ordinary in-range can size. Condensation is not contamination, and no Deposit Mark is visible.",
  },
  {
    id: 'holdout-pocari-bottle-in-hand-v22',
    filename: 'holdout-pocari-bottle-in-hand-v22.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Pocari_Sweat_500ml_plastic_bottle_(53489565431).jpg',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Pocari_Sweat_500ml_plastic_bottle_%2853489565431%29.jpg/1920px-Pocari_Sweat_500ml_plastic_bottle_%2853489565431%29.jpg',
    sha256: 'b53fd14233259df483ab3ecb9f1b93a4eccf9e3a9e20c9058c5e45cb132d1487',
    credit: 'Kanesue, Wikimedia Commons',
    licence: 'CC BY 2.0',
    reviewedAt: '2026-11-02',
    provenance: "A hand holds one intact clear plastic Pocari Sweat drink bottle with its cap, shoulders and label visible; the hand establishes an ordinary in-range bottle. Normal liquid is not contamination.",
  },
  {
    id: 'holdout-short-coffee-can-v22',
    filename: 'holdout-short-coffee-can-v22.png',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Can_of_Sangaria_Quality_Coffee_Black.png',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/14/Can_of_Sangaria_Quality_Coffee_Black.png/1920px-Can_of_Sangaria_Quality_Coffee_Black.png',
    sha256: 'b9f6449f6d801c8d2f7cf182b2739445ef82477897fa5f9f671137cd144b69ee',
    credit: 'Dmz2000, Wikimedia Commons',
    licence: 'CC BY-SA 4.0',
    reviewedAt: '2026-11-02',
    provenance: "One intact metal canned-coffee drink can is fully visible from lid to base. No capacity is printed on the visible side; the complete standard short-can outline establishes an ordinary in-range can.",
  },
  {
    id: 'holdout-tiger-glass-beer-bottle-v22',
    filename: 'holdout-tiger-glass-beer-bottle-v22.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Tiger_Beer_Phuket_Thailand.jpg',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/68/Tiger_Beer_Phuket_Thailand.jpg/1920px-Tiger_Beer_Phuket_Thailand.jpg',
    sha256: 'd167152f88220c121026a10171934a95507181319d69c6b43fa434720321a18b',
    credit: 'ADwarf, Wikimedia Commons',
    licence: 'Public domain',
    reviewedAt: '2026-11-02',
    provenance: "One intact uncapped brown glass Tiger beer bottle stands on an outdoor table with no visible contamination. Glass is outside the deposit category.",
  },
  {
    id: 'holdout-oat-milk-gable-carton-v22',
    filename: 'holdout-oat-milk-gable-carton-v22.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Oatly_Barista_Edition_1.jpg',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Oatly_Barista_Edition_1.jpg/1920px-Oatly_Barista_Edition_1.jpg',
    sha256: '49c4a36fd3fa52dfd3eb63f7591bf03ea378746fe82600984dbd0d4e24090ce4',
    credit: 'Ajuliette102, Wikimedia Commons',
    licence: 'CC BY-SA 4.0',
    reviewedAt: '2026-11-02',
    provenance: "One intact gable-top oat-milk carton with a plastic screw cap is printed 946 mL. Cartons are outside the deposit category and follow ordinary blue-bin recycling.",
  },
  {
    id: 'holdout-shampoo-bottle-v22',
    filename: 'holdout-shampoo-bottle-v22.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Dove_shampoo_bottle.jpg',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/68/Dove_shampoo_bottle.jpg/1920px-Dove_shampoo_bottle.jpg',
    sha256: '97a03adf9292fbe321b09b12a32dd9bc6750af0541268b67e78c8369334a584d',
    credit: 'Ranjima np, Wikimedia Commons',
    licence: 'CC0 1.0',
    reviewedAt: '2026-11-02',
    provenance: "One plastic shampoo bottle printed 80 ml stands behind loose flower petals, which are not containers. A non-beverage container is outside the deposit category and follows ordinary plastic recycling.",
  },
  {
    id: 'holdout-drink-box-with-straw-v22',
    filename: 'holdout-drink-box-with-straw-v22.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Tetra_Brik_by_Tetra_Pak.jpg',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/Tetra_Brik_by_Tetra_Pak.jpg/1920px-Tetra_Brik_by_Tetra_Pak.jpg',
    sha256: 'e11be6903a74af7b6fbc4915c0648b27107475a402b45be3aafb7e2c557be727',
    credit: 'Ardhan Febriansyah, Wikimedia Commons',
    licence: 'CC BY-SA 4.0',
    reviewedAt: '2026-11-02',
    provenance: "One intact 250 ml brick drink carton is seen from above with its wrapped straw attached to the side. Cartons are outside the deposit category and follow ordinary blue-bin recycling.",
  },
];

export interface BcrsImageCase extends ExpectedClassification {
  id: string;
  sourceId: string;
  locale: Locale;
  partition: 'regression' | 'holdout';
}

export const BCRS_IMAGE_CASES: readonly BcrsImageCase[] = [
  {
    "id": "official-mark-closeup-en",
    "sourceId": "official-mark-closeup",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "official-mark-closeup-zh",
    "sourceId": "official-mark-closeup",
    "locale": "zh",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "official-mark-closeup-ms",
    "sourceId": "official-mark-closeup",
    "locale": "ms",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "official-mark-closeup-ta",
    "sourceId": "official-mark-closeup",
    "locale": "ta",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "small-mark-wide-shot-en",
    "sourceId": "official-marked-pair",
    "locale": "en",
    "channel": null,
    "status": "not_sure",
    "partition": "regression",
    "nextAction": null,
    "maxConfidence": 0.49
  },
  {
    "id": "small-mark-bottle-shot-en",
    "sourceId": "official-marked-bottle",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "mark-not-visible-bottle-en",
    "sourceId": "mark-not-visible-bottle",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "individual-can-mark-not-visible-en",
    "sourceId": "individual-can-mark-not-visible",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "empty-glass-bottle-en",
    "sourceId": "empty-glass-bottle",
    "locale": "en",
    "channel": "blue_bin",
    "status": "recyclable",
    "partition": "regression"
  },
  {
    "id": "negative-crushed-can-en",
    "sourceId": "negative-crushed-can",
    "locale": "en",
    "channel": "blue_bin",
    "status": "recyclable",
    "partition": "regression"
  },
  {
    "id": "negative-small-cultured-milk-bottle-en",
    "sourceId": "negative-small-cultured-milk-bottle",
    "locale": "en",
    "channel": "blue_bin",
    "status": "recyclable",
    "partition": "regression"
  },
  {
    "id": "negative-large-water-jug-en",
    "sourceId": "negative-large-water-jug",
    "locale": "en",
    "channel": "blue_bin",
    "status": "recyclable",
    "partition": "regression"
  },
  {
    "id": "negative-milk-carton-en",
    "sourceId": "negative-milk-carton",
    "locale": "en",
    "channel": "blue_bin",
    "status": "recyclable",
    "partition": "regression"
  },
  {
    "id": "negative-soap-pump-bottle-en",
    "sourceId": "negative-soap-pump-bottle",
    "locale": "en",
    "channel": "blue_bin",
    "status": "recyclable",
    "partition": "regression"
  },
  {
    "id": "negative-powdered-drink-tin-en",
    "sourceId": "negative-powdered-drink-tin",
    "locale": "en",
    "channel": "blue_bin",
    "status": "recyclable",
    "partition": "regression"
  },
  {
    "id": "holdout-singapore-mark-closeup-en",
    "sourceId": "holdout-singapore-mark-closeup",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-foreign-refund-mark-en",
    "sourceId": "holdout-foreign-refund-mark",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-single-sideways-marked-can-en",
    "sourceId": "holdout-single-sideways-marked-can",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-multiple-marked-containers-en",
    "sourceId": "holdout-multiple-marked-containers",
    "locale": "en",
    "channel": null,
    "status": "not_sure",
    "partition": "regression",
    "nextAction": null,
    "maxConfidence": 0.49
  },
  {
    "id": "holdout-single-clear-marked-bottle-v3-en",
    "sourceId": "holdout-single-clear-marked-bottle-v3",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-multiple-containers-collage-v3-en",
    "sourceId": "holdout-multiple-containers-collage-v3",
    "locale": "en",
    "channel": null,
    "status": "not_sure",
    "partition": "regression",
    "nextAction": null,
    "maxConfidence": 0.49
  },
  {
    "id": "holdout-malaysia-made-singapore-mark-v4-en",
    "sourceId": "holdout-malaysia-made-singapore-mark-v4",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-single-angle-no-mark-v4-en",
    "sourceId": "holdout-single-angle-no-mark-v4",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-single-marked-can-v5-en",
    "sourceId": "holdout-single-marked-can-v5",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-single-angle-foreign-can-v5-en",
    "sourceId": "holdout-single-angle-foreign-can-v5",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-marked-bottle-label-v6-en",
    "sourceId": "holdout-marked-bottle-label-v6",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-single-angle-malaysia-bottle-v6-en",
    "sourceId": "holdout-single-angle-malaysia-bottle-v6",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-cna-mark-and-barcode-v7-en",
    "sourceId": "holdout-cna-mark-and-barcode-v7",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-single-angle-malaysia-can-v7-en",
    "sourceId": "holdout-single-angle-malaysia-can-v7",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-marked-plastic-cup-v8-en",
    "sourceId": "holdout-marked-plastic-cup-v8",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-single-angle-coke-can-v8-en",
    "sourceId": "holdout-single-angle-coke-can-v8",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-marked-bottle-and-receipt-v10-en",
    "sourceId": "holdout-marked-bottle-and-receipt-v10",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-single-angle-malaysia-can-v10-en",
    "sourceId": "holdout-single-angle-malaysia-can-v10",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-outer-pack-mark-individual-can-unknown-v11-en",
    "sourceId": "holdout-outer-pack-mark-individual-can-unknown-v11",
    "locale": "en",
    "channel": null,
    "status": "not_sure",
    "partition": "regression",
    "nextAction": null,
    "maxConfidence": 0.49
  },
  {
    "id": "holdout-traveller-mark-and-barcode-v13-en",
    "sourceId": "holdout-traveller-mark-and-barcode-v13",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-hand-obscured-bottle-v13-en",
    "sourceId": "holdout-hand-obscured-bottle-v13",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-single-can-mark-and-barcode-v14-en",
    "sourceId": "holdout-single-can-mark-and-barcode-v14",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-multiple-containers-shelf-v14-en",
    "sourceId": "holdout-multiple-containers-shelf-v14",
    "locale": "en",
    "channel": null,
    "status": "not_sure",
    "partition": "regression",
    "nextAction": null,
    "maxConfidence": 0.49
  },
  {
    "id": "holdout-single-can-mark-and-barcode-v15-en",
    "sourceId": "holdout-single-can-mark-and-barcode-v15",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-standalone-mark-product-composite-v15-en",
    "sourceId": "holdout-standalone-mark-product-composite-v15",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-single-bottle-mark-and-barcode-v16-en",
    "sourceId": "holdout-single-bottle-mark-and-barcode-v16",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-container-obscured-at-machine-v16-en",
    "sourceId": "holdout-container-obscured-at-machine-v16",
    "locale": "en",
    "channel": null,
    "status": "not_sure",
    "partition": "regression",
    "nextAction": null,
    "maxConfidence": 0.49
  },
  {
    "id": "holdout-water-bottle-front-action-v17-en",
    "sourceId": "holdout-water-bottle-front-action-v17",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-glass-bottle-action-v17-en",
    "sourceId": "holdout-glass-bottle-action-v17",
    "locale": "en",
    "channel": "blue_bin",
    "status": "recyclable",
    "partition": "regression"
  },
  {
    "id": "holdout-plastic-sprite-action-v18-en",
    "sourceId": "holdout-plastic-sprite-action-v18",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-glass-sprite-action-v18-en",
    "sourceId": "holdout-glass-sprite-action-v18",
    "locale": "en",
    "channel": "blue_bin",
    "status": "recyclable",
    "partition": "regression"
  },
  {
    "id": "holdout-single-bottle-mark-barcode-v19-en",
    "sourceId": "holdout-single-bottle-mark-barcode-v19",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-multiple-imported-cans-v19-en",
    "sourceId": "holdout-multiple-imported-cans-v19",
    "locale": "en",
    "channel": null,
    "status": "not_sure",
    "partition": "regression",
    "nextAction": null,
    "maxConfidence": 0.49
  },
  {
    "id": "holdout-return-machine-bottle-cart-v20-en",
    "sourceId": "holdout-return-machine-bottle-cart-v20",
    "locale": "en",
    "channel": null,
    "status": "not_sure",
    "partition": "regression",
    "nextAction": null,
    "maxConfidence": 0.49
  },
  {
    "id": "holdout-multiple-paper-cartons-v20-en",
    "sourceId": "holdout-multiple-paper-cartons-v20",
    "locale": "en",
    "channel": null,
    "status": "not_sure",
    "partition": "regression",
    "nextAction": null,
    "maxConfidence": 0.49
  },
  {
    "id": "holdout-single-bottle-mark-barcode-v21-en",
    "sourceId": "holdout-single-bottle-mark-barcode-v21",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-single-angle-japanese-can-v21-en",
    "sourceId": "holdout-single-angle-japanese-can-v21",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-single-angle-recycling-symbol-can-v21-en",
    "sourceId": "holdout-single-angle-recycling-symbol-can-v21",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-foreign-deposit-can-v21-en",
    "sourceId": "holdout-foreign-deposit-can-v21",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "regression",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-sarsi-can-v22-en",
    "sourceId": "holdout-sarsi-can-v22",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "holdout",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-pocari-bottle-in-hand-v22-en",
    "sourceId": "holdout-pocari-bottle-in-hand-v22",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "holdout",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-short-coffee-can-v22-en",
    "sourceId": "holdout-short-coffee-can-v22",
    "locale": "en",
    "channel": "return_point",
    "status": "recyclable",
    "partition": "holdout",
    "nextAction": "return_container",
    "requiredExactText": [
      "S$0.10"
    ]
  },
  {
    "id": "holdout-tiger-glass-beer-bottle-v22-en",
    "sourceId": "holdout-tiger-glass-beer-bottle-v22",
    "locale": "en",
    "channel": "blue_bin",
    "status": "recyclable",
    "partition": "holdout"
  },
  {
    "id": "holdout-oat-milk-gable-carton-v22-en",
    "sourceId": "holdout-oat-milk-gable-carton-v22",
    "locale": "en",
    "channel": "blue_bin",
    "status": "recyclable",
    "partition": "holdout"
  },
  {
    "id": "holdout-shampoo-bottle-v22-en",
    "sourceId": "holdout-shampoo-bottle-v22",
    "locale": "en",
    "channel": "blue_bin",
    "status": "recyclable",
    "partition": "holdout"
  },
  {
    "id": "holdout-drink-box-with-straw-v22-en",
    "sourceId": "holdout-drink-box-with-straw-v22",
    "locale": "en",
    "channel": "blue_bin",
    "status": "recyclable",
    "partition": "holdout"
  }
];
