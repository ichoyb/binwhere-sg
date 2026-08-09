import type { Locale } from '../i18n/types';

interface ItemTranslation {
  name: string;
  reason: string;
  preparation: string[];
  tip?: string;
}

interface CategoryTranslation {
  label: string;
  items: Record<string, ItemTranslation>;
}

// en is excluded — uses original item-categories.ts
export const ITEM_TRANSLATIONS: Record<Exclude<Locale, 'en'>, Record<string, CategoryTranslation>> = {
  zh: {
    paper: {
      label: '纸张与纸板',
      items: {
        'Newspaper': {
          name: '报纸',
          reason: '报纸属于干净的纸类产品，可在新加坡蓝色回收箱中回收。',
          preparation: ['保持干燥和清洁', '撕掉塑料包装', '叠好或折好'],
          tip: '将报纸捆在一起可以节省蓝色回收箱的空间。',
        },
        'Cardboard Box': {
          name: '纸箱',
          reason: '纸箱可以回收。请压扁后放入蓝色回收箱以节省空间。',
          preparation: ['尽可能撕掉胶带和标签', '将纸箱压扁', '保持干燥——湿纸箱需丢入普通垃圾箱'],
          tip: '将大纸箱剪成小块，方便回收。',
        },
        'Magazine': {
          name: '杂志',
          reason: '杂志（包括光面纸页）可在新加坡蓝色回收箱中回收。',
          preparation: ['撕掉塑料包装', '保持干燥'],
          tip: '不用取下订书钉——回收过程会处理。',
        },
        'Office Paper': {
          name: '办公用纸',
          reason: '办公用纸（打印或空白纸）是蓝色回收箱中最常见的可回收物之一。',
          preparation: ['取出塑料文件夹或夹子', '保持干燥'],
          tip: '碎纸也可放入蓝色回收箱——装在纸袋里防止散落。',
        },
        'Envelope': {
          name: '信封',
          reason: '纸质信封可以回收。带有小塑料窗口的信封也可以回收。',
          preparation: ['取出非纸质内容物', '保持干燥'],
          tip: '含气泡膜的加厚信封应将气泡膜取出单独处理。',
        },
        'Paper Bag': {
          name: '纸袋',
          reason: '干净的纸袋可以放入蓝色回收箱回收。',
          preparation: ['取下绳子或丝带提手', '将纸袋压扁', '确保干净干燥'],
          tip: '在回收之前，先重复使用纸袋购物。',
        },
        'Egg Carton (Paper)': {
          name: '鸡蛋盒（纸质）',
          reason: '纸质鸡蛋盒在干净干燥的情况下可以回收。泡沫塑料鸡蛋盒不可回收。',
          preparation: ['确认是纸/纸板材质，不是泡沫塑料', '清除食物残渣', '保持干燥'],
          tip: '泡沫塑料鸡蛋盒应丢入普通垃圾箱——只有纸质的才可回收。',
        },
        'Milk Carton / Tetra Pak': {
          name: '牛奶盒 / 利乐包',
          reason: '利乐包装盒在新加坡可以回收。回收前请先冲洗。',
          preparation: ['冲洗掉残留液体', '将包装盒压扁', '冲洗后盖上盖子'],
          tip: '利乐包有专门的回收流程——不用担心混合材料的问题。',
        },
      },
    },
    plastic: {
      label: '塑料',
      items: {
        'PET Bottle': {
          name: 'PET 塑料瓶',
          reason: 'PET（聚对苯二甲酸乙二醇酯）瓶子是最容易回收的塑料之一。请认准 #1 回收标志。',
          preparation: ['倒空并冲洗瓶子', '取下瓶盖（单独回收）', '压扁以节省空间'],
          tip: '不用撕掉标签——回收过程会处理。',
        },
        'Plastic Container': {
          name: '塑料容器',
          reason: '大多数硬质塑料容器（打包盒、食品盒）在干净干燥的情况下可以回收。',
          preparation: ['冲洗掉食物残渣', '晾干', '检查回收标志（#1-#7）'],
          tip: '严重油污无法清洗的容器应丢入普通垃圾箱。',
        },
        'Plastic Bag (Clean)': {
          name: '塑料袋（干净）',
          reason: '干净、干燥的塑料袋可以放入蓝色回收箱回收。脏的或湿的塑料袋应丢入普通垃圾箱。',
          preparation: ['确保塑料袋干净干燥', '把多个袋子绑在一起防止飘走'],
          tip: '回收前先考虑重复使用塑料袋。脏袋子会污染其他可回收物。',
        },
        'Shampoo Bottle': {
          name: '洗发水瓶',
          reason: '洗发水和沐浴露瓶子（通常为 HDPE #2 或 PP #5）可在蓝色回收箱中回收。',
          preparation: ['将瓶子完全倒空', '用水冲洗', '盖上瓶盖'],
          tip: '不用撕掉标签或取下按压泵——只需确保冲洗干净。',
        },
        'Yoghurt Cup': {
          name: '酸奶杯',
          reason: '塑料酸奶杯冲洗干净后可以回收。铝箔盖也可以回收。',
          preparation: ['刮掉残余的酸奶', '冲洗杯子', '揭下并冲洗铝箔盖（单独回收）'],
          tip: '简单冲洗即可——不需要洗得一尘不染。',
        },
        'Styrofoam': {
          name: '泡沫塑料',
          reason: '泡沫塑料（发泡聚苯乙烯）不可在新加坡蓝色回收箱中回收，需丢入普通垃圾箱。',
          preparation: ['放入普通垃圾箱', '不要放入蓝色回收箱——会污染其他可回收物'],
          tip: '尽量避免使用泡沫塑料容器。自带可重复使用的容器。',
        },
        'Cling Wrap': {
          name: '保鲜膜',
          reason: '保鲜膜（塑料薄膜）因污染和分拣困难，不可在新加坡蓝色回收箱中回收。',
          preparation: ['丢入普通垃圾箱'],
          tip: '可以考虑使用蜂蜡保鲜布或硅胶盖作为环保替代品。',
        },
      },
    },
    metal: {
      label: '金属',
      items: {
        'Aluminium Can': {
          name: '铝罐',
          reason: '铝罐可回收性极高，可以无限次回收而不会降低品质。',
          preparation: ['倒空罐子', '简单冲洗', '压扁以节省空间（可选）'],
          tip: '铝是最有价值的可回收物之一——回收一个铝罐节省的能源足够一台电视运行3小时。',
        },
        'Tin Can': {
          name: '锡罐',
          reason: '锡罐（钢/镀锡食品罐）可在蓝色回收箱中回收。',
          preparation: ['冲洗掉食物残渣', '如方便可撕掉纸质标签（可选）', '将盖子推入罐内确保安全'],
          tip: '标签可以留着——回收过程中会被烧掉。',
        },
        'Metal Lid': {
          name: '金属盖',
          reason: '罐头和瓶子的金属盖可在蓝色回收箱中回收。',
          preparation: ['冲洗掉食物残渣', '单独放入蓝色回收箱'],
          tip: '小金属盖可以收集在锡罐内，防止它们从分拣机器中掉落。',
        },
        'Aerosol Can (Empty)': {
          name: '喷雾罐（空罐）',
          reason: '空喷雾罐可以放入蓝色回收箱回收。必须完全排空。',
          preparation: ['确保罐子完全排空', '不要刺穿或压扁罐子', '尽可能取下塑料盖'],
          tip: '未完全排空的喷雾罐属于有害废弃物——请送至有害废弃物收集点。',
        },
        'Aluminium Foil (Clean)': {
          name: '铝箔纸（干净）',
          reason: '干净的铝箔纸可以回收。沾有油脂的铝箔纸不可回收。',
          preparation: ['擦拭或冲洗掉食物残渣', '揉成球状（方便分拣）', '只有足够干净的才可回收'],
          tip: '严重油腻的铝箔纸（如烧烤用的）应丢入普通垃圾箱。',
        },
      },
    },
    glass: {
      label: '玻璃',
      items: {
        'Glass Bottle': {
          name: '玻璃瓶',
          reason: '玻璃瓶可在新加坡蓝色回收箱中回收。玻璃可以无限次回收而不会降低品质。',
          preparation: ['倒空并冲洗瓶子', '取下瓶盖（金属盖也可回收）', '不用撕掉标签'],
          tip: '小心轻放以防破碎。碎玻璃应用报纸包好再放入回收箱。',
        },
        'Glass Jar': {
          name: '玻璃罐',
          reason: '玻璃罐（果酱、酱料、泡菜罐等）可在蓝色回收箱中回收。',
          preparation: ['冲洗掉食物残渣', '取下金属盖（单独回收）', '不用撕掉标签'],
          tip: '简单冲洗即可——不需要洗得一尘不染。',
        },
        'Wine Bottle': {
          name: '红酒瓶',
          reason: '红酒瓶由可回收玻璃制成，可放入蓝色回收箱。',
          preparation: ['倒空瓶子', '取出瓶塞（瓶塞不可放入蓝色回收箱）', '尽可能冲洗'],
          tip: '天然软木塞可以堆肥。人造瓶塞应丢入普通垃圾箱。',
        },
        'Mirror': {
          name: '镜子',
          reason: '镜子不可放入蓝色回收箱。镜子的反射涂层和玻璃成分与容器玻璃不同，会污染回收过程。',
          preparation: ['用报纸小心包裹以防受伤', '放入普通垃圾箱', '大面镜子请预约大型废弃物清运'],
          tip: '状况良好的镜子可以考虑捐给二手商店。',
        },
        'Pyrex / Ceramic': {
          name: 'Pyrex 耐热玻璃 / 陶瓷',
          reason: 'Pyrex（硼硅酸盐玻璃）和陶瓷的熔点与普通玻璃不同，会污染玻璃回收过程，需丢入普通垃圾箱。',
          preparation: ['用报纸包裹碎片', '如已破碎请标注"尖锐"', '放入普通垃圾箱'],
          tip: '完好的 Pyrex 或陶瓷物品可以捐给二手商店，而不是丢弃。',
        },
      },
    },
    electronics: {
      label: '电子产品',
      items: {
        'Laptop': {
          name: '笔记本电脑',
          reason: '笔记本电脑属于新加坡的受管制电子废弃物。它含有贵重金属和有害成分，需在指定电子废弃物收集点妥善回收。',
          preparation: ['备份并清除个人数据', '取下外接配件', '电池留在机器内（收集点会处理）'],
          tip: '状况良好的笔记本电脑可以捐给 Engineering Good 等慈善机构。',
        },
        'Mobile Phone': {
          name: '手机',
          reason: '手机属于受管制电子废弃物，必须送至指定电子废弃物收集点，不可放入蓝色回收箱或普通垃圾箱。',
          preparation: ['恢复出厂设置并清除个人数据', '取出 SIM 卡和存储卡', '取下手机壳（壳单独回收）'],
          tip: 'StarHub、Singtel 和 M1 门店接受旧手机回收。可用的手机也可以捐赠。',
        },
        'Tablet': {
          name: '平板电脑',
          reason: '平板电脑属于受管制电子废弃物，含有锂电池和贵重金属。请送至电子废弃物收集点。',
          preparation: ['恢复出厂设置并清除个人数据', '取下保护壳和屏幕保护膜'],
          tip: '可以考虑将可用的平板电脑捐给 Digital for Life 计划或慈善机构。',
        },
        'TV / Monitor': {
          name: '电视 / 显示器',
          reason: '电视和显示器属于受管制电子废弃物。根据新加坡的延伸生产者责任制度，提供送货的零售商必须提供一换一回收服务。',
          preparation: ['拔掉所有线缆', '如果是智能电视，请清除个人数据'],
          tip: '购买新电视时，记得要求零售商一换一回收旧电视——这是免费的。',
        },
        'Printer': {
          name: '打印机',
          reason: '打印机属于 ICT 设备，被归类为受管制电子废弃物，必须送至电子废弃物收集点。',
          preparation: ['取出墨盒/碳粉盒（单独回收）', '取出纸盒里的纸张', '拔掉线缆'],
          tip: '部分打印机品牌（HP、Canon）提供墨盒回收计划——请查看其官网。',
        },
        'Cables & Chargers': {
          name: '线缆与充电器',
          reason: '线缆和充电器含有铜和其他金属，应在电子废弃物收集点回收。',
          preparation: ['将线缆整齐捆好', '尽可能将不同类型分开'],
          tip: '商场和社区中心的电子废弃物收集箱接受线缆等小型电子物品。',
        },
        'Power Bank': {
          name: '充电宝',
          reason: '充电宝含有锂离子电池，处置不当会造成危险。必须送至电池/电子废弃物收集点。',
          preparation: ['丢弃前尽可能放完电', '不要刺穿或压扁', '用胶带覆盖裸露触点'],
          tip: '鼓胀或损坏的充电宝有起火风险——请小心处理并尽快送至电子废弃物收集点。',
        },
      },
    },
    batteries: {
      label: '电池',
      items: {
        'AA / AAA Battery': {
          name: 'AA / AAA 电池',
          reason: '所有电池在新加坡属于受管制废弃物。它们含有重金属和化学物质，填埋会造成污染。',
          preparation: ['用绝缘胶带覆盖电池端子以防短路', '存放在非金属容器中', '不要丢入普通垃圾箱或蓝色回收箱'],
          tip: '许多超市、社区中心和电子产品商店都有电池回收箱。',
        },
        'Button Cell Battery': {
          name: '纽扣电池',
          reason: '纽扣电池（用于手表、助听器、玩具）含有汞或氧化银，必须在指定收集点回收。',
          preparation: ['用胶带覆盖电池两面', '远离儿童（有吞食危险）', '妥善存放直到处理'],
          tip: '纽扣电池虽小但毒性很大——切勿丢入普通垃圾箱。',
        },
        'Lithium-Ion Battery': {
          name: '锂离子电池',
          reason: '锂离子电池（来自手机、笔记本电脑、电动滑板车）处置不当会引起火灾，需在电子废弃物收集点进行特殊处理。',
          preparation: ['用胶带覆盖端子', '不要刺穿、压扁或加热', '如已鼓胀请放入防火袋'],
          tip: '鼓胀的锂电池可能自燃——请小心处理并立即送至收集点。',
        },
        'Car Battery': {
          name: '汽车电池',
          reason: '汽车电池（铅酸电池）含有硫酸和铅，属于危险废弃物，必须在指定收集点妥善处理。',
          preparation: ['保持直立放置以防酸液泄漏', '不要打开或排空', '用安全容器小心运输'],
          tip: '大多数汽车维修厂和电池零售商接受旧汽车电池回收。',
        },
      },
    },
    textile: {
      label: '纺织品与衣物',
      items: {
        'T-Shirt': {
          name: 'T恤',
          reason: '可穿戴的衣物应捐赠或投入纺织品回收箱。即使是破旧的纺织品也可以回收为工业抹布或隔热材料。',
          preparation: ['捐赠前先洗净烘干', '折好放入袋中', '将可穿戴和破损物品分开'],
          tip: '纺织品回收箱（如 SG Recycle、Cloop）设在 HDB 组屋楼下和商场。',
        },
        'Jeans': {
          name: '牛仔裤',
          reason: '牛仔裤非常耐用，状况良好可以捐赠，也可以回收成纺织纤维。',
          preparation: ['捐赠前先清洗', '掏空所有口袋', '如已损坏则取下非纺织配件'],
          tip: '部分品牌（H&M、Uniqlo）门店设有旧衣回收计划。',
        },
        'Shoes': {
          name: '鞋子',
          reason: '可穿戴的鞋子可以通过纺织品回收箱或慈善机构捐赠。',
          preparation: ['清洗鞋子', '将成对的鞋子绑在一起或用橡皮筋固定', '放入袋中'],
          tip: 'Soles Up! 和 The Salvation Army 在新加坡接受旧鞋。',
        },
        'Handbag': {
          name: '手提包',
          reason: '可使用的手提包应予以捐赠。纺织品回收箱也接受包袋。',
          preparation: ['清空所有物品', '擦拭干净', '投入纺织品回收箱或直接捐赠'],
          tip: '品质好的包袋可以在 Carousell 上出售以供再利用。',
        },
        'Curtains': {
          name: '窗帘',
          reason: '窗帘属于纺织品，可以通过纺织品回收箱回收或捐赠。',
          preparation: ['取下挂钩和圆环', '如可能请先清洗', '折好装入袋中'],
          tip: '大型纺织品也可以捐给 The Salvation Army 等慈善机构，提供免费上门取货。',
        },
        'Bedsheets': {
          name: '床单',
          reason: '床单和寝具在状况良好时可以捐赠，或通过纺织品收集点回收。',
          preparation: ['彻底清洗并烘干', '整齐折好', '装入袋中投入纺织品回收箱'],
          tip: '旧床单可以在家中用作清洁抹布，之后再回收。',
        },
      },
    },
    lighting: {
      label: '照明',
      items: {
        'Fluorescent Tube': {
          name: '荧光灯管',
          reason: '荧光灯管含有汞，不可放入普通垃圾箱或蓝色回收箱。需在指定照明废弃物收集点处理。',
          preparation: ['小心处理——不要打碎', '尽可能保留原包装', '小心运送到收集点'],
          tip: '许多五金店和社区回收计划接受荧光灯管。',
        },
        'CFL Bulb': {
          name: 'CFL 节能灯泡',
          reason: 'CFL（紧凑型荧光灯）灯泡含有少量汞，必须在照明废弃物收集点回收。',
          preparation: ['轻拿轻放以防破碎', '用密封袋装好运输', '如已破碎，请通风并小心清扫'],
          tip: '建议改用 LED 灯泡——更持久、更省电，且不含汞。',
        },
        'LED Bulb': {
          name: 'LED 灯泡',
          reason: 'LED 灯泡含有电子元件，即使不含汞，也应在电子废弃物或照明收集点回收。',
          preparation: ['处理前让灯泡冷却', '如有原包装可使用'],
          tip: 'LED 灯泡寿命可达 15,000-50,000 小时——远超白炽灯或 CFL 灯泡。',
        },
        'Incandescent Bulb': {
          name: '白炽灯泡',
          reason: '白炽灯泡无害（不含汞），但也不可回收，应丢入普通垃圾箱。',
          preparation: ['用报纸或纸张包裹以防破碎', '放入普通垃圾箱'],
          tip: '白炽灯泡正在全球范围内被淘汰。换用 LED 灯泡可以节省电费。',
        },
      },
    },
    hazardous: {
      label: '有害废弃物',
      items: {
        'Paint': {
          name: '油漆',
          reason: '油漆含有有毒化学物质和溶剂，必须在指定有害废弃物收集点处理。切勿倒入下水道或普通垃圾箱。',
          preparation: ['保持原装容器并密封盖子', '不要混合不同类型的油漆', '竖直运输以防洒漏'],
          tip: '完全干透（无液体）的油漆罐可以丢入普通垃圾箱。少量油漆可以自然晾干。',
        },
        'Pesticide': {
          name: '杀虫剂',
          reason: '杀虫剂属于有毒化学品，必须在有害废弃物收集点处理。处理不当会污染土壤和水源。',
          preparation: ['保持原标签容器', '拧紧防止泄漏', '不要转入食品容器'],
          tip: 'NEA 定期举办有害废弃物回收活动——请查看 nea.gov.sg 了解时间安排。',
        },
        'Motor Oil': {
          name: '机油',
          reason: '废机油属于有害物质。一升废机油可以污染一百万升水。必须送至有害废弃物收集点。',
          preparation: ['存放在密封防漏容器中', '不要与其他液体混合', '竖直并固定好运输'],
          tip: '大多数汽车维修厂接受废机油进行妥善处理和回收。',
        },
        'Cleaning Chemical': {
          name: '清洁化学品',
          reason: '家用清洁化学品（漂白水、通渠水、烤箱清洁剂）属于有害废弃物，应送至指定收集点。',
          preparation: ['保持原装容器', '确保盖子拧紧', '不要混合不同化学品——可能产生有毒气体'],
          tip: '改用环保清洁产品（醋、小苏打）可以减少有害废弃物。',
        },
        'Expired Medicine': {
          name: '过期药品',
          reason: '过期或未使用的药品不应冲入马桶或丢入普通垃圾箱，它们会污染水源和土壤。',
          preparation: ['保持原包装', '撕掉标签上的个人信息', '送至收集点或药房'],
          tip: '新加坡许多 Watsons 和 Guardian 药房接受未使用的药品进行安全处理。',
        },
      },
    },
    furniture: {
      label: '家具与大型废弃物',
      items: {
        'Sofa': {
          name: '沙发',
          reason: '沙发属于大型废弃物，无法放入普通垃圾箱。请联系市镇理事会或 HDB 预约大型废弃物清运。',
          preparation: ['如可能，取下坐垫套用于纺织品回收', '放置在组屋指定的大型废弃物区域'],
          tip: '状况良好的沙发可以通过 Carousell Free、Pass It On 或 The Salvation Army 捐赠。',
        },
        'Mattress': {
          name: '床垫',
          reason: '床垫属于大型废弃物，需联系市镇理事会预约清运，或放置在指定大型废弃物区域。',
          preparation: ['取下床单和床垫保护套', '如可能，折叠或卷起床垫方便搬运'],
          tip: '部分床垫零售商在送新床垫时提供旧床垫回收服务。',
        },
        'Table': {
          name: '桌子',
          reason: '桌子属于大型废弃物。请联系市镇理事会预约大型废弃物清运。',
          preparation: ['如可拆卸，取下桌腿方便搬运', '清空桌面所有物品'],
          tip: '状况良好的桌子可以在 Carousell Free 上发布或捐给 The Salvation Army。',
        },
        'Chair': {
          name: '椅子',
          reason: '椅子被归类为大型废弃物，请通过组屋的大型废弃物清运时间表处理。',
          preparation: ['如果是折叠椅请先折叠', '如适用，取下坐垫用于纺织品回收'],
          tip: '带气压杆的办公椅应小心处理——气缸内有压力。',
        },
        'Bookshelf': {
          name: '书架',
          reason: '书架属于大型废弃物。请联系市镇理事会或 HDB 预约清运。',
          preparation: ['取出书架上所有物品', '如可能进行拆解以方便运输', '取下螺丝和五金件'],
          tip: '捐赠状况良好的书架——许多社区团体和慈善机构欢迎家具捐赠。',
        },
      },
    },
  },

  ms: {
    paper: {
      label: 'Kertas & Kadbod',
      items: {
        'Newspaper': {
          name: 'Surat Khabar',
          reason: 'Surat khabar adalah produk kertas bersih dan kering yang boleh dikitar semula dalam tong kitar semula biru di Singapura.',
          preparation: ['Pastikan kering dan bersih', 'Buang pembalut plastik', 'Susun kemas atau lipat'],
          tip: 'Ikat surat khabar bersama-sama untuk menjimatkan ruang dalam tong biru.',
        },
        'Cardboard Box': {
          name: 'Kotak Kadbod',
          reason: 'Kotak kadbod boleh dikitar semula. Leperkan untuk menjimatkan ruang dalam tong biru.',
          preparation: ['Buang semua pita pelekat dan label jika boleh', 'Leperkan kotak', 'Pastikan kering — kadbod basah masuk ke tong sampah biasa'],
          tip: 'Potong kotak besar kepada kepingan kecil untuk memudahkan kitar semula.',
        },
        'Magazine': {
          name: 'Majalah',
          reason: 'Majalah, termasuk halaman berkilat, diterima dalam tong kitar semula biru Singapura.',
          preparation: ['Buang pembalut plastik', 'Pastikan kering'],
          tip: 'Tidak perlu cabut dawai kokot — proses kitar semula akan mengendalikannya.',
        },
        'Office Paper': {
          name: 'Kertas Pejabat',
          reason: 'Kertas pejabat (bercetak atau kosong) adalah antara bahan yang paling kerap dikitar semula dalam tong biru.',
          preparation: ['Buang folder plastik atau klip pengikat', 'Pastikan kering'],
          tip: 'Kertas yang dicarik juga boleh dimasukkan ke tong biru — letakkan dalam beg kertas untuk mengelakkan berselerak.',
        },
        'Envelope': {
          name: 'Sampul Surat',
          reason: 'Sampul surat kertas boleh dikitar semula. Sampul surat dengan tetingkap plastik kecil juga diterima.',
          preparation: ['Keluarkan kandungan bukan kertas', 'Pastikan kering'],
          tip: 'Sampul surat berlapik gelembung udara perlu diasingkan — buang gelembung udara secara berasingan.',
        },
        'Paper Bag': {
          name: 'Beg Kertas',
          reason: 'Beg kertas bersih boleh dikitar semula dalam tong biru.',
          preparation: ['Buang pemegang tali atau reben', 'Leperkan beg', 'Pastikan bersih dan kering'],
          tip: 'Guna semula beg kertas untuk membeli-belah sebelum mengitar semulanya.',
        },
        'Egg Carton (Paper)': {
          name: 'Bekas Telur (Kertas)',
          reason: 'Bekas telur kertas boleh dikitar semula jika bersih dan kering. Bekas telur styrofoam TIDAK boleh dikitar semula.',
          preparation: ['Pastikan ia jenis kertas/kadbod, bukan styrofoam', 'Buang sisa makanan', 'Pastikan kering'],
          tip: 'Bekas telur styrofoam masuk ke tong sampah biasa — hanya yang kertas boleh dikitar semula.',
        },
        'Milk Carton / Tetra Pak': {
          name: 'Kotak Susu / Tetra Pak',
          reason: 'Kotak Tetra Pak boleh dikitar semula di Singapura. Bilas sebelum dikitar semula.',
          preparation: ['Bilas cecair yang tinggal', 'Leperkan kotak', 'Tutup semula penutup selepas dibilas'],
          tip: 'Tetra Pak mempunyai proses kitar semula khusus — tidak perlu risau tentang bahan campuran.',
        },
      },
    },
    plastic: {
      label: 'Plastik',
      items: {
        'PET Bottle': {
          name: 'Botol PET',
          reason: 'Botol PET (polietilena tereftalat) adalah antara plastik yang paling mudah dikitar semula. Cari simbol kitar semula #1.',
          preparation: ['Kosongkan dan bilas botol', 'Tanggalkan penutup (kitar semula secara berasingan)', 'Remukkan untuk menjimatkan ruang'],
          tip: 'Tidak perlu tanggalkan label — proses kitar semula akan mengendalikannya.',
        },
        'Plastic Container': {
          name: 'Bekas Plastik',
          reason: 'Kebanyakan bekas plastik tegar (kotak bungkus, bekas makanan) boleh dikitar semula jika bersih dan kering.',
          preparation: ['Bilas sisa makanan', 'Biarkan kering', 'Semak simbol kitar semula (#1-#7)'],
          tip: 'Bekas yang sangat kotor dan tidak boleh dibersihkan perlu dibuang ke tong sampah biasa.',
        },
        'Plastic Bag (Clean)': {
          name: 'Beg Plastik (Bersih)',
          reason: 'Beg plastik yang bersih dan kering boleh dikitar semula dalam tong biru. Beg yang kotor atau basah masuk ke tong sampah biasa.',
          preparation: ['Pastikan beg bersih dan kering', 'Ikat beg bersama-sama supaya tidak berterbangan'],
          tip: 'Pertimbangkan untuk guna semula beg plastik sebelum mengitar semulanya. Beg kotor mencemarkan bahan kitar semula lain.',
        },
        'Shampoo Bottle': {
          name: 'Botol Syampu',
          reason: 'Botol syampu dan pencuci badan (biasanya HDPE #2 atau PP #5) boleh dikitar semula dalam tong biru.',
          preparation: ['Kosongkan botol sepenuhnya', 'Bilas dengan air', 'Biarkan penutup terpasang'],
          tip: 'Tidak perlu tanggalkan label atau pam — pastikan sahaja sudah dibilas.',
        },
        'Yoghurt Cup': {
          name: 'Cawan Yogurt',
          reason: 'Cawan yogurt plastik boleh dikitar semula jika dibilas bersih. Penutup kerajang juga boleh dikitar semula.',
          preparation: ['Kikis sisa yogurt', 'Bilas cawan', 'Tanggalkan dan bilas penutup kerajang (kitar semula secara berasingan)'],
          tip: 'Bilasan ringkas sudah memadai — tidak perlu bersih sepenuhnya.',
        },
        'Styrofoam': {
          name: 'Styrofoam',
          reason: 'Styrofoam (polistirena terembang) tidak boleh dikitar semula dalam sistem tong biru Singapura. Ia mesti dibuang ke tong sampah biasa.',
          preparation: ['Buang ke tong sampah biasa', 'JANGAN masukkan ke tong biru — ia mencemarkan bahan kitar semula'],
          tip: 'Elakkan bekas styrofoam jika boleh. Bawa bekas sendiri yang boleh diguna semula.',
        },
        'Cling Wrap': {
          name: 'Plastik Pembalut',
          reason: 'Plastik pembalut (filem plastik) tidak boleh dikitar semula dalam sistem tong biru Singapura kerana pencemaran dan kesukaran pengasingan.',
          preparation: ['Buang ke tong sampah biasa'],
          tip: 'Pertimbangkan untuk beralih kepada pembalut lilin lebah atau penutup silikon sebagai alternatif mesra alam.',
        },
      },
    },
    metal: {
      label: 'Logam',
      items: {
        'Aluminium Can': {
          name: 'Tin Aluminium',
          reason: 'Tin aluminium sangat mudah dikitar semula dan boleh dikitar semula tanpa had tanpa kehilangan kualiti.',
          preparation: ['Kosongkan tin', 'Bilas ringkas', 'Remukkan untuk menjimatkan ruang (pilihan)'],
          tip: 'Aluminium adalah antara bahan kitar semula paling bernilai — mengitar semula satu tin menjimatkan tenaga yang cukup untuk menjalankan TV selama 3 jam.',
        },
        'Tin Can': {
          name: 'Tin Besi',
          reason: 'Tin besi (tin makanan keluli/bersadur timah) boleh dikitar semula dalam tong biru.',
          preparation: ['Bilas sisa makanan', 'Tanggalkan label kertas jika mudah (pilihan)', 'Tolak penutup ke dalam tin untuk keselamatan'],
          tip: 'Label boleh dibiarkan — ia akan terbakar semasa proses kitar semula.',
        },
        'Metal Lid': {
          name: 'Penutup Logam',
          reason: 'Penutup logam daripada balang dan botol boleh dikitar semula dalam tong biru.',
          preparation: ['Bilas sisa makanan', 'Letakkan secara berasingan dalam tong biru'],
          tip: 'Penutup logam kecil boleh dikumpulkan dalam tin besi untuk mengelakkannya jatuh melalui mesin pengasingan.',
        },
        'Aerosol Can (Empty)': {
          name: 'Tin Aerosol (Kosong)',
          reason: 'Tin aerosol kosong boleh dikitar semula dalam tong biru. Ia mesti benar-benar kosong.',
          preparation: ['Pastikan tin benar-benar kosong', 'JANGAN tebuk atau remukkan tin', 'Tanggalkan penutup plastik jika boleh'],
          tip: 'Tin aerosol yang masih ada isi adalah sisa berbahaya — bawa ke pusat pengumpulan sisa berbahaya.',
        },
        'Aluminium Foil (Clean)': {
          name: 'Kerajang Aluminium (Bersih)',
          reason: 'Kerajang aluminium bersih boleh dikitar semula. Kerajang yang tercemar dengan gris makanan tidak boleh.',
          preparation: ['Lap atau bilas sisa makanan', 'Kepalkan menjadi bebola (lebih mudah diasingkan)', 'Hanya kitar semula jika agak bersih'],
          tip: 'Kerajang yang sangat berminyak (cth. daripada BBQ) perlu dibuang ke tong sampah biasa.',
        },
      },
    },
    glass: {
      label: 'Kaca',
      items: {
        'Glass Bottle': {
          name: 'Botol Kaca',
          reason: 'Botol kaca boleh dikitar semula dalam tong biru Singapura. Kaca boleh dikitar semula tanpa had tanpa kehilangan kualiti.',
          preparation: ['Kosongkan dan bilas botol', 'Tanggalkan penutup (penutup logam juga boleh dikitar semula)', 'Tidak perlu tanggalkan label'],
          tip: 'Kendalikan dengan berhati-hati untuk mengelakkan pecah. Kaca pecah perlu dibalut dengan surat khabar sebelum dimasukkan ke dalam tong.',
        },
        'Glass Jar': {
          name: 'Balang Kaca',
          reason: 'Balang kaca (jem, sos, jeruk) boleh dikitar semula dalam tong biru.',
          preparation: ['Bilas sisa makanan', 'Tanggalkan penutup logam (kitar semula secara berasingan)', 'Tidak perlu tanggalkan label'],
          tip: 'Bilasan ringkas sudah memadai — tidak perlu bersih sepenuhnya.',
        },
        'Wine Bottle': {
          name: 'Botol Wain',
          reason: 'Botol wain diperbuat daripada kaca yang boleh dikitar semula dan boleh dimasukkan ke tong biru.',
          preparation: ['Kosongkan botol', 'Keluarkan penyumbat (penyumbat gabus tidak boleh dikitar semula dalam tong biru)', 'Bilas jika boleh'],
          tip: 'Penyumbat gabus asli boleh dijadikan kompos. Penyumbat sintetik masuk ke tong sampah biasa.',
        },
        'Mirror': {
          name: 'Cermin',
          reason: 'Cermin TIDAK boleh dikitar semula dalam tong biru. Salutan pantulan dan komposisi kaca cermin berbeza daripada kaca bekas dan mencemarkan proses kitar semula.',
          preparation: ['Balut dengan berhati-hati menggunakan surat khabar untuk mengelakkan kecederaan', 'Buang ke tong sampah biasa', 'Untuk cermin besar, jadualkan kutipan sisa pukal'],
          tip: 'Pertimbangkan untuk menderma cermin dalam keadaan baik kepada kedai barangan terpakai.',
        },
        'Pyrex / Ceramic': {
          name: 'Pyrex / Seramik',
          reason: 'Pyrex (kaca borosilikat) dan seramik mempunyai takat lebur berbeza daripada kaca biasa. Ia mencemarkan kitar semula kaca dan mesti dibuang ke tong sampah biasa.',
          preparation: ['Balut kepingan pecah dengan surat khabar', 'Labelkan "tajam" jika pecah', 'Buang ke tong sampah biasa'],
          tip: 'Derma barangan Pyrex atau seramik yang tidak pecah kepada kedai barangan terpakai.',
        },
      },
    },
    electronics: {
      label: 'Elektronik',
      items: {
        'Laptop': {
          name: 'Komputer Riba',
          reason: 'Komputer riba adalah e-sisa terkawal di Singapura. Ia mengandungi logam bernilai dan komponen berbahaya yang memerlukan kitar semula di pusat pengumpulan e-sisa.',
          preparation: ['Sandarkan dan padam data peribadi', 'Tanggalkan aksesori luaran', 'Biarkan bateri di dalam (pusat pengumpulan akan mengendalikannya)'],
          tip: 'Komputer riba yang masih berfungsi boleh didermakan kepada badan amal seperti Engineering Good.',
        },
        'Mobile Phone': {
          name: 'Telefon Bimbit',
          reason: 'Telefon bimbit adalah e-sisa terkawal. Ia mesti dilupuskan di pusat pengumpulan e-sisa, bukan di tong biru atau tong sampah biasa.',
          preparation: ['Tetapan semula kilang dan padam data peribadi', 'Keluarkan kad SIM dan kad memori', 'Tanggalkan sarung telefon (kitar semula sarung secara berasingan)'],
          tip: 'Kedai StarHub, Singtel dan M1 menerima telefon lama untuk kitar semula. Telefon yang masih berfungsi boleh didermakan.',
        },
        'Tablet': {
          name: 'Tablet',
          reason: 'Tablet adalah e-sisa terkawal yang mengandungi bateri litium dan logam berharga. Bawa ke pusat pengumpulan e-sisa.',
          preparation: ['Tetapan semula kilang dan padam data peribadi', 'Tanggalkan sarung pelindung dan pelindung skrin'],
          tip: 'Pertimbangkan untuk menderma tablet yang masih berfungsi kepada program Digital for Life atau badan amal.',
        },
        'TV / Monitor': {
          name: 'TV / Monitor',
          reason: 'TV dan monitor adalah e-sisa terkawal. Di bawah skim Tanggungjawab Pengeluar Dilanjutkan Singapura, peruncit yang menawarkan penghantaran mesti menyediakan perkhidmatan tukar ganti 1-untuk-1.',
          preparation: ['Cabut semua kabel', 'Padam data peribadi jika ia TV pintar'],
          tip: 'Apabila membeli TV baru, minta peruncit untuk tukar ganti 1-untuk-1 TV lama anda — ia percuma.',
        },
        'Printer': {
          name: 'Pencetak',
          reason: 'Pencetak adalah peralatan ICT yang diklasifikasikan sebagai e-sisa terkawal. Ia mesti dibawa ke pusat pengumpulan e-sisa.',
          preparation: ['Keluarkan kartrij dakwat/toner (kitar semula secara berasingan)', 'Keluarkan kertas dari dulang', 'Cabut kabel'],
          tip: 'Beberapa jenama pencetak (HP, Canon) mempunyai program kitar semula kartrij — semak laman web mereka.',
        },
        'Cables & Chargers': {
          name: 'Kabel & Pengecas',
          reason: 'Kabel dan pengecas mengandungi tembaga dan logam lain. Ia perlu dikitar semula di pusat pengumpulan e-sisa.',
          preparation: ['Ikat kabel dengan kemas', 'Asingkan jenis yang berbeza jika boleh'],
          tip: 'Tong pengumpulan e-sisa di pusat beli-belah dan pusat komuniti menerima barangan kecil seperti kabel.',
        },
        'Power Bank': {
          name: 'Pengecas Mudah Alih',
          reason: 'Pengecas mudah alih mengandungi bateri litium-ion yang berbahaya jika dilupuskan secara tidak wajar. Ia mesti dibawa ke pusat pengumpulan bateri/e-sisa.',
          preparation: ['Nyahcas jika boleh sebelum pelupusan', 'JANGAN tebuk atau remukkan', 'Tampal pita pada sentuhan yang terdedah'],
          tip: 'Pengecas mudah alih yang kembung atau rosak boleh menyebabkan kebakaran — kendalikan dengan berhati-hati dan bawa ke pusat e-sisa segera.',
        },
      },
    },
    batteries: {
      label: 'Bateri',
      items: {
        'AA / AAA Battery': {
          name: 'Bateri AA / AAA',
          reason: 'Semua bateri adalah sisa terkawal di Singapura. Ia mengandungi logam berat dan bahan kimia yang berbahaya jika dibuang ke tapak pelupusan.',
          preparation: ['Tampal pita pada terminal untuk mengelakkan litar pintas', 'Simpan dalam bekas bukan logam', 'JANGAN buang ke tong sampah biasa atau tong biru'],
          tip: 'Tong kitar semula bateri terdapat di banyak pasar raya, pusat komuniti, dan kedai elektronik.',
        },
        'Button Cell Battery': {
          name: 'Bateri Sel Butang',
          reason: 'Bateri sel butang (dalam jam tangan, alat pendengaran, mainan) mengandungi merkuri atau perak oksida. Ia mesti dikitar semula di pusat pengumpulan yang ditetapkan.',
          preparation: ['Tampal pita pada kedua-dua belah bateri', 'Jauhkan daripada kanak-kanak (bahaya tertelan)', 'Simpan dengan selamat sehingga dilupuskan'],
          tip: 'Bateri sel butang kecil tetapi sangat toksik — jangan sesekali buang ke tong sampah biasa.',
        },
        'Lithium-Ion Battery': {
          name: 'Bateri Litium-Ion',
          reason: 'Bateri litium-ion (daripada telefon, komputer riba, skuter elektrik) boleh menyebabkan kebakaran jika dilupuskan secara tidak wajar. Ia memerlukan pengendalian khas di pusat pengumpulan e-sisa.',
          preparation: ['Tampal pita pada terminal', 'JANGAN tebuk, remukkan, atau dedahkan kepada haba', 'Letakkan dalam beg kalis api jika kembung'],
          tip: 'Bateri litium yang kembung boleh terbakar — kendalikan dengan berhati-hati dan bawa ke pusat pengumpulan segera.',
        },
        'Car Battery': {
          name: 'Bateri Kereta',
          reason: 'Bateri kereta (asid plumbum) mengandungi asid sulfurik dan plumbum. Ia berbahaya dan mesti dilupuskan di pusat pengumpulan yang ditetapkan.',
          preparation: ['Pastikan tegak untuk mengelakkan kebocoran asid', 'JANGAN buka atau toskan', 'Angkut dengan berhati-hati dalam bekas yang selamat'],
          tip: 'Kebanyakan bengkel kereta dan peruncit bateri menerima bateri kereta lama untuk kitar semula.',
        },
      },
    },
    textile: {
      label: 'Tekstil & Pakaian',
      items: {
        'T-Shirt': {
          name: 'Baju-T',
          reason: 'Pakaian dalam keadaan boleh dipakai patut didermakan atau diletakkan dalam tong kitar semula tekstil. Tekstil lusuh pun boleh dikitar semula menjadi kain buruk industri atau penebat.',
          preparation: ['Basuh dan keringkan sebelum menderma', 'Lipat kemas dan masukkan ke dalam beg', 'Asingkan yang boleh dipakai daripada yang rosak'],
          tip: 'Tong kitar semula tekstil (cth. SG Recycle, Cloop) terdapat di kaki void HDB dan pusat beli-belah.',
        },
        'Jeans': {
          name: 'Seluar Jeans',
          reason: 'Seluar jeans denim sangat tahan lama dan boleh didermakan jika dalam keadaan baik, atau dikitar semula menjadi gentian tekstil.',
          preparation: ['Basuh sebelum menderma', 'Kosongkan semua poket', 'Tanggalkan aksesori bukan tekstil jika rosak'],
          tip: 'Beberapa jenama (H&M, Uniqlo) mempunyai program pengumpulan pakaian di kedai.',
        },
        'Shoes': {
          name: 'Kasut',
          reason: 'Kasut dalam keadaan boleh dipakai boleh didermakan melalui tong pengumpulan tekstil atau organisasi kebajikan.',
          preparation: ['Bersihkan kasut', 'Ikat pasangan bersama atau guna getah', 'Masukkan dalam beg'],
          tip: 'Soles Up! dan The Salvation Army menerima kasut terpakai di Singapura.',
        },
        'Handbag': {
          name: 'Beg Tangan',
          reason: 'Beg tangan dalam keadaan boleh digunakan patut didermakan. Tong pengumpulan tekstil juga menerima beg.',
          preparation: ['Kosongkan semua kandungan', 'Lap bersih', 'Letakkan di tong pengumpulan tekstil atau derma terus'],
          tip: 'Beg berkualiti baik boleh dijual di platform seperti Carousell untuk diguna semula.',
        },
        'Curtains': {
          name: 'Langsir',
          reason: 'Langsir adalah tekstil yang boleh dikitar semula atau didermakan melalui tong pengumpulan tekstil.',
          preparation: ['Tanggalkan cangkuk dan gelang', 'Basuh jika boleh', 'Lipat dan masukkan ke dalam beg'],
          tip: 'Barangan tekstil besar juga boleh didermakan kepada badan amal seperti The Salvation Army dengan kutipan percuma.',
        },
        'Bedsheets': {
          name: 'Cadar',
          reason: 'Cadar dan linen boleh didermakan jika dalam keadaan baik atau dikitar semula melalui pusat pengumpulan tekstil.',
          preparation: ['Basuh dan keringkan dengan teliti', 'Lipat kemas', 'Masukkan ke dalam beg untuk tong pengumpulan tekstil'],
          tip: 'Cadar lama boleh digunakan semula sebagai kain buruk di rumah sebelum dikitar semula.',
        },
      },
    },
    lighting: {
      label: 'Lampu',
      items: {
        'Fluorescent Tube': {
          name: 'Tiub Pendarfluor',
          reason: 'Tiub pendarfluor mengandungi merkuri dan tidak boleh dibuang ke tong sampah biasa atau tong biru. Ia memerlukan pelupusan di pusat pengumpulan sisa lampu.',
          preparation: ['Kendalikan dengan berhati-hati — jangan pecahkan', 'Simpan dalam pembungkusan asal jika boleh', 'Angkut dengan berhati-hati ke pusat pengumpulan'],
          tip: 'Banyak kedai perkakasan dan program kitar semula komuniti menerima tiub pendarfluor.',
        },
        'CFL Bulb': {
          name: 'Mentol CFL',
          reason: 'Mentol CFL (lampu pendarfluor padat) mengandungi sedikit merkuri. Ia mesti dikitar semula di pusat pengumpulan sisa lampu.',
          preparation: ['Kendalikan dengan lembut untuk mengelakkan pecah', 'Letakkan dalam beg yang dimeterai untuk pengangkutan', 'Jika pecah, udarakan kawasan dan sapu dengan berhati-hati'],
          tip: 'Pertimbangkan untuk beralih kepada mentol LED — lebih tahan lama, lebih jimat tenaga, dan tidak mengandungi merkuri.',
        },
        'LED Bulb': {
          name: 'Mentol LED',
          reason: 'Mentol LED mengandungi komponen elektronik dan perlu dikitar semula di pusat pengumpulan e-sisa atau lampu, walaupun ia tidak mengandungi merkuri.',
          preparation: ['Biarkan mentol sejuk sebelum dikendalikan', 'Letakkan dalam pembungkusan asal jika ada'],
          tip: 'Mentol LED boleh bertahan 15,000-50,000 jam — jauh lebih lama daripada mentol pijar atau CFL.',
        },
        'Incandescent Bulb': {
          name: 'Mentol Pijar',
          reason: 'Mentol pijar tidak berbahaya (tiada merkuri) tetapi juga tidak boleh dikitar semula. Ia perlu dibuang ke tong sampah biasa.',
          preparation: ['Balut dengan surat khabar atau kertas untuk mengelakkan pecah', 'Buang ke tong sampah biasa'],
          tip: 'Mentol pijar sedang dihentikan secara global. Beralih kepada LED untuk penjimatan tenaga.',
        },
      },
    },
    hazardous: {
      label: 'Sisa Berbahaya',
      items: {
        'Paint': {
          name: 'Cat',
          reason: 'Cat mengandungi bahan kimia toksik dan pelarut. Ia mesti dilupuskan di pusat pengumpulan sisa berbahaya. Jangan sesekali tuang ke dalam longkang atau tong sampah biasa.',
          preparation: ['Simpan dalam bekas asal dengan penutup dimeterai', 'JANGAN campurkan jenis cat yang berbeza', 'Angkut dalam keadaan tegak untuk mengelakkan tumpahan'],
          tip: 'Tin cat yang sudah kering sepenuhnya (tiada cecair) boleh dibuang ke tong sampah biasa. Biarkan cat dalam kuantiti kecil mengering secara semula jadi.',
        },
        'Pesticide': {
          name: 'Racun Perosak',
          reason: 'Racun perosak dan racun serangga adalah bahan kimia toksik yang mesti dilupuskan di pusat pengumpulan sisa berbahaya. Ia mencemarkan tanah dan air jika dibuang secara tidak wajar.',
          preparation: ['Simpan dalam bekas asal berlabel', 'Tutup rapat untuk mengelakkan kebocoran', 'JANGAN pindahkan ke bekas makanan'],
          tip: 'NEA menganjurkan kempen pengumpulan sisa berbahaya secara berkala — semak nea.gov.sg untuk jadual.',
        },
        'Motor Oil': {
          name: 'Minyak Motor',
          reason: 'Minyak motor terpakai adalah bahan berbahaya. Satu liter boleh mencemarkan satu juta liter air. Ia mesti dibawa ke pusat pengumpulan sisa berbahaya.',
          preparation: ['Simpan dalam bekas yang dimeterai dan kalis bocor', 'JANGAN campurkan dengan cecair lain', 'Angkut dalam keadaan tegak dan selamat'],
          tip: 'Kebanyakan bengkel kereta menerima minyak motor terpakai untuk pelupusan dan kitar semula yang betul.',
        },
        'Cleaning Chemical': {
          name: 'Bahan Kimia Pembersih',
          reason: 'Bahan kimia pembersih isi rumah (peluntur, pencuci longkang, pembersih ketuhar) adalah sisa berbahaya. Ia perlu dibawa ke pusat pengumpulan yang ditetapkan.',
          preparation: ['Simpan dalam bekas asal', 'Pastikan penutup ditutup rapat', 'JANGAN campurkan bahan kimia berbeza — ini boleh menghasilkan gas toksik'],
          tip: 'Beralih kepada produk pembersih mesra alam (cuka, soda bikarbonat) untuk mengurangkan sisa berbahaya.',
        },
        'Expired Medicine': {
          name: 'Ubat Tamat Tempoh',
          reason: 'Ubat tamat tempoh atau tidak digunakan tidak boleh disiram atau dibuang ke tong sampah biasa. Ia boleh mencemarkan bekalan air dan tanah.',
          preparation: ['Simpan dalam pembungkusan asal', 'Padam maklumat peribadi daripada label', 'Bawa ke pusat pengumpulan atau farmasi'],
          tip: 'Banyak farmasi Watsons dan Guardian di Singapura menerima ubat yang tidak digunakan untuk pelupusan selamat.',
        },
      },
    },
    furniture: {
      label: 'Perabot & Barangan Pukal',
      items: {
        'Sofa': {
          name: 'Sofa',
          reason: 'Sofa adalah barangan sisa pukal yang tidak muat dalam tong biasa. Jadualkan kutipan sisa pukal dengan majlis perbandaran atau HDB anda.',
          preparation: ['Tanggalkan sarung kusyen untuk kitar semula tekstil jika boleh', 'Letakkan di kawasan sisa pukal yang ditetapkan di estet anda'],
          tip: 'Jika sofa dalam keadaan baik, pertimbangkan untuk menderma melalui Carousell Free, Pass It On, atau The Salvation Army.',
        },
        'Mattress': {
          name: 'Tilam',
          reason: 'Tilam adalah sisa pukal. Ia perlu dijadualkan untuk kutipan oleh majlis perbandaran anda atau dilupuskan di kawasan sisa pukal yang ditetapkan.',
          preparation: ['Tanggalkan cadar dan pelindung tilam', 'Jika boleh, lipat atau gulung tilam untuk pengendalian yang lebih mudah'],
          tip: 'Sesetengah peruncit tilam menawarkan perkhidmatan membuang tilam lama anda semasa menghantar yang baru.',
        },
        'Table': {
          name: 'Meja',
          reason: 'Meja adalah barangan sisa pukal. Hubungi majlis perbandaran anda untuk kutipan sisa pukal yang dijadualkan.',
          preparation: ['Tanggalkan kaki yang boleh ditanggalkan untuk pengendalian yang lebih mudah', 'Kosongkan semua barangan dari meja'],
          tip: 'Meja dalam keadaan baik boleh disenaraikan di Carousell Free atau didermakan kepada The Salvation Army.',
        },
        'Chair': {
          name: 'Kerusi',
          reason: 'Kerusi diklasifikasikan sebagai sisa pukal. Lupuskan melalui jadual kutipan sisa pukal estet anda.',
          preparation: ['Lipat jika ia kerusi boleh lipat', 'Tanggalkan kusyen untuk kitar semula tekstil jika berkenaan'],
          tip: 'Kerusi pejabat dengan silinder gas perlu dikendalikan dengan berhati-hati — silinder berada di bawah tekanan.',
        },
        'Bookshelf': {
          name: 'Rak Buku',
          reason: 'Rak buku adalah barangan sisa pukal. Jadualkan kutipan melalui majlis perbandaran atau HDB anda.',
          preparation: ['Keluarkan semua barangan dari rak', 'Bongkarkan jika boleh untuk pengangkutan yang lebih mudah', 'Tanggalkan skru dan perkakasan'],
          tip: 'Derma rak buku dalam keadaan baik — banyak kumpulan komuniti dan badan amal mengalu-alukan derma perabot.',
        },
      },
    },
  },

  ta: {
    paper: {
      label: 'காகிதம் & அட்டை',
      items: {
        'Newspaper': {
          name: 'செய்தித்தாள்',
          reason: 'செய்தித்தாள்கள் சுத்தமான, உலர்ந்த காகிதப் பொருட்கள் ஆகும், சிங்கப்பூரின் நீலத் தொட்டி அமைப்பில் மறுசுழற்சி செய்யலாம்.',
          preparation: ['உலர்வாகவும் சுத்தமாகவும் வைக்கவும்', 'பிளாஸ்டிக் உறையை அகற்றவும்', 'அடுக்கி வைக்கவும் அல்லது மடிக்கவும்'],
          tip: 'நீலத் தொட்டியில் இடத்தை மிச்சப்படுத்த செய்தித்தாள்களை ஒன்றாகக் கட்டவும்.',
        },
        'Cardboard Box': {
          name: 'அட்டைப் பெட்டி',
          reason: 'அட்டைப் பெட்டிகளை மறுசுழற்சி செய்யலாம். நீலத் தொட்டியில் இடத்தை மிச்சப்படுத்த தட்டையாக்கவும்.',
          preparation: ['முடிந்தால் அனைத்து டேப் மற்றும் லேபிள்களை அகற்றவும்', 'பெட்டியை தட்டையாக்கவும்', 'உலர்வாக வைக்கவும் — ஈரமான அட்டை சாதாரணக் குப்பைத் தொட்டிக்குச் செல்ல வேண்டும்'],
          tip: 'பெரிய பெட்டிகளை சிறிய துண்டுகளாக வெட்டுங்கள், மறுசுழற்சிக்கு எளிதாகும்.',
        },
        'Magazine': {
          name: 'பத்திரிகை',
          reason: 'பளபளப்பான பக்கங்கள் உட்பட பத்திரிகைகள் சிங்கப்பூரின் நீல மறுசுழற்சித் தொட்டிகளில் ஏற்றுக்கொள்ளப்படுகின்றன.',
          preparation: ['பிளாஸ்டிக் உறையை அகற்றவும்', 'உலர்வாக வைக்கவும்'],
          tip: 'ஊக்குகளை அகற்ற வேண்டியதில்லை — மறுசுழற்சி செயல்முறை அவற்றைக் கையாளும்.',
        },
        'Office Paper': {
          name: 'அலுவலகக் காகிதம்',
          reason: 'அலுவலகக் காகிதம் (அச்சிடப்பட்ட அல்லது வெற்று) நீலத் தொட்டியில் மிகவும் பொதுவாக மறுசுழற்சி செய்யப்படும் பொருட்களில் ஒன்று.',
          preparation: ['பிளாஸ்டிக் கோப்புறைகள் அல்லது கிளிப்களை அகற்றவும்', 'உலர்வாக வைக்கவும்'],
          tip: 'நறுக்கப்பட்ட காகிதமும் நீலத் தொட்டிக்குள் செல்லலாம் — சிதறுவதைத் தடுக்க காகிதப் பையில் வைக்கவும்.',
        },
        'Envelope': {
          name: 'கவர்',
          reason: 'காகிதக் கவர்கள் மறுசுழற்சி செய்யக்கூடியவை. சிறிய பிளாஸ்டிக் சாளரங்கள் கொண்ட கவர்களும் ஏற்றுக்கொள்ளப்படுகின்றன.',
          preparation: ['காகிதம் அல்லாத உள்ளடக்கங்களை அகற்றவும்', 'உலர்வாக வைக்கவும்'],
          tip: 'குமிழி உறையுடன் கூடிய கவர்களில் குமிழி உறையைப் பிரித்து தனியாக அகற்ற வேண்டும்.',
        },
        'Paper Bag': {
          name: 'காகிதப் பை',
          reason: 'சுத்தமான காகிதப் பைகளை நீலத் தொட்டியில் மறுசுழற்சி செய்யலாம்.',
          preparation: ['கயிறு அல்லது ரிப்பன் கைப்பிடிகளை அகற்றவும்', 'பையை தட்டையாக்கவும்', 'சுத்தமாகவும் உலர்வாகவும் இருப்பதை உறுதிசெய்யவும்'],
          tip: 'மறுசுழற்சி செய்வதற்கு முன் காகிதப் பைகளை மீண்டும் பயன்படுத்தவும்.',
        },
        'Egg Carton (Paper)': {
          name: 'முட்டைத் தட்டு (காகிதம்)',
          reason: 'காகித முட்டைத் தட்டுகள் சுத்தமாகவும் உலர்வாகவும் இருந்தால் மறுசுழற்சி செய்யலாம். Styrofoam முட்டைத் தட்டுகளை மறுசுழற்சி செய்ய முடியாது.',
          preparation: ['இது காகிதம்/அட்டை வகையா என உறுதிசெய்யவும், styrofoam அல்ல', 'உணவுக் கழிவுகளை அகற்றவும்', 'உலர்வாக வைக்கவும்'],
          tip: 'Styrofoam முட்டைத் தட்டுகள் சாதாரணக் குப்பைத் தொட்டிக்குச் செல்ல வேண்டும் — காகித வகை மட்டுமே மறுசுழற்சிக்கு உகந்தது.',
        },
        'Milk Carton / Tetra Pak': {
          name: 'பால் அட்டை / Tetra Pak',
          reason: 'Tetra Pak அட்டைகளை சிங்கப்பூரில் மறுசுழற்சி செய்யலாம். மறுசுழற்சிக்கு முன் கழுவுங்கள்.',
          preparation: ['மீதமுள்ள திரவத்தைக் கழுவுங்கள்', 'அட்டையை தட்டையாக்கவும்', 'கழுவிய பின் மூடியை மூடி வைக்கவும்'],
          tip: 'Tetra Pak-க்கு தனி மறுசுழற்சி செயல்முறை உள்ளது — கலப்புப் பொருட்களைப் பற்றி கவலைப்பட வேண்டாம்.',
        },
      },
    },
    plastic: {
      label: 'பிளாஸ்டிக்',
      items: {
        'PET Bottle': {
          name: 'PET பாட்டில்',
          reason: 'PET (பாலியெத்திலீன் டெரெப்தலேட்) பாட்டில்கள் மிகவும் எளிதாக மறுசுழற்சி செய்யக்கூடிய பிளாஸ்டிக்குகளில் ஒன்று. #1 மறுசுழற்சிக் குறியீட்டைத் தேடுங்கள்.',
          preparation: ['பாட்டிலைக் காலி செய்து கழுவுங்கள்', 'மூடியை அகற்றுங்கள் (தனியாக மறுசுழற்சி செய்யவும்)', 'இடத்தை மிச்சப்படுத்த நசுக்குங்கள்'],
          tip: 'லேபிள்களை அகற்ற வேண்டியதில்லை — மறுசுழற்சி செயல்முறை அவற்றைக் கையாளும்.',
        },
        'Plastic Container': {
          name: 'பிளாஸ்டிக் கொள்கலன்',
          reason: 'பெரும்பாலான கடினமான பிளாஸ்டிக் கொள்கலன்கள் (பேக்கேஜ் பெட்டிகள், உணவுக் கொள்கலன்கள்) சுத்தமாகவும் உலர்வாகவும் இருந்தால் மறுசுழற்சி செய்யலாம்.',
          preparation: ['உணவுக் கழிவுகளைக் கழுவுங்கள்', 'உலர விடுங்கள்', 'மறுசுழற்சிக் குறியீட்டைச் சரிபாருங்கள் (#1-#7)'],
          tip: 'சுத்தம் செய்ய முடியாத அளவு கறை படிந்த கொள்கலன்கள் சாதாரணக் குப்பைத் தொட்டிக்குச் செல்ல வேண்டும்.',
        },
        'Plastic Bag (Clean)': {
          name: 'பிளாஸ்டிக் பை (சுத்தமான)',
          reason: 'சுத்தமான, உலர்ந்த பிளாஸ்டிக் பைகளை நீலத் தொட்டியில் மறுசுழற்சி செய்யலாம். அழுக்கு அல்லது ஈரமான பைகள் சாதாரணக் குப்பைத் தொட்டிக்குச் செல்ல வேண்டும்.',
          preparation: ['பை சுத்தமாகவும் உலர்வாகவும் இருப்பதை உறுதிசெய்யவும்', 'பறந்து போவதைத் தடுக்க பைகளை ஒன்றாகக் கட்டுங்கள்'],
          tip: 'மறுசுழற்சி செய்வதற்கு முன் பிளாஸ்டிக் பைகளை மீண்டும் பயன்படுத்தவும். அழுக்குப் பைகள் மற்ற மறுசுழற்சிப் பொருட்களை மாசுபடுத்தும்.',
        },
        'Shampoo Bottle': {
          name: 'ஷாம்பு பாட்டில்',
          reason: 'ஷாம்பு மற்றும் பாடி வாஷ் பாட்டில்கள் (பொதுவாக HDPE #2 அல்லது PP #5) நீலத் தொட்டியில் மறுசுழற்சி செய்யலாம்.',
          preparation: ['பாட்டிலை முழுமையாகக் காலி செய்யுங்கள்', 'தண்ணீரில் கழுவுங்கள்', 'மூடியை மூடி வைக்கவும்'],
          tip: 'லேபிள் அல்லது பம்ப்பை அகற்ற வேண்டியதில்லை — கழுவியிருப்பதை உறுதிசெய்யவும்.',
        },
        'Yoghurt Cup': {
          name: 'தயிர் கோப்பை',
          reason: 'பிளாஸ்டிக் தயிர் கோப்பைகளை கழுவிய பின் மறுசுழற்சி செய்யலாம். அலுமினியத் தாள் மூடியும் மறுசுழற்சி செய்யலாம்.',
          preparation: ['மீதமுள்ள தயிரைச் சுரண்டி எடுங்கள்', 'கோப்பையைக் கழுவுங்கள்', 'அலுமினியத் தாள் மூடியை உரித்து கழுவுங்கள் (தனியாக மறுசுழற்சி செய்யவும்)'],
          tip: 'ஒரு எளிய கழுவல் போதுமானது — பளிச்சென்று இருக்க வேண்டியதில்லை.',
        },
        'Styrofoam': {
          name: 'Styrofoam',
          reason: 'Styrofoam (விரிவாக்கப்பட்ட பாலிஸ்டைரீன்) சிங்கப்பூரின் நீலத் தொட்டி அமைப்பில் மறுசுழற்சி செய்ய இயலாது. இது சாதாரணக் குப்பைத் தொட்டிக்குச் செல்ல வேண்டும்.',
          preparation: ['சாதாரணக் குப்பைத் தொட்டியில் போடுங்கள்', 'நீலத் தொட்டியில் போட வேண்டாம் — மற்ற மறுசுழற்சிப் பொருட்களை மாசுபடுத்தும்'],
          tip: 'முடிந்தவரை Styrofoam கொள்கலன்களைத் தவிர்க்கவும். மீண்டும் பயன்படுத்தக்கூடிய கொள்கலன்களை எடுத்துச் செல்லுங்கள்.',
        },
        'Cling Wrap': {
          name: 'ஒட்டு உறை (கிளிங் ராப்)',
          reason: 'ஒட்டு உறை (பிளாஸ்டிக் படலம்) மாசு மற்றும் பிரிப்பதில் உள்ள சிரமங்கள் காரணமாக சிங்கப்பூரின் நீலத் தொட்டி அமைப்பில் மறுசுழற்சி செய்ய இயலாது.',
          preparation: ['சாதாரணக் குப்பைத் தொட்டியில் அகற்றவும்'],
          tip: 'சுற்றுச்சூழல் நட்பு மாற்றாக தேன்மெழுகு உறைகள் அல்லது சிலிகான் மூடிகளுக்கு மாறுவதைக் கருதுங்கள்.',
        },
      },
    },
    metal: {
      label: 'உலோகம்',
      items: {
        'Aluminium Can': {
          name: 'அலுமினியக் கேன்',
          reason: 'அலுமினியக் கேன்கள் மிகவும் எளிதாக மறுசுழற்சி செய்யக்கூடியவை, தரம் குறையாமல் எத்தனை முறையும் மறுசுழற்சி செய்யலாம்.',
          preparation: ['கேனைக் காலி செய்யுங்கள்', 'விரைவாகக் கழுவுங்கள்', 'இடத்தை மிச்சப்படுத்த நசுக்குங்கள் (விருப்பத்திற்கு)'],
          tip: 'அலுமினியம் மிகவும் மதிப்புள்ள மறுசுழற்சிப் பொருட்களில் ஒன்று — ஒரு கேனை மறுசுழற்சி செய்வது ஒரு TV-ஐ 3 மணி நேரம் இயக்க போதுமான ஆற்றலை மிச்சப்படுத்தும்.',
        },
        'Tin Can': {
          name: 'டின் கேன்',
          reason: 'டின் கேன்கள் (எஃகு/டின் பூச்சு உணவுக் கேன்கள்) நீலத் தொட்டியில் மறுசுழற்சி செய்யலாம்.',
          preparation: ['உணவுக் கழிவுகளைக் கழுவுங்கள்', 'எளிதாக இருந்தால் காகித லேபிள்களை அகற்றுங்கள் (விருப்பத்திற்கு)', 'பாதுகாப்பிற்காக மூடியை கேனுக்குள் தள்ளுங்கள்'],
          tip: 'லேபிள்களை விட்டு வைக்கலாம் — மறுசுழற்சி செயல்முறையில் அவை எரிந்துவிடும்.',
        },
        'Metal Lid': {
          name: 'உலோக மூடி',
          reason: 'ஜாடிகள் மற்றும் பாட்டில்களின் உலோக மூடிகளை நீலத் தொட்டியில் மறுசுழற்சி செய்யலாம்.',
          preparation: ['உணவுக் கழிவுகளைக் கழுவுங்கள்', 'நீலத் தொட்டியில் தனியாக வைக்கவும்'],
          tip: 'சிறிய உலோக மூடிகளை ஒரு டின் கேனுக்குள் சேகரிக்கலாம், அவை பிரிப்பு இயந்திரங்களில் விழுவதைத் தடுக்கும்.',
        },
        'Aerosol Can (Empty)': {
          name: 'ஏரோசோல் கேன் (காலி)',
          reason: 'காலி ஏரோசோல் கேன்களை நீலத் தொட்டியில் மறுசுழற்சி செய்யலாம். அவை முழுமையாக காலியாக இருக்க வேண்டும்.',
          preparation: ['கேன் முழுமையாக காலியாக இருப்பதை உறுதிசெய்யவும்', 'கேனைக் குத்தவோ நசுக்கவோ வேண்டாம்', 'முடிந்தால் பிளாஸ்டிக் மூடியை அகற்றவும்'],
          tip: 'ஓரளவு நிரம்பிய ஏரோசோல் கேன்கள் அபாயகரமான கழிவுகள் — அபாயகரமான கழிவு சேகரிப்புப் புள்ளிக்கு கொண்டு செல்லுங்கள்.',
        },
        'Aluminium Foil (Clean)': {
          name: 'அலுமினியத் தாள் (சுத்தமான)',
          reason: 'சுத்தமான அலுமினியத் தாளை மறுசுழற்சி செய்யலாம். உணவு எண்ணெய் படிந்த தாளை மறுசுழற்சி செய்ய இயலாது.',
          preparation: ['உணவுக் கழிவுகளைத் துடைக்கவும் அல்லது கழுவவும்', 'ஒரு பந்தாக உருட்டுங்கள் (பிரிப்பதற்கு எளிது)', 'போதுமான அளவு சுத்தமாக இருந்தால் மட்டும் மறுசுழற்சி செய்யுங்கள்'],
          tip: 'மிகவும் எண்ணெய் படிந்த தாள் (உதா. BBQ-யிலிருந்து) சாதாரணக் குப்பைத் தொட்டிக்குச் செல்ல வேண்டும்.',
        },
      },
    },
    glass: {
      label: 'கண்ணாடி',
      items: {
        'Glass Bottle': {
          name: 'கண்ணாடிப் பாட்டில்',
          reason: 'கண்ணாடிப் பாட்டில்களை சிங்கப்பூரின் நீலத் தொட்டியில் மறுசுழற்சி செய்யலாம். கண்ணாடியை தரம் குறையாமல் எத்தனை முறையும் மறுசுழற்சி செய்யலாம்.',
          preparation: ['பாட்டிலைக் காலி செய்து கழுவுங்கள்', 'மூடியை அகற்றுங்கள் (உலோக மூடிகளையும் மறுசுழற்சி செய்யலாம்)', 'லேபிள்களை அகற்ற வேண்டியதில்லை'],
          tip: 'உடையாமல் இருக்க கவனமாகக் கையாளுங்கள். உடைந்த கண்ணாடியை செய்தித்தாளில் சுற்றி தொட்டியில் வைக்கவும்.',
        },
        'Glass Jar': {
          name: 'கண்ணாடி ஜாடி',
          reason: 'கண்ணாடி ஜாடிகள் (ஜாம், சாஸ், ஊறுகாய் ஜாடிகள்) நீலத் தொட்டியில் மறுசுழற்சி செய்யலாம்.',
          preparation: ['உணவுக் கழிவுகளைக் கழுவுங்கள்', 'உலோக மூடியை அகற்றுங்கள் (தனியாக மறுசுழற்சி செய்யவும்)', 'லேபிள்களை அகற்ற வேண்டியதில்லை'],
          tip: 'ஒரு எளிய கழுவல் போதுமானது — பளிச்சென்று இருக்க வேண்டியதில்லை.',
        },
        'Wine Bottle': {
          name: 'ஒயின் பாட்டில்',
          reason: 'ஒயின் பாட்டில்கள் மறுசுழற்சி செய்யக்கூடிய கண்ணாடியால் ஆனவை, நீலத் தொட்டிக்குள் போடலாம்.',
          preparation: ['பாட்டிலைக் காலி செய்யுங்கள்', 'கார்க் அடைப்பை அகற்றுங்கள் (கார்க் நீலத் தொட்டியில் மறுசுழற்சி செய்ய இயலாது)', 'முடிந்தால் கழுவுங்கள்'],
          tip: 'இயற்கை கார்க் அடைப்புகளை உரமாக்கலாம். செயற்கை கார்க் சாதாரணக் குப்பைத் தொட்டிக்குச் செல்ல வேண்டும்.',
        },
        'Mirror': {
          name: 'கண்ணாடி (Mirror)',
          reason: 'கண்ணாடிகளை (Mirror) நீலத் தொட்டியில் மறுசுழற்சி செய்ய இயலாது. பிரதிபலிப்பு பூச்சு மற்றும் கண்ணாடி கலவை கொள்கலன் கண்ணாடியிலிருந்து வேறுபடுகிறது, மறுசுழற்சி செயல்முறையை மாசுபடுத்தும்.',
          preparation: ['காயம் ஏற்படாமல் இருக்க செய்தித்தாளில் கவனமாகச் சுற்றவும்', 'சாதாரணக் குப்பைத் தொட்டியில் போடவும்', 'பெரிய கண்ணாடிகளுக்கு பெரிய கழிவு சேகரிப்பை முன்பதிவு செய்யவும்'],
          tip: 'நல்ல நிலையில் உள்ள கண்ணாடிகளை செகண்ட் ஹேண்ட் கடைகளுக்கு நன்கொடையாக வழங்கலாம்.',
        },
        'Pyrex / Ceramic': {
          name: 'Pyrex / செராமிக்',
          reason: 'Pyrex (போரோசிலிகேட் கண்ணாடி) மற்றும் செராமிக் சாதாரண கண்ணாடியிலிருந்து வேறுபட்ட உருகுநிலையைக் கொண்டவை. அவை கண்ணாடி மறுசுழற்சியை மாசுபடுத்தும், சாதாரணக் குப்பைத் தொட்டிக்குச் செல்ல வேண்டும்.',
          preparation: ['உடைந்த துண்டுகளை செய்தித்தாளில் சுற்றவும்', 'உடைந்திருந்தால் "கூர்மையானது" என்று லேபிள் ஒட்டவும்', 'சாதாரணக் குப்பைத் தொட்டியில் போடவும்'],
          tip: 'உடையாத Pyrex அல்லது செராமிக் பொருட்களை தூக்கி எறிவதற்குப் பதிலாக செகண்ட் ஹேண்ட் கடைகளுக்கு நன்கொடையாக வழங்கலாம்.',
        },
      },
    },
    electronics: {
      label: 'மின்னணுவியல்',
      items: {
        'Laptop': {
          name: 'மடிக்கணினி',
          reason: 'மடிக்கணினிகள் சிங்கப்பூரில் கட்டுப்படுத்தப்பட்ட மின்னணுக் கழிவுகள் ஆகும். அவை மதிப்புமிக்க உலோகங்கள் மற்றும் ஆபத்தான பொருட்களைக் கொண்டுள்ளன, நியமிக்கப்பட்ட மின்னணுக் கழிவு சேகரிப்புப் புள்ளிகளில் சரியாக மறுசுழற்சி செய்ய வேண்டும்.',
          preparation: ['தனிப்பட்ட தரவை காப்புப் பிரதி எடுத்து அழிக்கவும்', 'வெளிப்புற பாகங்களை அகற்றவும்', 'பேட்டரியை உள்ளே விடுங்கள் (சேகரிப்புப் புள்ளி கையாளும்)'],
          tip: 'நல்ல நிலையில் செயல்படும் மடிக்கணினிகளை Engineering Good போன்ற தொண்டு நிறுவனங்களுக்கு நன்கொடையாக வழங்கலாம்.',
        },
        'Mobile Phone': {
          name: 'கைபேசி',
          reason: 'கைபேசிகள் கட்டுப்படுத்தப்பட்ட மின்னணுக் கழிவுகள் ஆகும். நியமிக்கப்பட்ட மின்னணுக் கழிவு சேகரிப்புப் புள்ளிகளில் அகற்ற வேண்டும், நீலத் தொட்டி அல்லது சாதாரணக் குப்பைத் தொட்டியில் போடக்கூடாது.',
          preparation: ['தொழிற்சாலை மீட்டமைப்பு செய்து தனிப்பட்ட தரவை அழிக்கவும்', 'SIM கார்டு மற்றும் நினைவகக் கார்டை அகற்றவும்', 'போன் கவரை அகற்றவும் (கவரை தனியாக மறுசுழற்சி செய்யவும்)'],
          tip: 'StarHub, Singtel மற்றும் M1 கடைகள் பழைய போன்களை மறுசுழற்சிக்கு ஏற்றுக்கொள்கின்றன. செயல்படும் போன்களை நன்கொடையாக வழங்கலாம்.',
        },
        'Tablet': {
          name: 'டேப்லெட்',
          reason: 'டேப்லெட்கள் லித்தியம் பேட்டரிகள் மற்றும் விலைமதிப்பான உலோகங்களைக் கொண்ட கட்டுப்படுத்தப்பட்ட மின்னணுக் கழிவுகள் ஆகும். மின்னணுக் கழிவு சேகரிப்புப் புள்ளிக்கு கொண்டு செல்லுங்கள்.',
          preparation: ['தொழிற்சாலை மீட்டமைப்பு செய்து தனிப்பட்ட தரவை அழிக்கவும்', 'பாதுகாப்பு கவர் மற்றும் திரை பாதுகாப்பியை அகற்றவும்'],
          tip: 'செயல்படும் டேப்லெட்களை Digital for Life திட்டங்கள் அல்லது தொண்டு நிறுவனங்களுக்கு நன்கொடையாக வழங்கலாம்.',
        },
        'TV / Monitor': {
          name: 'TV / மானிட்டர்',
          reason: 'TV மற்றும் மானிட்டர்கள் கட்டுப்படுத்தப்பட்ட மின்னணுக் கழிவுகள் ஆகும். சிங்கப்பூரின் விரிவாக்கப்பட்ட உற்பத்தியாளர் பொறுப்புத் திட்டத்தின் கீழ், டெலிவரி வழங்கும் சில்லறை விற்பனையாளர்கள் 1-க்கு-1 பழையது மாற்றும் சேவையை வழங்க வேண்டும்.',
          preparation: ['அனைத்து கேபிள்களையும் துண்டிக்கவும்', 'ஸ்மார்ட் TV எனில் தனிப்பட்ட தரவை அழிக்கவும்'],
          tip: 'புதிய TV வாங்கும்போது, சில்லறை விற்பனையாளரிடம் 1-க்கு-1 பழையது மாற்றும் சேவையைக் கேளுங்கள் — இது இலவசம்.',
        },
        'Printer': {
          name: 'அச்சுப்பொறி',
          reason: 'அச்சுப்பொறிகள் ICT உபகரணங்களாக வகைப்படுத்தப்பட்ட கட்டுப்படுத்தப்பட்ட மின்னணுக் கழிவுகள் ஆகும். மின்னணுக் கழிவு சேகரிப்புப் புள்ளிகளுக்கு கொண்டு செல்ல வேண்டும்.',
          preparation: ['மை/டோனர் கார்ட்ரிட்ஜ்களை அகற்றுங்கள் (தனியாக மறுசுழற்சி செய்யவும்)', 'தட்டுகளிலிருந்து காகிதத்தை அகற்றுங்கள்', 'கேபிள்களைத் துண்டிக்கவும்'],
          tip: 'சில அச்சுப்பொறி பிராண்டுகள் (HP, Canon) கார்ட்ரிட்ஜ் மறுசுழற்சித் திட்டங்களை வைத்துள்ளன — அவர்களின் இணையதளத்தைப் பாருங்கள்.',
        },
        'Cables & Chargers': {
          name: 'கேபிள்கள் & சார்ஜர்கள்',
          reason: 'கேபிள்கள் மற்றும் சார்ஜர்களில் செம்பு மற்றும் பிற உலோகங்கள் உள்ளன. மின்னணுக் கழிவு சேகரிப்புப் புள்ளிகளில் மறுசுழற்சி செய்ய வேண்டும்.',
          preparation: ['கேபிள்களை நேர்த்தியாகக் கட்டுங்கள்', 'முடிந்தால் வெவ்வேறு வகைகளைப் பிரிக்கவும்'],
          tip: 'வணிக வளாகங்கள் மற்றும் சமூக மையங்களில் உள்ள மின்னணுக் கழிவு சேகரிப்புத் தொட்டிகள் கேபிள்கள் போன்ற சிறிய பொருட்களை ஏற்றுக்கொள்கின்றன.',
        },
        'Power Bank': {
          name: 'பவர் பேங்க்',
          reason: 'பவர் பேங்க்குகளில் லித்தியம்-அயன் பேட்டரிகள் உள்ளன, முறையற்ற முறையில் அகற்றப்பட்டால் ஆபத்தானவை. பேட்டரி/மின்னணுக் கழிவு சேகரிப்புப் புள்ளிகளுக்கு கொண்டு செல்ல வேண்டும்.',
          preparation: ['அகற்றுவதற்கு முன் முடிந்தால் மின்னிறக்கம் செய்யுங்கள்', 'குத்தவோ நசுக்கவோ வேண்டாம்', 'வெளிப்பட்ட தொடர்புகளில் டேப் ஒட்டுங்கள்'],
          tip: 'வீங்கிய அல்லது சேதமடைந்த பவர் பேங்க்குகள் தீ ஆபத்து — கவனமாகக் கையாளுங்கள், உடனடியாக மின்னணுக் கழிவு சேகரிப்புப் புள்ளிக்கு கொண்டு செல்லுங்கள்.',
        },
      },
    },
    batteries: {
      label: 'பேட்டரிகள்',
      items: {
        'AA / AAA Battery': {
          name: 'AA / AAA பேட்டரி',
          reason: 'அனைத்து பேட்டரிகளும் சிங்கப்பூரில் கட்டுப்படுத்தப்பட்ட கழிவுகள் ஆகும். அவை கன உலோகங்கள் மற்றும் இரசாயனங்களைக் கொண்டுள்ளன, நிலப்புதைப்பிற்கு அனுப்பினால் தீங்கு விளைவிக்கும்.',
          preparation: ['ஷார்ட் சர்க்யூட்டைத் தடுக்க முனையங்களில் மின்கடத்தா டேப் ஒட்டுங்கள்', 'உலோகம் அல்லாத கொள்கலனில் சேமிக்கவும்', 'சாதாரணக் குப்பைத் தொட்டி அல்லது நீலத் தொட்டியில் போட வேண்டாம்'],
          tip: 'பல சூப்பர்மார்க்கெட்கள், சமூக மையங்கள் மற்றும் மின்னணு பொருட் கடைகளில் பேட்டரி மறுசுழற்சித் தொட்டிகள் உள்ளன.',
        },
        'Button Cell Battery': {
          name: 'பொத்தான் செல் பேட்டரி',
          reason: 'பொத்தான் செல் பேட்டரிகள் (கடிகாரங்கள், செவிப்புலன் உதவிகள், பொம்மைகளில் காணப்படும்) பாதரசம் அல்லது வெள்ளி ஆக்சைடைக் கொண்டுள்ளன. நியமிக்கப்பட்ட சேகரிப்புப் புள்ளிகளில் மறுசுழற்சி செய்ய வேண்டும்.',
          preparation: ['பேட்டரியின் இரு பக்கங்களிலும் டேப் ஒட்டுங்கள்', 'குழந்தைகளிடமிருந்து விலக்கி வைக்கவும் (விழுங்கும் ஆபத்து)', 'அகற்றும் வரை பாதுகாப்பாகச் சேமிக்கவும்'],
          tip: 'பொத்தான் செல்கள் சிறியவை ஆனால் மிகவும் நச்சுத்தன்மை கொண்டவை — சாதாரணக் குப்பைத் தொட்டியில் ஒருபோதும் போட வேண்டாம்.',
        },
        'Lithium-Ion Battery': {
          name: 'லித்தியம்-அயன் பேட்டரி',
          reason: 'லித்தியம்-அயன் பேட்டரிகள் (போன்கள், மடிக்கணினிகள், மின்-ஸ்கூட்டர்களிலிருந்து) முறையற்ற முறையில் அகற்றப்பட்டால் தீ ஆபத்து. மின்னணுக் கழிவு சேகரிப்புப் புள்ளிகளில் சிறப்புக் கையாளுதல் தேவை.',
          preparation: ['முனையங்களில் டேப் ஒட்டுங்கள்', 'குத்தவோ, நசுக்கவோ அல்லது வெப்பத்திற்கு ஆளாக்கவோ வேண்டாம்', 'வீங்கியிருந்தால் தீ தடுப்புப் பையில் வைக்கவும்'],
          tip: 'வீங்கிய லித்தியம் பேட்டரிகள் தீப்பிடிக்கலாம் — கவனமாகக் கையாளுங்கள், உடனடியாக சேகரிப்புப் புள்ளிக்கு கொண்டு செல்லுங்கள்.',
        },
        'Car Battery': {
          name: 'கார் பேட்டரி',
          reason: 'கார் பேட்டரிகள் (ஈய-அமில) சல்பூரிக் அமிலம் மற்றும் ஈயத்தைக் கொண்டுள்ளன. அவை ஆபத்தானவை, நியமிக்கப்பட்ட சேகரிப்புப் புள்ளிகளில் சரியாக அகற்ற வேண்டும்.',
          preparation: ['அமில கசிவைத் தடுக்க நிமிர்ந்த நிலையில் வைக்கவும்', 'திறக்கவோ வடிகட்டவோ வேண்டாம்', 'பாதுகாப்பான கொள்கலனில் கவனமாக எடுத்துச் செல்லுங்கள்'],
          tip: 'பெரும்பாலான கார் பட்டறைகள் மற்றும் பேட்டரி சில்லறை விற்பனையாளர்கள் பழைய கார் பேட்டரிகளை மறுசுழற்சிக்கு ஏற்றுக்கொள்கின்றனர்.',
        },
      },
    },
    textile: {
      label: 'துணி & ஆடைகள்',
      items: {
        'T-Shirt': {
          name: 'டி-ஷர்ட்',
          reason: 'அணியக்கூடிய நிலையில் உள்ள ஆடைகளை நன்கொடையாக வழங்கலாம் அல்லது துணி மறுசுழற்சித் தொட்டிகளில் போடலாம். பழுதடைந்த துணிகளையும் தொழிற்சாலை துடைப்பான்கள் அல்லது காப்பு பொருளாக மறுசுழற்சி செய்யலாம்.',
          preparation: ['நன்கொடையாக வழங்குவதற்கு முன் துவைத்து உலர்த்துங்கள்', 'நேர்த்தியாக மடித்து பையில் வைக்கவும்', 'அணியக்கூடிய மற்றும் சேதமடைந்த பொருட்களைப் பிரிக்கவும்'],
          tip: 'துணி மறுசுழற்சித் தொட்டிகள் (உதா. SG Recycle, Cloop) HDB வாய்டு டெக்குகள் மற்றும் வணிக வளாகங்களில் உள்ளன.',
        },
        'Jeans': {
          name: 'ஜீன்ஸ்',
          reason: 'டெனிம் ஜீன்ஸ் மிகவும் நீடித்து நிலைக்கும், நல்ல நிலையில் இருந்தால் நன்கொடையாக வழங்கலாம், அல்லது துணி இழையாக மறுசுழற்சி செய்யலாம்.',
          preparation: ['நன்கொடையாக வழங்குவதற்கு முன் துவைக்கவும்', 'அனைத்து பாக்கெட்களையும் காலி செய்யுங்கள்', 'சேதமடைந்திருந்தால் துணி அல்லாத பாகங்களை அகற்றுங்கள்'],
          tip: 'சில பிராண்டுகள் (H&M, Uniqlo) கடைகளில் ஆடை சேகரிப்புத் திட்டங்களை வைத்துள்ளன.',
        },
        'Shoes': {
          name: 'காலணிகள்',
          reason: 'அணியக்கூடிய நிலையில் உள்ள காலணிகளை துணி சேகரிப்புத் தொட்டிகள் அல்லது தொண்டு நிறுவனங்கள் மூலம் நன்கொடையாக வழங்கலாம்.',
          preparation: ['காலணிகளை சுத்தம் செய்யுங்கள்', 'ஜோடிகளை ஒன்றாகக் கட்டுங்கள் அல்லது ரப்பர் பேண்ட் பயன்படுத்துங்கள்', 'ஒரு பையில் வைக்கவும்'],
          tip: 'Soles Up! மற்றும் The Salvation Army சிங்கப்பூரில் பயன்படுத்தப்பட்ட காலணிகளை ஏற்றுக்கொள்கின்றன.',
        },
        'Handbag': {
          name: 'கைப்பை',
          reason: 'பயன்படுத்தக்கூடிய நிலையில் உள்ள கைப்பைகளை நன்கொடையாக வழங்க வேண்டும். துணி சேகரிப்புத் தொட்டிகளும் பைகளை ஏற்றுக்கொள்கின்றன.',
          preparation: ['அனைத்து உள்ளடக்கங்களையும் காலி செய்யுங்கள்', 'துடைத்து சுத்தம் செய்யுங்கள்', 'துணி சேகரிப்புத் தொட்டியில் போடுங்கள் அல்லது நேரடியாக நன்கொடையாக வழங்குங்கள்'],
          tip: 'தரமான பைகளை மீண்டும் பயன்படுத்துவதற்காக Carousell போன்ற தளங்களில் விற்கலாம்.',
        },
        'Curtains': {
          name: 'திரைச்சீலைகள்',
          reason: 'திரைச்சீலைகள் துணி மறுசுழற்சித் தொட்டிகள் மூலம் மறுசுழற்சி செய்யலாம் அல்லது நன்கொடையாக வழங்கலாம்.',
          preparation: ['கொக்கிகள் மற்றும் வளையங்களை அகற்றவும்', 'முடிந்தால் துவைக்கவும்', 'மடித்து பையில் வைக்கவும்'],
          tip: 'பெரிய துணிப் பொருட்களை The Salvation Army போன்ற தொண்டு நிறுவனங்களுக்கு நன்கொடையாக வழங்கலாம், இலவச சேகரிப்பு சேவை உள்ளது.',
        },
        'Bedsheets': {
          name: 'படுக்கை விரிப்புகள்',
          reason: 'படுக்கை விரிப்புகள் மற்றும் லினன் நல்ல நிலையில் இருந்தால் நன்கொடையாக வழங்கலாம் அல்லது துணி சேகரிப்புப் புள்ளிகள் மூலம் மறுசுழற்சி செய்யலாம்.',
          preparation: ['நன்கு துவைத்து உலர்த்துங்கள்', 'நேர்த்தியாக மடிக்கவும்', 'துணி சேகரிப்புத் தொட்டிக்கு பையில் வைக்கவும்'],
          tip: 'பழைய படுக்கை விரிப்புகளை மறுசுழற்சி செய்வதற்கு முன் வீட்டில் சுத்தம் செய்யும் துணியாக மீண்டும் பயன்படுத்தலாம்.',
        },
      },
    },
    lighting: {
      label: 'விளக்குகள்',
      items: {
        'Fluorescent Tube': {
          name: 'ஃபுளோரசென்ட் குழாய்',
          reason: 'ஃபுளோரசென்ட் குழாய்களில் பாதரசம் உள்ளது, சாதாரணக் குப்பைத் தொட்டி அல்லது நீலத் தொட்டிகளில் போடக்கூடாது. நியமிக்கப்பட்ட விளக்குக் கழிவு சேகரிப்புப் புள்ளிகளில் அகற்ற வேண்டும்.',
          preparation: ['கவனமாகக் கையாளுங்கள் — உடைக்க வேண்டாம்', 'முடிந்தால் அசல் பேக்கேஜிங்கில் வைக்கவும்', 'சேகரிப்புப் புள்ளிக்கு கவனமாக எடுத்துச் செல்லுங்கள்'],
          tip: 'பல வன்பொருள் கடைகள் மற்றும் சமூக மறுசுழற்சித் திட்டங்கள் ஃபுளோரசென்ட் குழாய்களை ஏற்றுக்கொள்கின்றன.',
        },
        'CFL Bulb': {
          name: 'CFL பல்பு',
          reason: 'CFL (சுருக்க ஃபுளோரசென்ட் விளக்கு) பல்புகளில் சிறிதளவு பாதரசம் உள்ளது. விளக்குக் கழிவு சேகரிப்புப் புள்ளிகளில் மறுசுழற்சி செய்ய வேண்டும்.',
          preparation: ['உடையாமல் இருக்க மெதுவாகக் கையாளுங்கள்', 'போக்குவரத்திற்கு மூடிய பையில் வைக்கவும்', 'உடைந்தால், பகுதியை காற்றோட்டமாக்கி கவனமாக துடைக்கவும்'],
          tip: 'LED பல்புகளுக்கு மாறுவதைக் கருதுங்கள் — அவை நீண்ட காலம் நீடிக்கும், குறைவான ஆற்றல் பயன்படுத்தும், பாதரசம் இல்லை.',
        },
        'LED Bulb': {
          name: 'LED பல்பு',
          reason: 'LED பல்புகளில் மின்னணு பாகங்கள் உள்ளன, பாதரசம் இல்லாவிட்டாலும் மின்னணுக் கழிவு அல்லது விளக்கு சேகரிப்புப் புள்ளிகளில் மறுசுழற்சி செய்ய வேண்டும்.',
          preparation: ['கையாளுவதற்கு முன் பல்பை ஆற விடுங்கள்', 'கிடைத்தால் அசல் பேக்கேஜிங்கில் வைக்கவும்'],
          tip: 'LED பல்புகள் 15,000-50,000 மணி நேரம் நீடிக்கும் — வெண்ணொளி அல்லது CFL மாற்றுகளை விட மிகவும் நீண்டது.',
        },
        'Incandescent Bulb': {
          name: 'வெண்ணொளி பல்பு',
          reason: 'வெண்ணொளி பல்புகள் ஆபத்தானவை அல்ல (பாதரசம் இல்லை) ஆனால் மறுசுழற்சி செய்ய இயலாது. சாதாரணக் குப்பைத் தொட்டிக்குச் செல்ல வேண்டும்.',
          preparation: ['உடையாமல் இருக்க செய்தித்தாள் அல்லது காகிதத்தில் சுற்றவும்', 'சாதாரணக் குப்பைத் தொட்டியில் போடவும்'],
          tip: 'வெண்ணொளி பல்புகள் உலகளவில் படிப்படியாக நிறுத்தப்படுகின்றன. ஆற்றல் சேமிப்பிற்கு LED-க்கு மாறுங்கள்.',
        },
      },
    },
    hazardous: {
      label: 'ஆபத்தான கழிவுகள்',
      items: {
        'Paint': {
          name: 'வண்ணப்பூச்சு',
          reason: 'வண்ணப்பூச்சில் நச்சு இரசாயனங்கள் மற்றும் கரைப்பான்கள் உள்ளன. நியமிக்கப்பட்ட ஆபத்தான கழிவு சேகரிப்புப் புள்ளிகளில் அகற்ற வேண்டும். வடிகால்களில் அல்லது சாதாரணக் குப்பைத் தொட்டியில் ஒருபோதும் ஊற்ற வேண்டாம்.',
          preparation: ['அசல் கொள்கலனில் மூடி மூடி வைக்கவும்', 'வெவ்வேறு வகை வண்ணப்பூச்சுகளை கலக்க வேண்டாம்', 'கொட்டாமல் இருக்க நிமிர்ந்த நிலையில் எடுத்துச் செல்லுங்கள்'],
          tip: 'முழுமையாக உலர்ந்த வண்ணப்பூச்சு கேன்கள் (திரவம் இல்லாமல்) சாதாரணக் குப்பைத் தொட்டிக்குச் செல்லலாம். சிறிய அளவு வண்ணப்பூச்சை இயற்கையாக உலர விடுங்கள்.',
        },
        'Pesticide': {
          name: 'பூச்சிக்கொல்லி',
          reason: 'பூச்சிக்கொல்லிகள் நச்சு இரசாயனங்கள் ஆகும், ஆபத்தான கழிவு சேகரிப்புப் புள்ளிகளில் அகற்ற வேண்டும். முறையற்ற முறையில் அகற்றினால் மண் மற்றும் நீரை மாசுபடுத்தும்.',
          preparation: ['அசல் லேபிள் உள்ள கொள்கலனில் வைக்கவும்', 'கசிவைத் தடுக்க இறுக்கமாக மூடவும்', 'உணவுக் கொள்கலன்களுக்கு மாற்ற வேண்டாம்'],
          tip: 'NEA அவ்வப்போது ஆபத்தான கழிவு சேகரிப்பு முகாம்களை நடத்துகிறது — அட்டவணைக்கு nea.gov.sg-ஐப் பாருங்கள்.',
        },
        'Motor Oil': {
          name: 'மோட்டார் எண்ணெய்',
          reason: 'பயன்படுத்திய மோட்டார் எண்ணெய் ஒரு ஆபத்தான பொருள். ஒரு லிட்டர் ஒரு மில்லியன் லிட்டர் தண்ணீரை மாசுபடுத்தும். ஆபத்தான கழிவு சேகரிப்புக்கு கொண்டு செல்ல வேண்டும்.',
          preparation: ['மூடிய, கசிவற்ற கொள்கலனில் சேமிக்கவும்', 'மற்ற திரவங்களுடன் கலக்க வேண்டாம்', 'நிமிர்ந்த நிலையில் பாதுகாப்பாக எடுத்துச் செல்லுங்கள்'],
          tip: 'பெரும்பாலான கார் பட்டறைகள் சரியான அகற்றல் மற்றும் மறுசுழற்சிக்காக பயன்படுத்திய மோட்டார் எண்ணெயை ஏற்றுக்கொள்கின்றன.',
        },
        'Cleaning Chemical': {
          name: 'சுத்தப்படுத்தும் இரசாயனம்',
          reason: 'வீட்டு சுத்தப்படுத்தும் இரசாயனங்கள் (ப்ளீச், வடிகால் சுத்திகரிப்பான், அடுப்பு சுத்திகரிப்பான்) ஆபத்தான கழிவுகள் ஆகும். நியமிக்கப்பட்ட சேகரிப்புப் புள்ளிகளுக்கு கொண்டு செல்ல வேண்டும்.',
          preparation: ['அசல் கொள்கலனில் வைக்கவும்', 'மூடி இறுக்கமாக மூடப்பட்டிருப்பதை உறுதிசெய்யவும்', 'வெவ்வேறு இரசாயனங்களை கலக்க வேண்டாம் — இது நச்சு வாயுக்களை உருவாக்கலாம்'],
          tip: 'ஆபத்தான கழிவுகளைக் குறைக்க சுற்றுச்சூழல் நட்பு சுத்தப்படுத்தும் பொருட்களுக்கு (வினிகர், பேக்கிங் சோடா) மாறுங்கள்.',
        },
        'Expired Medicine': {
          name: 'காலாவதியான மருந்து',
          reason: 'காலாவதியான அல்லது பயன்படுத்தாத மருந்துகளை கழிவுநீரில் கொட்டவோ சாதாரணக் குப்பைத் தொட்டியில் போடவோ கூடாது. அவை நீர் வழங்கல் மற்றும் மண்ணை மாசுபடுத்தலாம்.',
          preparation: ['அசல் பேக்கேஜிங்கில் வைக்கவும்', 'லேபிள்களிலிருந்து தனிப்பட்ட தகவல்களை அகற்றவும்', 'சேகரிப்புப் புள்ளி அல்லது மருந்தகத்திற்கு கொண்டு செல்லுங்கள்'],
          tip: 'சிங்கப்பூரில் பல Watsons மற்றும் Guardian மருந்தகங்கள் பயன்படுத்தாத மருந்துகளை பாதுகாப்பான அகற்றலுக்கு ஏற்றுக்கொள்கின்றன.',
        },
      },
    },
    furniture: {
      label: 'தளபாடங்கள் & பெரிய பொருட்கள்',
      items: {
        'Sofa': {
          name: 'சோபா',
          reason: 'சோபாக்கள் சாதாரண தொட்டிகளில் பொருந்தாத பெரிய கழிவுப் பொருட்கள் ஆகும். உங்கள் டவுன் கவுன்சில் அல்லது HDB-யிடம் பெரிய கழிவு சேகரிப்பை முன்பதிவு செய்யுங்கள்.',
          preparation: ['முடிந்தால் மெத்தை உறைகளை துணி மறுசுழற்சிக்கு அகற்றவும்', 'உங்கள் எஸ்டேட்டின் நியமிக்கப்பட்ட பெரிய கழிவுப் பகுதியில் வைக்கவும்'],
          tip: 'சோபா நல்ல நிலையில் இருந்தால், Carousell Free, Pass It On அல்லது The Salvation Army மூலம் நன்கொடையாக வழங்கலாம்.',
        },
        'Mattress': {
          name: 'மெத்தை',
          reason: 'மெத்தைகள் பெரிய கழிவுகள் ஆகும். உங்கள் டவுன் கவுன்சிலிடம் சேகரிப்பை முன்பதிவு செய்யவும் அல்லது நியமிக்கப்பட்ட பெரிய கழிவுப் பகுதியில் அகற்றவும்.',
          preparation: ['படுக்கை விரிப்புகள் மற்றும் மெத்தை பாதுகாப்பியை அகற்றவும்', 'முடிந்தால் மெத்தையை மடிக்கவும் அல்லது சுருட்டவும், எளிதாகக் கையாளலாம்'],
          tip: 'சில மெத்தை சில்லறை விற்பனையாளர்கள் புதிய மெத்தை விநியோகிக்கும்போது பழைய மெத்தையை அகற்றும் சேவையை வழங்குகின்றனர்.',
        },
        'Table': {
          name: 'மேசை',
          reason: 'மேசைகள் பெரிய கழிவுப் பொருட்கள் ஆகும். திட்டமிடப்பட்ட பெரிய கழிவு சேகரிப்புக்கு உங்கள் டவுன் கவுன்சிலைத் தொடர்பு கொள்ளுங்கள்.',
          preparation: ['எளிதாகக் கையாள, பிரிக்கக்கூடிய கால்களை அகற்றவும்', 'மேசையிலிருந்து அனைத்து பொருட்களையும் அகற்றுங்கள்'],
          tip: 'நல்ல நிலையில் உள்ள மேசைகளை Carousell Free-யில் பட்டியலிடலாம் அல்லது The Salvation Army-க்கு நன்கொடையாக வழங்கலாம்.',
        },
        'Chair': {
          name: 'நாற்காலி',
          reason: 'நாற்காலிகள் பெரிய கழிவுகளாக வகைப்படுத்தப்படுகின்றன. உங்கள் எஸ்டேட்டின் பெரிய கழிவு சேகரிப்பு அட்டவணை மூலம் அகற்றவும்.',
          preparation: ['மடிக்கக்கூடிய நாற்காலி எனில் மடிக்கவும்', 'பொருந்தினால் துணி மறுசுழற்சிக்கு மெத்தைகளை அகற்றவும்'],
          tip: 'காஸ் சிலிண்டர் கொண்ட அலுவலக நாற்காலிகளை கவனமாகக் கையாள வேண்டும் — சிலிண்டர் அழுத்தத்தில் உள்ளது.',
        },
        'Bookshelf': {
          name: 'புத்தக அலமாரி',
          reason: 'புத்தக அலமாரிகள் பெரிய கழிவுப் பொருட்கள் ஆகும். உங்கள் டவுன் கவுன்சில் அல்லது HDB மூலம் சேகரிப்பை முன்பதிவு செய்யுங்கள்.',
          preparation: ['அலமாரியிலிருந்து அனைத்து பொருட்களையும் அகற்றுங்கள்', 'முடிந்தால் எளிதாக எடுத்துச் செல்ல கழற்றுங்கள்', 'திருகுகள் மற்றும் வன்பொருள்களை அகற்றுங்கள்'],
          tip: 'நல்ல நிலையில் உள்ள புத்தக அலமாரிகளை நன்கொடையாக வழங்குங்கள் — பல சமூகக் குழுக்கள் மற்றும் தொண்டு நிறுவனங்கள் தளபாட நன்கொடைகளை வரவேற்கின்றன.',
        },
      },
    },
  },
};
