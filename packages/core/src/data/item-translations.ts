import type { Locale } from '../i18n/types';
import { t } from '../i18n';

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
        'PET drink bottle': {
          name: 'PET 饮料瓶',
          reason: t('zh', 'bcrs.classifyReason'),
          preparation: [t('zh', 'bcrs.step1'), t('zh', 'bcrs.step2'), t('zh', 'bcrs.step3'), t('zh', 'bcrs.step4')],
          tip: t('zh', 'bcrs.refundAmount'),
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
        'Aluminium drink can': {
          name: '铝制饮料罐',
          reason: t('zh', 'bcrs.classifyReason'),
          preparation: [t('zh', 'bcrs.step1'), t('zh', 'bcrs.step2'), t('zh', 'bcrs.step3'), t('zh', 'bcrs.step4')],
          tip: t('zh', 'bcrs.refundAmount'),
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
          tip: '如果仍有内容物喷出，请勿投入蓝色回收箱。保持罐体完整，并遵循标签说明，或咨询供应商或 NEA。',
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
          reason: 'NEA 将充电宝归类为 ICT 设备。请送至接受 ICT 设备的电子废弃物收集点，不要投入仅收电池的回收箱。',
          preparation: ['不要拆解、刺穿或压扁', '用胶带覆盖裸露触点', '送至接受 ICT 设备的电子废弃物收集点'],
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
          reason: '铅酸汽车电池含有硫酸和铅，不得投入家用电池回收箱。',
          preparation: ['保持直立放置以防酸液泄漏', '不要打开或排空', '用安全容器小心运输'],
          tip: '请先确认汽车维修厂或电池零售商是否接收；如果找不到渠道，请联系 NEA。',
        },
      },
    },
    textile: {
      label: '纺织品与衣物',
      items: {
        'T-Shirt': {
          name: 'T恤',
          reason: '干净且状况良好的衣物可投入 Cloop 纺织品收集点。',
          preparation: ['彻底洗净并晾干', '整齐折好并装袋'],
          tip: '如果衣物仍适合穿着，也可以直接捐赠。',
        },
        'Jeans': {
          name: '牛仔裤',
          reason: '干净且状况良好的牛仔裤可投入 Cloop 纺织品收集点。',
          preparation: ['彻底洗净并晾干', '掏空所有口袋', '折好并装袋'],
          tip: '如果牛仔裤仍适合穿着，也可以直接捐赠。',
        },
        'Shoes': {
          name: '鞋子',
          reason: '干净且状况良好的鞋子可投入 Cloop 纺织品收集点。',
          preparation: ['将鞋子清洁并晾干', '把一双鞋固定在一起', '装袋'],
          tip: '如果鞋子仍适合穿着，也可以直接捐赠。',
        },
        'Handbag': {
          name: '手提包',
          reason: '干净且状况良好的包袋可投入 Cloop 纺织品收集点。',
          preparation: ['清空所有物品', '擦拭干净并保持干燥', '装袋后投入纺织品收集点'],
          tip: '如果包袋仍可使用，也可以直接捐赠或转售。',
        },
        'Curtains': {
          name: '窗帘',
          reason: '部分纺织品收集点接受干净、干燥且状况良好的窗帘；投放前请核对该地点的接收范围。',
          preparation: ['取下挂钩和圆环', '按需洗净并晾干', '折好装袋'],
          tip: '不同地点接收范围可能不同，请先查看收集点说明。',
        },
        'Bedsheets': {
          name: '床单',
          reason: '干净且状况良好的床单和家用织物可投入 Cloop 纺织品收集点。',
          preparation: ['彻底清洗并烘干', '整齐折好', '装入袋中投入纺织品回收箱'],
          tip: '如果床品仍适合使用，也可以直接捐赠。',
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
          reason: 'NEA 的电子废弃物回收渠道接收白炽灯泡等灯泡和灯具。',
          preparation: ['小心处理，不要打碎', '送至接收灯泡和灯具的收集点'],
          tip: '出发前请确认收集点类型；部分回收箱不接收长灯管。',
        },
      },
    },
    hazardous: {
      label: '有害废弃物',
      items: {
        'Paint': {
          name: '油漆',
          reason: '仍含液态油漆的容器不可投入蓝色回收箱，需要按具体产品确认处理方式。切勿把油漆倒入下水道。',
          preparation: ['保留在有标签的原装容器内并密封盖子', '不要混合不同油漆', '遵循标签说明，或向供应商或 NEA 查询处理方式'],
          tip: '完全空置、没有液态油漆的全金属油漆罐可投入蓝色回收箱。',
        },
        'Pesticide': {
          name: '杀虫剂',
          reason: '未使用完的杀虫剂需要按具体产品处理，不得倒在地面或排入下水道。',
          preparation: ['保留在有标签的原装容器内', '拧紧密封，不要转装到其他容器', '遵循标签说明，或向供应商或 NEA 查询处理方式'],
          tip: '新加坡没有面向家庭的通用有害废物回收箱；出发前请先确认该产品的处理渠道。',
        },
        'Motor Oil': {
          name: '机油',
          reason: '废机油需要受控处理，不得倒入下水道、土壤或蓝色回收箱。',
          preparation: ['存放在密封防漏容器中', '不要与其他液体混合', '竖直并固定好运输'],
          tip: '先询问为车辆保养的维修厂是否接收；否则联系 NEA 获取处理指导。',
        },
        'Cleaning Chemical': {
          name: '清洁化学品',
          reason: '处理方式取决于具体产品和剩余内容物。腐蚀性通渠剂等明确危险的清洁化学品需要按产品处理。',
          preparation: ['保留在有标签的原装容器内并拧紧盖子', '不要混合或转装化学品', '遵循标签说明，或向供应商或 NEA 查询处理方式'],
          tip: '不要假设回收箱或通用公共投放点会接收家用化学品。',
        },
        'Expired Medicine': {
          name: '过期药品',
          reason: 'NEA 将家庭剩余药品列为普通垃圾。切勿将药品冲入马桶或倒入下水道。',
          preparation: ['妥善密封，避免药片或液体泄漏', '移除或遮盖包装上的个人信息', '投入普通垃圾'],
          tip: '对于受管制药品或有特殊处置说明的药品，请遵循配药标签，或咨询开药诊所或药剂师。',
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
        'PET drink bottle': {
          name: 'Botol minuman PET',
          reason: t('ms', 'bcrs.classifyReason'),
          preparation: [t('ms', 'bcrs.step1'), t('ms', 'bcrs.step2'), t('ms', 'bcrs.step3'), t('ms', 'bcrs.step4')],
          tip: t('ms', 'bcrs.refundAmount'),
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
        'Aluminium drink can': {
          name: 'Tin minuman aluminium',
          reason: t('ms', 'bcrs.classifyReason'),
          preparation: [t('ms', 'bcrs.step1'), t('ms', 'bcrs.step2'), t('ms', 'bcrs.step3'), t('ms', 'bcrs.step4')],
          tip: t('ms', 'bcrs.refundAmount'),
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
          tip: 'Jika produk masih keluar, jangan masukkan tin ke dalam tong biru. Pastikan tin kekal utuh dan ikut label atau tanya pembekal atau NEA.',
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
          reason: 'NEA mengklasifikasikan pengecas mudah alih sebagai peralatan ICT. Bawa ke pusat e-sisa yang menerima peralatan ICT, bukan tong yang hanya menerima bateri.',
          preparation: ['Jangan buka, tebuk atau remukkan', 'Tampal pita pada sentuhan yang terdedah', 'Bawa ke pusat e-sisa yang menerima peralatan ICT'],
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
          reason: 'Bateri kereta asid plumbum mengandungi asid sulfurik dan plumbum. Ia tidak boleh dimasukkan ke dalam tong bateri isi rumah.',
          preparation: ['Pastikan tegak untuk mengelakkan kebocoran asid', 'JANGAN buka atau toskan', 'Angkut dengan berhati-hati dalam bekas yang selamat'],
          tip: 'Sahkan dahulu sama ada bengkel kereta atau peruncit bateri menerimanya; hubungi NEA jika tiada laluan tersedia.',
        },
      },
    },
    textile: {
      label: 'Tekstil & Pakaian',
      items: {
        'T-Shirt': {
          name: 'Baju-T',
          reason: 'Pakaian yang bersih dan dalam keadaan baik diterima di pusat pengumpulan tekstil Cloop.',
          preparation: ['Basuh dan keringkan sepenuhnya', 'Lipat kemas dan masukkan ke dalam beg'],
          tip: 'Derma terus juga merupakan pilihan yang baik jika pakaian masih sesuai dipakai.',
        },
        'Jeans': {
          name: 'Seluar Jeans',
          reason: 'Seluar jeans yang bersih dan dalam keadaan baik diterima di pusat pengumpulan tekstil Cloop.',
          preparation: ['Basuh dan keringkan sepenuhnya', 'Kosongkan semua poket', 'Lipat dan masukkan ke dalam beg'],
          tip: 'Derma terus juga merupakan pilihan yang baik jika seluar jeans masih sesuai dipakai.',
        },
        'Shoes': {
          name: 'Kasut',
          reason: 'Kasut yang bersih dan dalam keadaan baik diterima di pusat pengumpulan tekstil Cloop.',
          preparation: ['Bersihkan dan keringkan kasut', 'Ikat setiap pasangan bersama', 'Masukkan ke dalam beg'],
          tip: 'Derma terus juga merupakan pilihan yang baik jika kasut masih boleh dipakai.',
        },
        'Handbag': {
          name: 'Beg Tangan',
          reason: 'Beg yang bersih dan dalam keadaan baik diterima di pusat pengumpulan tekstil Cloop.',
          preparation: ['Kosongkan semua kandungan', 'Lap sehingga bersih dan kering', 'Masukkan ke dalam beg sebelum dihantar ke pusat tekstil'],
          tip: 'Derma terus atau jual semula juga merupakan pilihan yang baik jika beg masih boleh digunakan.',
        },
        'Curtains': {
          name: 'Langsir',
          reason: 'Sesetengah pusat tekstil menerima langsir yang bersih, kering dan dalam keadaan baik; semak barangan yang diterima di lokasi itu sebelum menghantar.',
          preparation: ['Tanggalkan cangkuk dan gelang', 'Basuh dan keringkan jika perlu', 'Lipat dan masukkan ke dalam beg'],
          tip: 'Barangan yang diterima berbeza mengikut lokasi; semak penerangan pusat pengumpulan dahulu.',
        },
        'Bedsheets': {
          name: 'Cadar',
          reason: 'Cadar dan linen rumah yang bersih serta dalam keadaan baik diterima di pusat pengumpulan tekstil Cloop.',
          preparation: ['Basuh dan keringkan dengan teliti', 'Lipat kemas', 'Masukkan ke dalam beg untuk tong pengumpulan tekstil'],
          tip: 'Derma terus juga merupakan pilihan yang baik jika linen masih sesuai digunakan semula.',
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
          reason: 'Saluran pengumpulan e-sisa NEA menerima mentol pijar melalui kategori mentol dan lampu.',
          preparation: ['Kendalikan dengan berhati-hati dan jangan pecahkan', 'Bawa ke pusat pengumpulan yang menerima mentol dan lampu'],
          tip: 'Semak jenis pusat sebelum pergi kerana sesetengah tong tidak menerima tiub panjang.',
        },
      },
    },
    hazardous: {
      label: 'Sisa Berbahaya',
      items: {
        'Paint': {
          name: 'Cat',
          reason: 'Cat yang masih mengandungi cecair tidak layak dimasukkan ke dalam tong biru dan memerlukan pelupusan khusus mengikut produk. Jangan tuang cat ke dalam longkang.',
          preparation: ['Simpan dalam bekas asal berlabel dengan penutup tertutup rapat', 'Jangan campurkan cat yang berbeza', 'Ikut label atau tanya pembekal atau NEA untuk panduan pelupusan'],
          tip: 'Tin cat yang diperbuat sepenuhnya daripada logam, benar-benar kosong dan tidak mengandungi cat cecair boleh dimasukkan ke dalam tong kitar semula biru.',
        },
        'Pesticide': {
          name: 'Racun Perosak',
          reason: 'Racun perosak yang tidak digunakan memerlukan pelupusan khusus mengikut produk dan tidak boleh dituang ke tanah atau longkang.',
          preparation: ['Simpan dalam bekas asal berlabel', 'Tutup rapat dan jangan pindahkan ke bekas lain', 'Ikut label atau tanya pembekal atau NEA untuk panduan pelupusan'],
          tip: 'Tiada tong awam umum untuk sisa berbahaya isi rumah; sahkan laluan bagi produk ini sebelum pergi.',
        },
        'Motor Oil': {
          name: 'Minyak Motor',
          reason: 'Minyak motor terpakai memerlukan pelupusan terkawal dan tidak boleh dituang ke longkang, tanah atau tong kitar semula biru.',
          preparation: ['Simpan dalam bekas yang dimeterai dan kalis bocor', 'JANGAN campurkan dengan cecair lain', 'Angkut dalam keadaan tegak dan selamat'],
          tip: 'Tanya bengkel yang menyelenggara kenderaan sama ada ia menerima minyak itu; jika tidak, hubungi NEA untuk panduan.',
        },
        'Cleaning Chemical': {
          name: 'Bahan Kimia Pembersih',
          reason: 'Cara pelupusan bergantung pada produk dan kandungan yang tinggal. Pencuci longkang yang mengakis dan bahan kimia pembersih yang jelas berbahaya memerlukan pengendalian khusus.',
          preparation: ['Simpan dalam bekas asal berlabel dengan penutup tertutup rapat', 'Jangan campurkan atau pindahkan bahan kimia', 'Ikut label atau tanya pembekal atau NEA untuk panduan pelupusan'],
          tip: 'Jangan anggap tong kitar semula atau pusat awam umum menerima bahan kimia isi rumah.',
        },
        'Expired Medicine': {
          name: 'Ubat Tamat Tempoh',
          reason: 'NEA menyenaraikan baki ubat isi rumah untuk dibuang sebagai sampah biasa. Jangan sesekali siram ubat ke dalam tandas atau longkang.',
          preparation: ['Pastikan tertutup supaya tablet atau cecair tidak tertumpah', 'Buang atau lindungi maklumat peribadi pada pembungkusan', 'Masukkan ke dalam sampah biasa'],
          tip: 'Untuk ubat terkawal atau arahan khas, ikut label pendispensan atau tanya klinik yang memberi preskripsi atau ahli farmasi.',
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
        'PET drink bottle': {
          name: 'PET பான பாட்டில்',
          reason: t('ta', 'bcrs.classifyReason'),
          preparation: [t('ta', 'bcrs.step1'), t('ta', 'bcrs.step2'), t('ta', 'bcrs.step3'), t('ta', 'bcrs.step4')],
          tip: t('ta', 'bcrs.refundAmount'),
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
        'Aluminium drink can': {
          name: 'அலுமினிய பான கேன்',
          reason: t('ta', 'bcrs.classifyReason'),
          preparation: [t('ta', 'bcrs.step1'), t('ta', 'bcrs.step2'), t('ta', 'bcrs.step3'), t('ta', 'bcrs.step4')],
          tip: t('ta', 'bcrs.refundAmount'),
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
          tip: 'தயாரிப்பு இன்னும் வெளியே வந்தால் கேனை நீலத் தொட்டியில் போட வேண்டாம். கேனை சேதப்படுத்தாமல் வைத்து, லேபிளைப் பின்பற்றவும் அல்லது வழங்குநர் அல்லது NEA-விடம் கேட்கவும்.',
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
          reason: 'பவர் பேங்க்களை NEA, ICT சாதனங்களாக வகைப்படுத்துகிறது. ICT சாதனங்களை ஏற்றுக்கொள்ளும் மின்னணுக் கழிவு சேகரிப்புப் புள்ளிக்கு கொண்டு செல்லுங்கள்; பேட்டரிகளை மட்டும் ஏற்றுக்கொள்ளும் தொட்டியில் போட வேண்டாம்.',
          preparation: ['பிரிக்கவோ, குத்தவோ அல்லது நசுக்கவோ வேண்டாம்', 'வெளிப்பட்ட தொடர்புகளில் டேப் ஒட்டுங்கள்', 'ICT சாதனங்களை ஏற்றுக்கொள்ளும் மின்னணுக் கழிவு சேகரிப்புப் புள்ளிக்கு கொண்டு செல்லுங்கள்'],
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
          reason: 'ஈய-அமில கார் பேட்டரிகளில் சல்பூரிக் அமிலம் மற்றும் ஈயம் உள்ளன. அவற்றை வீட்டு பேட்டரி தொட்டியில் போடக்கூடாது.',
          preparation: ['அமில கசிவைத் தடுக்க நிமிர்ந்த நிலையில் வைக்கவும்', 'திறக்கவோ வடிகட்டவோ வேண்டாம்', 'பாதுகாப்பான கொள்கலனில் கவனமாக எடுத்துச் செல்லுங்கள்'],
          tip: 'கார் பட்டறை அல்லது பேட்டரி விற்பனையாளர் ஏற்றுக்கொள்கிறார்களா என்பதை முன்பே உறுதிப்படுத்துங்கள்; வழி கிடைக்காவிட்டால் NEA-வைத் தொடர்புகொள்ளுங்கள்.',
        },
      },
    },
    textile: {
      label: 'துணி & ஆடைகள்',
      items: {
        'T-Shirt': {
          name: 'டி-ஷர்ட்',
          reason: 'சுத்தமாகவும் நல்ல நிலையிலும் உள்ள ஆடைகளை Cloop துணி சேகரிப்புப் புள்ளிகள் ஏற்றுக்கொள்கின்றன.',
          preparation: ['நன்கு துவைத்து உலர்த்துங்கள்', 'நேர்த்தியாக மடித்து பையில் வைக்கவும்'],
          tip: 'ஆடை இன்னும் அணிய ஏற்றதாக இருந்தால் நேரடியாக நன்கொடையாக வழங்குவதும் நல்ல தேர்வு.',
        },
        'Jeans': {
          name: 'ஜீன்ஸ்',
          reason: 'சுத்தமாகவும் நல்ல நிலையிலும் உள்ள ஜீன்ஸை Cloop துணி சேகரிப்புப் புள்ளிகள் ஏற்றுக்கொள்கின்றன.',
          preparation: ['நன்கு துவைத்து உலர்த்துங்கள்', 'அனைத்து பாக்கெட்களையும் காலி செய்யுங்கள்', 'மடித்து பையில் வைக்கவும்'],
          tip: 'ஜீன்ஸ் இன்னும் அணிய ஏற்றதாக இருந்தால் நேரடியாக நன்கொடையாக வழங்குவதும் நல்ல தேர்வு.',
        },
        'Shoes': {
          name: 'காலணிகள்',
          reason: 'சுத்தமாகவும் நல்ல நிலையிலும் உள்ள காலணிகளை Cloop துணி சேகரிப்புப் புள்ளிகள் ஏற்றுக்கொள்கின்றன.',
          preparation: ['காலணிகளை சுத்தம் செய்து உலர்த்துங்கள்', 'ஒவ்வொரு ஜோடியையும் ஒன்றாகக் கட்டுங்கள்', 'ஒரு பையில் வைக்கவும்'],
          tip: 'காலணிகள் இன்னும் அணிய ஏற்றதாக இருந்தால் நேரடியாக நன்கொடையாக வழங்குவதும் நல்ல தேர்வு.',
        },
        'Handbag': {
          name: 'கைப்பை',
          reason: 'சுத்தமாகவும் நல்ல நிலையிலும் உள்ள பைகளை Cloop துணி சேகரிப்புப் புள்ளிகள் ஏற்றுக்கொள்கின்றன.',
          preparation: ['அனைத்து உள்ளடக்கங்களையும் காலி செய்யுங்கள்', 'துடைத்து சுத்தமாகவும் உலர்வாகவும் வைக்கவும்', 'பையில் வைத்து துணி சேகரிப்புப் புள்ளிக்கு கொண்டு செல்லுங்கள்'],
          tip: 'பை இன்னும் பயன்படுத்த ஏற்றதாக இருந்தால் நேரடியாக நன்கொடையாக வழங்குதல் அல்லது மறுவிற்பனை செய்தலும் நல்ல தேர்வு.',
        },
        'Curtains': {
          name: 'திரைச்சீலைகள்',
          reason: 'சில துணி சேகரிப்புப் புள்ளிகள் சுத்தமான, உலர்ந்த, நல்ல நிலையிலுள்ள திரைச்சீலைகளை ஏற்றுக்கொள்கின்றன; கொண்டு செல்வதற்கு முன் அந்த இடத்தின் ஏற்றுக்கொள்ளும் பட்டியலைச் சரிபார்க்கவும்.',
          preparation: ['கொக்கிகள் மற்றும் வளையங்களை அகற்றவும்', 'தேவைப்பட்டால் துவைத்து உலர்த்தவும்', 'மடித்து பையில் வைக்கவும்'],
          tip: 'ஏற்றுக்கொள்ளப்படும் பொருட்கள் இடத்துக்கு இடம் மாறலாம்; முதலில் சேகரிப்புப் புள்ளியின் விளக்கத்தைப் பார்க்கவும்.',
        },
        'Bedsheets': {
          name: 'படுக்கை விரிப்புகள்',
          reason: 'சுத்தமாகவும் நல்ல நிலையிலும் உள்ள படுக்கை விரிப்புகள் மற்றும் வீட்டு லினன்களை Cloop துணி சேகரிப்புப் புள்ளிகள் ஏற்றுக்கொள்கின்றன.',
          preparation: ['நன்கு துவைத்து உலர்த்துங்கள்', 'நேர்த்தியாக மடிக்கவும்', 'துணி சேகரிப்புத் தொட்டிக்கு பையில் வைக்கவும்'],
          tip: 'லினன் இன்னும் பயன்படுத்த ஏற்றதாக இருந்தால் நேரடியாக நன்கொடையாக வழங்குவதும் நல்ல தேர்வு.',
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
          reason: 'NEA-வின் மின்னணுக் கழிவு சேகரிப்பு வழிகள் வெண்ணொளி பல்புகளை பல்புகள் மற்றும் விளக்குகள் வகையில் ஏற்றுக்கொள்கின்றன.',
          preparation: ['கவனமாகக் கையாளுங்கள்; உடைக்க வேண்டாம்', 'பல்புகள் மற்றும் விளக்குகளை ஏற்றுக்கொள்ளும் சேகரிப்புப் புள்ளிக்கு கொண்டு செல்லுங்கள்'],
          tip: 'சில தொட்டிகள் நீண்ட குழாய் விளக்குகளை ஏற்றுக்கொள்ளாது; செல்வதற்கு முன் சேகரிப்புப் புள்ளி வகையைச் சரிபார்க்கவும்.',
        },
      },
    },
    hazardous: {
      label: 'ஆபத்தான கழிவுகள்',
      items: {
        'Paint': {
          name: 'வண்ணப்பூச்சு',
          reason: 'திரவம் மீதமுள்ள வண்ணப்பூச்சு நீல மறுசுழற்சித் தொட்டிக்கு ஏற்றதல்ல; அந்தத் தயாரிப்புக்குரிய அகற்றல் வழிமுறை தேவை. வண்ணப்பூச்சை வடிகாலில் ஊற்ற வேண்டாம்.',
          preparation: ['லேபிள் உள்ள அசல் கொள்கலனில் மூடியை இறுக்கமாக மூடி வைக்கவும்', 'வெவ்வேறு வண்ணப்பூச்சுகளை கலக்க வேண்டாம்', 'லேபிளைப் பின்பற்றவும் அல்லது வழங்குநர் அல்லது NEA-விடம் அகற்றல் வழிகாட்டுதல் கேட்கவும்'],
          tip: 'முற்றிலும் காலியாகவும் திரவ வண்ணப்பூச்சு இல்லாமலும் உள்ள முழு உலோக வண்ணப்பூச்சு கேனை நீல மறுசுழற்சித் தொட்டியில் போடலாம்.',
        },
        'Pesticide': {
          name: 'பூச்சிக்கொல்லி',
          reason: 'பயன்படுத்தப்படாத பூச்சிக்கொல்லிக்கு அந்தத் தயாரிப்புக்குரிய அகற்றல் முறை தேவை; அதை நிலத்திலோ வடிகாலிலோ ஊற்றக்கூடாது.',
          preparation: ['லேபிள் உள்ள அசல் கொள்கலனில் வைக்கவும்', 'இறுக்கமாக மூடி வேறு கொள்கலனுக்கு மாற்ற வேண்டாம்', 'லேபிளைப் பின்பற்றவும் அல்லது வழங்குநர் அல்லது NEA-விடம் அகற்றல் வழிகாட்டுதல் கேட்கவும்'],
          tip: 'வீட்டு ஆபத்தான கழிவுகளுக்கான பொதுத் தொட்டி இல்லை; செல்வதற்கு முன் இந்தத் தயாரிப்புக்கான வழியை உறுதிப்படுத்தவும்.',
        },
        'Motor Oil': {
          name: 'மோட்டார் எண்ணெய்',
          reason: 'பயன்படுத்திய மோட்டார் எண்ணெயைக் கட்டுப்படுத்தப்பட்ட முறையில் அகற்ற வேண்டும்; வடிகால், மண் அல்லது நீல மறுசுழற்சித் தொட்டியில் ஊற்றக்கூடாது.',
          preparation: ['மூடிய, கசிவற்ற கொள்கலனில் சேமிக்கவும்', 'மற்ற திரவங்களுடன் கலக்க வேண்டாம்', 'நிமிர்ந்த நிலையில் பாதுகாப்பாக எடுத்துச் செல்லுங்கள்'],
          tip: 'வாகனத்தைப் பராமரித்த பட்டறை எண்ணெயை ஏற்றுக்கொள்கிறதா என்று கேளுங்கள்; இல்லையெனில் NEA-வைத் தொடர்புகொண்டு வழிகாட்டுதல் பெறுங்கள்.',
        },
        'Cleaning Chemical': {
          name: 'சுத்தப்படுத்தும் இரசாயனம்',
          reason: 'அகற்றும் முறை தயாரிப்பு மற்றும் மீதமுள்ள உள்ளடக்கத்தைப் பொறுத்தது. அரிக்கும் வடிகால் சுத்திகரிப்பான் போன்ற தெளிவாக ஆபத்தான இரசாயனங்களுக்கு தயாரிப்புக்குரிய கையாளுதல் தேவை.',
          preparation: ['லேபிள் உள்ள அசல் கொள்கலனில் மூடியை இறுக்கமாக மூடி வைக்கவும்', 'இரசாயனங்களை கலக்கவோ வேறு கொள்கலனுக்கு மாற்றவோ வேண்டாம்', 'லேபிளைப் பின்பற்றவும் அல்லது வழங்குநர் அல்லது NEA-விடம் அகற்றல் வழிகாட்டுதல் கேட்கவும்'],
          tip: 'மறுசுழற்சித் தொட்டி அல்லது பொதுச் சேகரிப்புப் புள்ளி வீட்டு இரசாயனங்களை ஏற்றுக்கொள்ளும் என்று கருத வேண்டாம்.',
        },
        'Expired Medicine': {
          name: 'காலாவதியான மருந்து',
          reason: 'வீட்டில் மீதமுள்ள மருந்துகளை சாதாரணக் குப்பையாக அகற்ற வேண்டும் என்று NEA பட்டியலிடுகிறது. மருந்தை கழிப்பறையிலோ வடிகாலிலோ ஒருபோதும் கொட்ட வேண்டாம்.',
          preparation: ['மாத்திரைகள் அல்லது திரவம் சிந்தாதபடி மூடி வைக்கவும்', 'பேக்கேஜிங்கில் உள்ள தனிப்பட்ட தகவலை அகற்றவும் அல்லது மறைக்கவும்', 'சாதாரணக் குப்பையில் போடவும்'],
          tip: 'கட்டுப்படுத்தப்பட்ட மருந்துகள் அல்லது சிறப்பு வழிமுறைகள் உள்ள மருந்துகளுக்கு, வழங்கப்பட்ட லேபிளைப் பின்பற்றவும் அல்லது பரிந்துரைத்த மருத்துவமனை அல்லது மருந்தாளரிடம் கேட்கவும்.',
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
