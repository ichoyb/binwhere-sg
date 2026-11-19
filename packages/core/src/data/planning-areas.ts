import type { Locale } from '../i18n';

// Sources: URA Master Plan 2025 boundaries, SingStat C020125 selection, OpenStreetMap Chinese names.
// Centres: walking-network snaps of blue-bin means; Newton, River Valley and Tengah use all five point layers.
// See docs/geo-data-release.md.
export interface PlanningArea {
  readonly code: string;
  readonly names: Readonly<Record<Locale, string>>;
  readonly lat: number;
  readonly lng: number;
}

export const PLANNING_AREAS: readonly PlanningArea[] = [
  { code: 'AM', names: { en: 'Ang Mo Kio', zh: '宏茂桥', ms: 'Ang Mo Kio', ta: 'Ang Mo Kio' }, lat: 1.370364, lng: 103.847057 },
  { code: 'BD', names: { en: 'Bedok', zh: '勿洛', ms: 'Bedok', ta: 'Bedok' }, lat: 1.32912, lng: 103.927141 },
  { code: 'BS', names: { en: 'Bishan', zh: '碧山', ms: 'Bishan', ta: 'Bishan' }, lat: 1.353086, lng: 103.846546 },
  { code: 'BK', names: { en: 'Bukit Batok', zh: '武吉巴督', ms: 'Bukit Batok', ta: 'Bukit Batok' }, lat: 1.353, lng: 103.748586 },
  { code: 'BM', names: { en: 'Bukit Merah', zh: '红山', ms: 'Bukit Merah', ta: 'Bukit Merah' }, lat: 1.282334, lng: 103.82197 },
  { code: 'BP', names: { en: 'Bukit Panjang', zh: '武吉班让', ms: 'Bukit Panjang', ta: 'Bukit Panjang' }, lat: 1.382298, lng: 103.767857 },
  { code: 'BT', names: { en: 'Bukit Timah', zh: '武吉知马', ms: 'Bukit Timah', ta: 'Bukit Timah' }, lat: 1.33423, lng: 103.780492 },
  { code: 'CK', names: { en: 'Choa Chu Kang', zh: '蔡厝港', ms: 'Choa Chu Kang', ta: 'Choa Chu Kang' }, lat: 1.386191, lng: 103.745607 },
  { code: 'CL', names: { en: 'Clementi', zh: '金文泰', ms: 'Clementi', ta: 'Clementi' }, lat: 1.313714, lng: 103.76611 },
  { code: 'GL', names: { en: 'Geylang', zh: '芽笼', ms: 'Geylang', ta: 'Geylang' }, lat: 1.320591, lng: 103.890679 },
  { code: 'HG', names: { en: 'Hougang', zh: '后港', ms: 'Hougang', ta: 'Hougang' }, lat: 1.371128, lng: 103.888297 },
  { code: 'JE', names: { en: 'Jurong East', zh: '裕廊东', ms: 'Jurong East', ta: 'Jurong East' }, lat: 1.336905, lng: 103.739252 },
  { code: 'JW', names: { en: 'Jurong West', zh: '裕廊西', ms: 'Jurong West', ta: 'Jurong West' }, lat: 1.34341, lng: 103.707694 },
  { code: 'KL', names: { en: 'Kallang', zh: '加冷', ms: 'Kallang', ta: 'Kallang' }, lat: 1.315307, lng: 103.864046 },
  { code: 'MP', names: { en: 'Marine Parade', zh: '马林百列', ms: 'Marine Parade', ta: 'Marine Parade' }, lat: 1.303775, lng: 103.911959 },
  { code: 'NT', names: { en: 'Newton', zh: '纽顿', ms: 'Newton', ta: 'Newton' }, lat: 1.311302, lng: 103.838125 },
  { code: 'NV', names: { en: 'Novena', zh: '诺维娜', ms: 'Novena', ta: 'Novena' }, lat: 1.325999, lng: 103.85566 },
  { code: 'OT', names: { en: 'Outram', zh: '欧南', ms: 'Outram', ta: 'Outram' }, lat: 1.282833, lng: 103.841752 },
  { code: 'PR', names: { en: 'Pasir Ris', zh: '巴西立', ms: 'Pasir Ris', ta: 'Pasir Ris' }, lat: 1.371992, lng: 103.95095 },
  { code: 'PG', names: { en: 'Punggol', zh: '榜鹅', ms: 'Punggol', ta: 'Punggol' }, lat: 1.402323, lng: 103.906369 },
  { code: 'QT', names: { en: 'Queenstown', zh: '女皇镇', ms: 'Queenstown', ta: 'Queenstown' }, lat: 1.30099, lng: 103.798732 },
  { code: 'RV', names: { en: 'River Valley', zh: '里峇峇利', ms: 'River Valley', ta: 'River Valley' }, lat: 1.295779, lng: 103.838468 },
  { code: 'RC', names: { en: 'Rochor', zh: '梧槽', ms: 'Rochor', ta: 'Rochor' }, lat: 1.305134, lng: 103.853779 },
  { code: 'SB', names: { en: 'Sembawang', zh: '三巴旺', ms: 'Sembawang', ta: 'Sembawang' }, lat: 1.449512, lng: 103.821451 },
  { code: 'SE', names: { en: 'Sengkang', zh: '盛港', ms: 'Sengkang', ta: 'Sengkang' }, lat: 1.390514, lng: 103.892837 },
  { code: 'SG', names: { en: 'Serangoon', zh: '实龙岗', ms: 'Serangoon', ta: 'Serangoon' }, lat: 1.361178, lng: 103.872063 },
  { code: 'TM', names: { en: 'Tampines', zh: '淡滨尼', ms: 'Tampines', ta: 'Tampines' }, lat: 1.353829, lng: 103.946747 },
  { code: 'TN', names: { en: 'Tanglin', zh: '东陵', ms: 'Tanglin', ta: 'Tanglin' }, lat: 1.316929, lng: 103.807594 },
  { code: 'TH', names: { en: 'Tengah', zh: '登加', ms: 'Tengah', ta: 'Tengah' }, lat: 1.358954, lng: 103.734624 },
  { code: 'TP', names: { en: 'Toa Payoh', zh: '大巴窑', ms: 'Toa Payoh', ta: 'Toa Payoh' }, lat: 1.336011, lng: 103.856299 },
  { code: 'WD', names: { en: 'Woodlands', zh: '兀兰', ms: 'Woodlands', ta: 'Woodlands' }, lat: 1.437911, lng: 103.79094 },
  { code: 'YS', names: { en: 'Yishun', zh: '义顺', ms: 'Yishun', ta: 'Yishun' }, lat: 1.425761, lng: 103.838436 },
];

export function getPlanningArea(code: string): PlanningArea | undefined {
  return PLANNING_AREAS.find((area) => area.code === code);
}
