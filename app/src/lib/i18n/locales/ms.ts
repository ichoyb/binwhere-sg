import type en from './en';

const ms: Record<keyof typeof en, string> = {
  // Status labels
  'status.recyclable': 'Boleh Dikitar Semula',
  'status.special_handling': 'Pengendalian Khas',
  'status.consider_donating': 'Pertimbang Derma',
  'status.not_recyclable': 'Tidak Boleh Dikitar Semula',
  'status.not_sure': 'Tidak Pasti',

  // Channel labels
  'channel.blue_bin': 'Tong Kitar Semula Biru',
  'channel.ewaste': 'Kitar Semula E-Sisa',
  'channel.ewaste_battery': 'Kitar Semula Bateri',
  'channel.lighting': 'Sisa Pencahayaan',
  'channel.textile': 'Kitar Semula Tekstil',
  'channel.hazardous': 'Sisa Berbahaya',
  'channel.bulky_waste': 'Pelupusan Sisa Pukal',
  'channel.donation': 'Derma',
  'channel.general_waste': 'Sisa Am',

  // Channel instructions
  'instruction.blue_bin': 'Masukkan ke Tong Kitar Semula Biru',
  'instruction.ewaste': 'Bawa ke Pusat Pengumpulan E-Sisa',
  'instruction.ewaste_battery': 'Bawa ke Pusat Pengumpulan Bateri',
  'instruction.lighting': 'Bawa ke Pusat Pengumpulan Sisa Pencahayaan',
  'instruction.textile': 'Masukkan ke Tong Pengumpulan Tekstil',
  'instruction.hazardous': 'Bawa ke Pusat Pengumpulan Sisa Berbahaya',
  'instruction.bulky_waste': 'Jadualkan Pengambilan Sisa Pukal',
  'instruction.donation': 'Derma di Pusat Pengumpulan',
  'instruction.general_waste': 'Masukkan ke Tong Sisa Am',

  // Error messages
  'error.tooMany': 'Terlalu banyak permintaan. Sila tunggu dan cuba lagi.',
  'error.invalidImage': 'Imej tidak dapat diproses. Sila ambil foto baharu.',
  'error.imageTooLarge': 'Imej terlalu besar. Sila gunakan imej yang lebih kecil.',
  'error.serverBusy': 'Pelayan sibuk. Sila cuba lagi sebentar.',
  'error.noInternet': 'Tiada sambungan internet. Sila periksa rangkaian anda.',
  'error.classifyFailed': 'Tidak dapat mengenal pasti item. Sila cuba lagi.',
  'error.networkError': 'Masalah sambungan. Sila periksa rangkaian anda.',
  'error.generic': 'Sesuatu telah berlaku. Sila cuba lagi.',
  'error.title': 'Sesuatu telah berlaku',

  // Home page
  'home.snapToKnow': 'Tangkap untuk tahu.',
  'home.recycleRight': 'Kitar semula dengan betul.',
  'home.openCamera': 'Buka Kamera',
  'home.cameraDenied': 'Akses kamera ditolak',
  'home.cameraDeniedHint': 'Gunakan input teks di bawah untuk menerangkan item anda',
  'home.cameraUnavailable': 'Kamera tidak tersedia',
  'home.cameraUnavailableHint': 'Gunakan input teks di bawah untuk menerangkan item anda',
  'home.placeholderProminent': 'cth. botol plastik, telefon lama',
  'home.placeholderCompact': 'Taip nama item...',
  'home.search': 'Cari',
  'home.recent': 'Terkini',

  // Loading
  'loading.identifying': 'Mengenal pasti item...',
  'loading.checking': 'Menyemak peraturan kitar semula...',
  'loading.finding': 'Mencari tong terdekat...',
  'loading.almost': 'Hampir siap...',

  // Result page
  'result.back': 'Kembali',
  'result.beforeYouGo': 'Sebelum anda pergi',
  'result.tip': 'Tip: ',
  'result.scanAnother': 'Imbas Item Lain',
  'result.lowConfidence': 'Kami tidak pasti sepenuhnya — semak semula sebelum kitar semula',
  'result.nearbyBlueBins': 'Tong Biru',
  'result.nearbyTextileBins': 'Tong Tekstil',
  'result.nearbyDonationPoints': 'Pusat Derma',
  'result.nearbyEwastePoints': 'Pusat E-Sisa',
  'result.nearby': 'Berdekatan',
  'result.considerDonating': 'Pertimbang untuk Menderma',
  'result.gettingLocation': 'Mendapatkan lokasi anda...',
  'result.tapToFind': 'Ketik untuk mencari tong berdekatan',
  'result.requiresLocation': 'Memerlukan akses lokasi',
  'result.onlyInSG': 'Tong berdekatan hanya tersedia di Singapura',
  'result.sgDataOnly': 'Data pusat kitar semula meliputi Singapura sahaja',

  // Hazardous info card
  'hazardous.title': 'Cara Melupuskan Sisa Berbahaya',
  'hazardous.hotline': 'Talian NEA: 6225 5632',
  'hazardous.hotlineHint': 'Ketik untuk menelefon bagi panduan pelupusan',
  'hazardous.toxicWaste': 'Info Sisa Toksik NEA',
  'hazardous.pharmacy': 'Ubat luput boleh dipulangkan ke farmasi (Guardian / Watsons)',
  'hazardous.events': 'NEA mengadakan acara pengumpulan sisa berbahaya komuniti secara berkala',

  // Nearby page
  'nearby.nearby': 'Berdekatan',
  'nearby.noPoints': 'Tiada pusat ditemui berdekatan',
  'nearby.loadingMap': 'Memuatkan peta...',

  // Map
  'map.youAreHere': 'Anda di sini',
  'map.navigate': 'Navigasi',

  // Shared
  'shared.tryAgain': 'Cuba Lagi',
  'shared.go': 'Pergi',
  'shared.list': 'Senarai',
  'shared.map': 'Peta',
  'shared.walk': 'min berjalan',

  // Accept/donation labels
  'accept.ict': 'ICT',
  'accept.batteries': 'Bateri',
  'accept.lamps': 'Lampu',
  'accept.allEwaste': 'Semua e-sisa',
  'accept.appliances': 'Perkakas',
  'donate.baby': 'Bayi',
  'donate.bags': 'Beg',
  'donate.books': 'Buku',
  'donate.clothing': 'Pakaian',
  'donate.food': 'Makanan',
  'donate.furniture': 'Perabot',
  'donate.household': 'Barangan rumah',
  'donate.largeAppliances': 'Perkakas besar',
  'donate.electrical': 'Elektrik',
  'donate.shoes': 'Kasut',
  'donate.stationery': 'Alat tulis',
  'donate.toys': 'Mainan',
};

export default ms;
