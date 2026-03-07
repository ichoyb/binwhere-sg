import type en from './en';

const zh: Record<keyof typeof en, string> = {
  // Status labels
  'status.recyclable': '可回收',
  'status.special_handling': '需特殊处理',
  'status.consider_donating': '建议捐赠',
  'status.not_recyclable': '不可回收',
  'status.not_sure': '不确定',

  // Channel labels
  'channel.blue_bin': '蓝色回收桶',
  'channel.ewaste': '电子废弃物回收',
  'channel.ewaste_battery': '电池回收',
  'channel.lighting': '照明废弃物',
  'channel.textile': '纺织品回收',
  'channel.hazardous': '有害废弃物',
  'channel.bulky_waste': '大型废弃物处理',
  'channel.donation': '捐赠',
  'channel.general_waste': '一般垃圾',

  // Channel instructions
  'instruction.blue_bin': '投入蓝色回收桶',
  'instruction.ewaste': '送至电子废弃物回收点',
  'instruction.ewaste_battery': '送至电池回收点',
  'instruction.lighting': '送至照明废弃物回收点',
  'instruction.textile': '投入纺织品回收桶',
  'instruction.hazardous': '送至有害废弃物回收点',
  'instruction.bulky_waste': '预约大型废弃物清运',
  'instruction.donation': '送至捐赠回收点',
  'instruction.general_waste': '投入一般垃圾桶',

  // Error messages
  'error.tooMany': '请求过于频繁，请稍后再试。',
  'error.invalidImage': '无法处理上传的图片，请重新拍照。',
  'error.imageTooLarge': '图片太大，请使用较小的图片。',
  'error.serverBusy': '服务器繁忙，请稍后再试。',
  'error.noInternet': '无网络连接，请检查您的网络。',
  'error.classifyFailed': '无法识别物品，请重试。',
  'error.networkError': '连接出现问题，请检查您的网络。',
  'error.generic': '出了点问题，请重试。',
  'error.title': '出了点问题',

  // Home page
  'home.snapToKnow': '拍照识别',
  'home.recycleRight': '新加坡 AI 回收指南',
  'home.openCamera': '打开相机',
  'home.cameraDenied': '相机权限被拒绝',
  'home.cameraDeniedHint': '请使用下方文字输入来描述物品',
  'home.cameraUnavailable': '相机不可用',
  'home.cameraUnavailableHint': '请使用下方文字输入来描述物品',
  'home.placeholderProminent': '例如：塑料瓶、旧手机',
  'home.placeholderCompact': '输入物品名称...',
  'home.search': '搜索',
  'home.recent': '最近',

  // Loading
  'loading.identifying': '正在识别物品...',
  'loading.checking': '正在查询回收规则...',
  'loading.finding': '正在寻找最近的回收桶...',
  'loading.almost': '即将完成...',

  // Result page
  'result.back': '返回',
  'result.beforeYouGo': '投放前准备',
  'result.tip': '提示：',
  'result.scanAnother': '扫描其他物品',
  'result.lowConfidence': '我们不太确定——请在回收前再确认一下',
  'result.nearbyBlueBins': '蓝色回收桶',
  'result.nearbyTextileBins': '纺织品回收桶',
  'result.nearbyDonationPoints': '捐赠回收点',
  'result.nearbyEwastePoints': '电子废弃物回收点',
  'result.nearby': '附近',
  'result.considerDonating': '考虑捐赠',
  'result.gettingLocation': '正在获取您的位置...',
  'result.tapToFind': '点击查找附近的回收桶',
  'result.requiresLocation': '需要位置权限',
  'result.onlyInSG': '附近回收桶仅限新加坡地区',
  'result.sgDataOnly': '回收点数据仅覆盖新加坡',

  // Hazardous info card
  'hazardous.title': '如何处理有害废弃物',
  'hazardous.hotline': 'NEA 热线：6225 5632',
  'hazardous.hotlineHint': '点击拨打以获取处理指导',
  'hazardous.toxicWaste': 'NEA 有毒废弃物信息',
  'hazardous.pharmacy': '过期药物可退还至药房（Guardian / Watsons）',
  'hazardous.events': 'NEA 定期举办社区有害废弃物回收活动',

  // Nearby page
  'nearby.nearby': '附近',
  'nearby.noPoints': '附近没有找到回收点',
  'nearby.loadingMap': '正在加载地图...',

  // Map
  'map.youAreHere': '您在这里',
  'map.navigate': '导航',

  // Shared
  'shared.tryAgain': '重试',
  'shared.go': '导航',
  'shared.list': '列表',
  'shared.map': '地图',
  'shared.walk': '分钟步行',

  // Accept/donation labels
  'accept.ict': '资讯通信',
  'accept.batteries': '电池',
  'accept.lamps': '灯管',
  'accept.allEwaste': '所有电子废弃物',
  'accept.appliances': '电器',
  'donate.baby': '婴幼儿',
  'donate.bags': '包袋',
  'donate.books': '书籍',
  'donate.clothing': '服装',
  'donate.food': '食品',
  'donate.furniture': '家具',
  'donate.household': '家居用品',
  'donate.largeAppliances': '大型电器',
  'donate.electrical': '电器',
  'donate.shoes': '鞋子',
  'donate.stationery': '文具',
  'donate.toys': '玩具',
};

export default zh;
