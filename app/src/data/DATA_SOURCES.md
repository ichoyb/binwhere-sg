# BinWhere 地理数据来源

生产构建不会使用仓库中的 generated 文件或上一次构建结果。`npm run prebuild`
会重新获取远端数据、校验全部五类点位，并生成
`src/data/generated/data-manifest.json`。该目录不进入 Git。

## 当前来源

| 数据集 | 权威来源 | 获取方式 | 上游时间字段 | 最低点位数 |
| --- | --- | --- | --- | ---: |
| Blue Bins | data.gov.sg / NEA | 每次构建下载最新 GeoJSON | `lastUpdatedAt` | 10,000 |
| E-Waste | data.gov.sg / NEA | 每次构建下载最新 GeoJSON | `lastUpdatedAt`、`coverageStart` | 500 |
| Textile Bins | Cloop / recycle.gov.sg | 仓库内版本化快照 | `snapshotCapturedAt` | 300 |
| Reuse Channels | NEA OneMap feed | 每次构建获取 | feed `DateTime` | 50 |
| BCRS Return Points | Return Right 官方公共地图 | 每次构建通过全岛网格查询获取 | 无静态内容更新时间；记录本次 `retrievedAt` | 1,000 |

点位总数不在代码或文档中固定；Web 界面从本次构建的 manifest 读取实际数量。
mobile 仅展示 BCRS 官方长期口径 `1,000+`，附近点位仍由 Web API 返回。

## 新鲜度语义

- 远端来源必须在当前构建中成功返回并通过校验；不存在本地回退。
- data.gov.sg 和 NEA 的发布内容可能长期不变。manifest 同时记录本次获取时间和
  发布方时间，不能把“刚下载”误写成“内容刚更新”。
- Textile 是唯一的本地快照，采集于 `2026-03-01T18:04:55+08:00`，最长允许
  366 天；过期后构建直接失败，必须重新核实并更新快照日期。
- Return Right 地图只提供 2 公里半径查询，没有可公开访问的全量导出。构建使用
  地图自身的 `SGRegionGeo.json` 计算覆盖边界，以无空洞网格查询全岛并按来源 ID
  去重。地图返回的机器状态会实时变化，因此构建只使用点位、地址、邮编和营业
  时间，不发布 `MACHINE_STATUS`，也不把任何状态改写为 `ONLINE`。

## 构建质量门槛

所有输出都必须满足：

1. 是 GeoJSON `FeatureCollection`，且每条记录为 `Point`；
2. 经纬度是有限数值并位于新加坡边界内；
3. 数据集所需名称、地址、来源 ID 等字段完整；
4. 唯一 ID 不重复，点位数量高于表中的保守下限；
5. 上游声明记录数时，声明值必须与响应记录数一致。

BCRS 构建要求地图配置仍声明 2 公里查询半径，覆盖网格的每个请求都必须成功。
重叠查询中的同一来源 ID 必须具有完全一致的静态字段；否则说明抓取期间数据发生
变化，构建直接失败。具有部分位置字段但无法定位的记录视为无效点位；无效比例
超过 1% 时构建失败。

## 原子生成与审计

构建先删除旧 generated 目录，再写入独立 staging 目录。只有五类数据全部成功时
才原子改名为 generated；任何异常都会同时清除 staging 和 generated，避免后续步骤
打包旧数据或半成品。

manifest 为每个数据集记录：来源 URL、发布方、获取时间、上游更新时间、实际点位
数、最低点位数、排除/无效记录数（如适用）及内容 SHA-256。BCRS 还记录地图 API、
覆盖文件及其 SHA-256、查询数量、半径、网格间距、原始观察数和去重观察数。

```bash
cd app
npm run prebuild
jq . src/data/generated/data-manifest.json
```
