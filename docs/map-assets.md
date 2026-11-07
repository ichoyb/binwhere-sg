# 包内地图素材

App 只打包底图、树、国界遮罩、sprite 和道路字形。回收点由接口提供，不进入素材目录。素材更新是显式操作，依赖安装、CI 和 App 构建不会运行生成器。

程序化 sprite 包含窗格、树冠、位置点、目的地和可拉伸距离气泡，不使用第三方图形。`initial-style.json` 是供原生地图初始化使用的空样式；Expo 插件在启动时将 MapLibre 默认样式指向此包内文件，避免 RN 应用正式样式之前请求在线默认样式。绘制与数据接口见 [App 地图模块](map-rendering.md)。

来源 pin 和图层保留配置在 `mobile/scripts/map-assets-config.json`；当前文件清单、哈希、体积、字形覆盖和实际工具版本以 `mobile/assets/map-assets/manifest.json` 为准。使用方读取 `mobile/src/map/assets.ts` 提供的包内地址，无需下载或首次复制素材。

## 生成

准备 uv 和项目的 Node 环境；运行平台须与配置中 PMTiles CLI 下载包的目标平台一致。从仓库根目录执行，选择新的临时工作目录：

```bash
map_work=$(mktemp -d)
npm --prefix mobile run map:build -- \
  --work-dir "$map_work/work" \
  --output "$map_work/assets" \
  --basemap-extract /path/to/singapore-extract.pmtiles \
  --osm-pbf /path/to/region.osm.pbf
```

命令通过 `uv run --project mobile/scripts --locked` 使用 `.python-version` 固定的解释器和 `uv.lock` 中带哈希的依赖。两个本地输入参数均可省略；省略时从配置里的固定来源获取。每日底图源会过期，保留已校验的截取输入；本地输入仍须符合 pin。

输出目录必须为空。生成器会校验下载内容，并对写出的每个 PMTiles 自动执行官方格式校验，任一步失败均非零退出；全部成功才写 manifest。

## 更新与提交

更新配置中的来源 pin、保留规则及素材批次日期，再在新的空目录重新生成。若更新解释器或工具依赖，同时审查 `.python-version`、`pyproject.toml` 和重新生成的 `uv.lock`。

审查生成的 manifest、来源和体积变化，再把完整素材目录同步回仓库并运行单测：

```bash
rsync -a --delete "$map_work/assets/" mobile/assets/map-assets/
npm --prefix mobile run test:unit
```

审过后一起提交配置、工具锁文件和完整素材目录。更新操作不提交、不推送、不部署。

## 复现与许可

逐字节复现须使用相同的解释器、zlib 和锁定依赖。用 manifest 记录的工具环境在新工作目录生成，再比较整个输出目录，包括 manifest；仅相同的 Python 补丁版本不足以保证不同系统上的 zlib 相同。

发布素材时保留 OpenStreetMap 的 ODbL 署名。字体的 OFL 许可文本必须随素材保留，更新时不得删除；各文件的来源和许可见 manifest。
