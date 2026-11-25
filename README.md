# BinWhere

[English](#english) · [中文](#中文)

<a id="english"></a>

BinWhere is a recycling guide for Singapore. Snap a photo or type an item, and it tells you where the item goes (the Blue Bin, a BCRS return point for drink containers, e-waste, textile and donation points, or general waste), what to do before you drop it off, and where the nearest drop-off point is.

- Website: <https://binwhere.sg>
- iPhone app: [BinWhere on the App Store (Singapore)](https://apps.apple.com/sg/app/binwhere/id6816734145)

It answers in English, 中文, Bahasa Melayu and தமிழ். No account, no ads.

## What is in this repository

| Path | Contents |
| --- | --- |
| `app/` | Next.js website and the production API (`/api/v1`, `/api/v2`) |
| `mobile/` | Expo (React Native) iPhone app |
| `packages/core/` | `@binwhere/core`: shared types, recycling categories, BCRS rules, translations and the frozen API contracts |
| `ops/` | Caddy and systemd configuration, and the walking-route (OSRM) build |
| `docs/` | Notes on classification evaluation, the map and data licences |

## Running it locally

Use the Node.js version in `.nvmrc`.

```bash
cd packages/core && npm ci
cd ../../app && npm ci && npm run prebuild && npm run dev
```

`npm run prebuild` unpacks the recycling-point snapshot in `app/data/geo-snapshot` without going online. Classifying photos and text calls TokenHub (Tencent Cloud) and needs `TOKENHUB_API_KEY` in `app/.env`.

After the core step, the iPhone app builds with `cd mobile && npm ci && npm run ios` (Xcode and CocoaPods; Expo Go is not supported). It talks to `https://binwhere.sg` by default.

## Data and licences

The code is licensed under the [Apache License 2.0](LICENSE); the licence does not cover the BinWhere name, logo or app icon. Data keeps its own licence: recycling points come from NEA datasets on data.gov.sg (Singapore Open Data Licence), Return Right (BCRS return points) and Cloop (textile bins); the map and walking routes come from OpenStreetMap, with sources and licences listed at <https://binwhere.sg/data-license>.

BinWhere is an independent project and is not affiliated with or endorsed by NEA or BCRS Ltd.

## Issues and contributions

Bug reports, wrong answers and missing or outdated recycling points are welcome as [issues](https://github.com/ichoyb/binwhere-sg/issues). Development happens in a private repository and this one is a filtered copy, updated after releases, so pull requests are not merged here. To propose a change, please open an issue first.

Please report security problems privately; see [SECURITY.md](SECURITY.md).

---

<a id="中文"></a>

# BinWhere（中文）

BinWhere 是新加坡的回收指南。拍一张照片或输入物品名称，它会告诉你这件东西该去哪里（蓝色回收桶、饮料容器押金退还点、电子垃圾、旧衣与捐赠点，或一般垃圾），投放前要怎么处理，以及最近的投放点在哪里。

- 网站：<https://binwhere.sg>
- iPhone App：[App Store（新加坡）上的 BinWhere](https://apps.apple.com/sg/app/binwhere/id6816734145)

支持英文、中文、马来文和泰米尔文。无需注册，没有广告。

## 仓库内容

| 路径 | 内容 |
| --- | --- |
| `app/` | Next.js 网站和生产 API（`/api/v1`、`/api/v2`） |
| `mobile/` | Expo（React Native）iPhone App |
| `packages/core/` | `@binwhere/core`：共享类型、回收类别、BCRS 规则、多语言文案和冻结的 API 契约 |
| `ops/` | Caddy 与 systemd 配置，以及步行路线（OSRM）构建 |
| `docs/` | 识别评测、地图和数据许可的说明 |

## 本地运行

使用 `.nvmrc` 指定的 Node.js 版本。

```bash
cd packages/core && npm ci
cd ../../app && npm ci && npm run prebuild && npm run dev
```

`npm run prebuild` 只在本地展开 `app/data/geo-snapshot` 中的回收点快照，不联网。照片和文字识别调用腾讯云 TokenHub，需要在 `app/.env` 中设置 `TOKENHUB_API_KEY`。

完成 core 那一步后，iPhone App 用 `cd mobile && npm ci && npm run ios` 构建（需要 Xcode 和 CocoaPods，不支持 Expo Go），默认连接 `https://binwhere.sg`。

## 数据与许可

代码采用 [Apache License 2.0](LICENSE) 授权，许可不包括 BinWhere 的名称、标志和 App 图标。数据保留各自的许可：回收点来自 NEA 在 data.gov.sg 发布的数据集（新加坡开放数据许可）、Return Right（饮料容器退还点）和 Cloop（旧衣回收箱）；地图和步行路线来自 OpenStreetMap，来源与许可见 <https://binwhere.sg/data-license>。

BinWhere 是独立项目，与 NEA、BCRS Ltd 等机构没有隶属或背书关系。

## Issue 与贡献

欢迎通过 [Issues](https://github.com/ichoyb/binwhere-sg/issues) 反馈程序错误、不对的识别结果，或缺失、过时的回收点。开发在私有仓库进行，本仓库是它的过滤副本，在发布后更新，因此这里不合并 Pull Request；如果想提议修改，请先开一个 Issue。

安全问题请私下报告，见 [SECURITY.md](SECURITY.md)。
