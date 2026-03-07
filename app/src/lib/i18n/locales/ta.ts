import type en from './en';

const ta: Record<keyof typeof en, string> = {
  // Status labels
  'status.recyclable': 'மறுசுழற்சி செய்யலாம்',
  'status.special_handling': 'சிறப்பு கையாளுதல்',
  'status.consider_donating': 'நன்கொடை பரிசீலிக்கவும்',
  'status.not_recyclable': 'மறுசுழற்சி செய்ய இயலாது',
  'status.not_sure': 'உறுதியில்லை',

  // Channel labels
  'channel.blue_bin': 'நீல மறுசுழற்சி தொட்டி',
  'channel.ewaste': 'மின்-கழிவு மறுசுழற்சி',
  'channel.ewaste_battery': 'மின்கல மறுசுழற்சி',
  'channel.lighting': 'விளக்கு கழிவு',
  'channel.textile': 'ஜவுளி மறுசுழற்சி',
  'channel.hazardous': 'ஆபத்தான கழிவு',
  'channel.bulky_waste': 'பருமனான கழிவு அகற்றல்',
  'channel.donation': 'நன்கொடை',
  'channel.general_waste': 'பொது கழிவு',

  // Channel instructions
  'instruction.blue_bin': 'நீல மறுசுழற்சி தொட்டியில் போடுங்கள்',
  'instruction.ewaste': 'மின்-கழிவு சேகரிப்பு மையத்திற்கு கொண்டு செல்லுங்கள்',
  'instruction.ewaste_battery': 'மின்கல சேகரிப்பு மையத்திற்கு கொண்டு செல்லுங்கள்',
  'instruction.lighting': 'விளக்கு கழிவு சேகரிப்பு மையத்திற்கு கொண்டு செல்லுங்கள்',
  'instruction.textile': 'ஜவுளி சேகரிப்பு தொட்டியில் போடுங்கள்',
  'instruction.hazardous': 'ஆபத்தான கழிவு சேகரிப்பு மையத்திற்கு கொண்டு செல்லுங்கள்',
  'instruction.bulky_waste': 'பருமனான கழிவு அகற்றலை முன்பதிவு செய்யுங்கள்',
  'instruction.donation': 'சேகரிப்பு மையத்தில் நன்கொடை செய்யுங்கள்',
  'instruction.general_waste': 'பொது கழிவு தொட்டியில் போடுங்கள்',

  // Error messages
  'error.tooMany': 'அதிக கோரிக்கைகள். சிறிது நேரம் காத்திருந்து மீண்டும் முயலவும்.',
  'error.invalidImage': 'படத்தை செயலாக்க முடியவில்லை. புதிய புகைப்படம் எடுக்கவும்.',
  'error.imageTooLarge': 'படம் மிகப் பெரியது. சிறிய படத்தை முயலவும்.',
  'error.serverBusy': 'சேவையகம் பிஸியாக உள்ளது. சிறிது நேரத்தில் மீண்டும் முயலவும்.',
  'error.noInternet': 'இணைய இணைப்பு இல்லை. உங்கள் நெட்வொர்க்கை சரிபாருங்கள்.',
  'error.classifyFailed': 'பொருளை அடையாளம் காண முடியவில்லை. மீண்டும் முயலவும்.',
  'error.networkError': 'இணைப்பு சிக்கல். உங்கள் நெட்வொர்க்கை சரிபாருங்கள்.',
  'error.generic': 'ஏதோ தவறு நடந்தது. மீண்டும் முயலவும்.',
  'error.title': 'ஏதோ தவறு நடந்தது',

  // Home page
  'home.snapToKnow': 'படம் எடுத்து அறியுங்கள்.',
  'home.recycleRight': 'சிங்கப்பூரின் AI மறுசுழற்சி வழிகாட்டி.',
  'home.openCamera': 'கேமரா திறக்கவும்',
  'home.cameraDenied': 'கேமரா அணுகல் மறுக்கப்பட்டது',
  'home.cameraDeniedHint': 'உங்கள் பொருளை விவரிக்க கீழே உள்ள உரை உள்ளீட்டைப் பயன்படுத்தவும்',
  'home.cameraUnavailable': 'கேமரா கிடைக்கவில்லை',
  'home.cameraUnavailableHint': 'உங்கள் பொருளை விவரிக்க கீழே உள்ள உரை உள்ளீட்டைப் பயன்படுத்தவும்',
  'home.placeholderProminent': 'எ.கா. பிளாஸ்டிக் பாட்டில், பழைய தொலைபேசி',
  'home.placeholderCompact': 'பொருளின் பெயரை தட்டச்சு செய்க...',
  'home.search': 'தேடு',
  'home.recent': 'சமீபத்தியவை',

  // Loading
  'loading.identifying': 'பொருளை அடையாளம் காணுகிறது...',
  'loading.checking': 'மறுசுழற்சி விதிகளை சரிபார்க்கிறது...',
  'loading.finding': 'அருகிலுள்ள தொட்டியைக் கண்டறிகிறது...',
  'loading.almost': 'கிட்டத்தட்ட முடிந்தது...',

  // Result page
  'result.back': 'பின்செல்',
  'result.beforeYouGo': 'செல்வதற்கு முன்',
  'result.tip': 'குறிப்பு: ',
  'result.scanAnother': 'மற்றொரு பொருளை ஸ்கேன் செய்யவும்',
  'result.lowConfidence': 'நாங்கள் 100% உறுதியாக இல்லை — மறுசுழற்சி செய்வதற்கு முன் சரிபாருங்கள்',
  'result.nearbyBlueBins': 'நீல தொட்டிகள்',
  'result.nearbyTextileBins': 'ஜவுளி தொட்டிகள்',
  'result.nearbyDonationPoints': 'நன்கொடை மையங்கள்',
  'result.nearbyEwastePoints': 'மின்-கழிவு மையங்கள்',
  'result.nearby': 'அருகில்',
  'result.considerDonating': 'நன்கொடை செய்ய பரிசீலிக்கவும்',
  'result.gettingLocation': 'உங்கள் இருப்பிடத்தைப் பெறுகிறது...',
  'result.tapToFind': 'அருகிலுள்ள தொட்டிகளைக் கண்டறிய தட்டவும்',
  'result.requiresLocation': 'இருப்பிட அணுகல் தேவை',
  'result.onlyInSG': 'அருகிலுள்ள தொட்டிகள் சிங்கப்பூரில் மட்டுமே கிடைக்கும்',
  'result.sgDataOnly': 'மறுசுழற்சி மைய தரவு சிங்கப்பூரை மட்டுமே உள்ளடக்கியது',

  // Hazardous info card
  'hazardous.title': 'ஆபத்தான கழிவை எவ்வாறு அகற்றுவது',
  'hazardous.hotline': 'NEA தொலைபேசி: 6225 5632',
  'hazardous.hotlineHint': 'அகற்றல் வழிகாட்டுதலுக்கு அழைக்க தட்டவும்',
  'hazardous.toxicWaste': 'NEA நச்சு கழிவு தகவல்',
  'hazardous.pharmacy': 'காலாவதியான மருந்துகளை மருந்தகங்களில் (Guardian / Watsons) திருப்பி அளிக்கலாம்',
  'hazardous.events': 'NEA தொடர்ந்து சமூக ஆபத்தான கழிவு சேகரிப்பு நிகழ்வுகளை நடத்துகிறது',

  // Nearby page
  'nearby.nearby': 'அருகில்',
  'nearby.noPoints': 'அருகில் மையங்கள் எதுவும் கிடைக்கவில்லை',
  'nearby.loadingMap': 'வரைபடம் ஏற்றப்படுகிறது...',

  // Map
  'map.youAreHere': 'நீங்கள் இங்கே இருக்கிறீர்கள்',
  'map.navigate': 'வழிசெலுத்து',

  // Shared
  'shared.tryAgain': 'மீண்டும் முயலவும்',
  'shared.go': 'செல்',
  'shared.list': 'பட்டியல்',
  'shared.map': 'வரைபடம்',
  'shared.walk': 'நிமிடம் நடை',

  // Accept/donation labels
  'accept.ict': 'ICT',
  'accept.batteries': 'மின்கலங்கள்',
  'accept.lamps': 'விளக்குகள்',
  'accept.allEwaste': 'அனைத்து மின்-கழிவு',
  'accept.appliances': 'சாதனங்கள்',
  'donate.baby': 'குழந்தை',
  'donate.bags': 'பைகள்',
  'donate.books': 'புத்தகங்கள்',
  'donate.clothing': 'ஆடை',
  'donate.food': 'உணவு',
  'donate.furniture': 'தளவாடங்கள்',
  'donate.household': 'வீட்டுப் பொருட்கள்',
  'donate.largeAppliances': 'பெரிய சாதனங்கள்',
  'donate.electrical': 'மின்சாதனம்',
  'donate.shoes': 'காலணிகள்',
  'donate.stationery': 'எழுதுபொருள்',
  'donate.toys': 'பொம்மைகள்',
};

export default ta;
