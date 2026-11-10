# App 地图模块

`mobile/src/map/style.ts` 的 `mapStyle` 与 `MapLayers` 一起放在同一个 MapLibre `Map` 下。底图、树、遮罩、字形和 sprite 都使用 `assets.ts` 的包内地址；点位与导航数据通过内存 GeoJSON 传入。Expo 素材插件还会在启动时把原生 SDK 的默认样式设为包内 `initial-style.json`，防止创建地图时先请求 demotiles。模块不请求网络，不接定位或路线接口。

```tsx
<Map mapStyle={mapStyle}>
  <Camera ref={cameraRef} />
  <MapLayers
    points={pointsToGeoJSON(response)}
    visiblePointTypes={['return_point']}
    route={routeGeoJSON}
    destination={destinationGeoJSON}
    user={userGeoJSON}
    distance={distanceGeoJSON}
    neighborhood={zoom >= neighborhoodMinZoom}
    reduceMotion={reduceMotion}
  />
</Map>
```

保持 `mapStyle` 引用稳定。点位响应变化时重新适配一次；开关只更新 `visiblePointTypes`，通过原生图层 filter 隐藏点，不重建底图或删除源数据。省略类型列表显示全部五类，空列表隐藏全部，`['return_point']` 只显示 BCRS。

`style.ts` 导出的 `pointColors` 是地图和图层开关共用的五类点色。

## 数据

`pointsToGeoJSON` 接收已由 API 边界按 `PointsResponseSchema` 解析的 `PointsResponse`，不重复验证。每行 `[latitude, longitude, name, address]` 转成一个 Point，坐标顺序为 `[longitude, latitude]`，重复记录保持独立。Feature id 为 `<type>:<rowIndex>`；properties 包含 `type`、`name`、`address`、`dataVersion`。id 只在同一 dataVersion 内标识点，不可跨版本保存或比较。

`MapLayers` 定义五个可更新的内存数据源，未传数据时均为空 FeatureCollection：

| 源 | 数据 |
| --- | --- |
| points | `MapPoints`，不聚类、不抽样、不合并 |
| route | LineString FeatureCollection，照原几何绘制，不连接路线与目的地间的空隙 |
| destination | Point FeatureCollection，properties.label 为目的地标签 |
| user | Point FeatureCollection，properties.label 由调用方提供 |
| distance | Point FeatureCollection，properties.label 为已格式化的距离；坐标由调用方决定 |

清除目的地时传空集合。路线、位置、距离各自独立更新；模块不推算位置、距离或路线。

用户位置图标在全岛和街区均可显示。传入空的 `label` 就不显示文字；随 App 语言变化的标签不能放进地图，包内字形仅覆盖拉丁字符。

## 相机

`islandCamera(width, height)` 返回首页全岛取景：中心 `[103.845, 1.32]`、倾角 25°、朝北。按 512 像素世界瓦片的经纬跨度，分别计算横向 0.51° 和纵向 0.34° 的缩放，取较小值；水平方向留 48 逻辑像素、垂直方向留 240 逻辑像素给控件。缩放不低于包内底图的最低级别 9，保证底图可见。竖屏取景覆盖新加坡东西端及全部点位，无需等待点位接口。初始化仍须经过 `cameraCommand(target, 0)`。

`createMapCamera(mapRef.current, cameraRef.current)` 返回 `read()`、`flyTo(target, durationMs)` 与 `jumpTo(target)`。target 必须包含 center、zoom、pitch 和 bearing；调用方在地图就绪且 ref 有效后创建接口。移动方法返回的 Promise 表示已读取原生相机并发出命令，动画结束应通过 Map 的相机事件观察。

RN 11.5.1 的 iOS `CameraUpdateItem.m::_makeCamera` 按旧 pitch 将 zoom 换算成 altitude，随后才应用新 pitch。两个移动方法都先读当前相机，再发送：

```text
commandZoom = zoom + log2(cos(oldPitch) / cos(newPitch))
commandBearing = ((bearing % 360) + 360) % 360
```

角度换算成弧度后计算 cos。`jumpTo` 同样经过该原生换算路径，适用于减弱动态效果。初始化 `Camera.initialViewState` 时，可用 `cameraCommand(target, 0)` 补偿原生初始零倾角；初始化之外使用上述读取后移动的接口。

`camera.test.ts` 同时检查声明版本、锁文件和实际安装版本均为 11.5.1。版本变化会让 `test:unit` 失败：先核对上游 pitch 换算与 bearing 的行为，修复后删除相应补偿并重新核验原生终态，防止补偿两次。该相机换算针对 iOS。

## 绘制与动画

基础样式包括暗海面、陆地、国界遮罩、海岸微光、绿地、道路、真实树点、建筑轮廓与有高度建筑的墙面和屋顶。缺高度的建筑不拉高。树是贴地的程序化树冠符号，窗格是装饰纹理。道路名从 OSM `name` 读取，zoom 15 起显示；没有 POI 或地名标注。

`neighborhoodMinZoom` 为 14。调用方从实际相机缩放状态提供 `neighborhood`，从系统无障碍设置提供 `reduceMotion`，并在系统设置变化时更新。只有街区且有目的地时显示脉冲；减弱动态效果时保留静止圆环。组件监听 AppState，非 active 状态停止计时；清除目的地或卸载同样清理计时器。

脉冲由原生 circle 样式 transition 插值：100 ms 初始圆环之后，1500 ms 内半径 8→23、填充透明度 0.36→0、描边透明度 1→0。JS 每周期只提交展开和复位两个状态；原生在中间帧继续绘制。动画状态留在独立组件里，不反复适配点位或重载样式。持续动画仍有 GPU 与渲染开销，模拟器帧间隔不能代替真机的发热与内存评估。

## 海岸几何

Protomaps 的 `earth` 图层混有 Polygon 和用于标注的 Point。单点不能作为 line 的几何，MapLibre Native 会记录 `Invalid geometry in line layer`。素材生成器保留规则将 earth 限定为 Polygon；正式海岸 line 层也只选择 Polygon。这样仍画真实多边形边界，不给单点补造线段，也不隐藏日志。素材来源和生成方式见 [包内地图素材](map-assets.md)。

## 答案取景与地图共用

`SharedMapContext` 将同一个地图的就绪状态、减弱动态效果、相机移动和内存数据源更新提供给覆盖层。首页保留自己的图层选择；答案期间通过 `setAnswerLayers` 覆盖可见层，关闭答案后传 `null` 恢复首页选择。目的地独立清除，地图实例与当前相机保留。该 context 不请求 API。`setRoute` 更新 LineString FeatureCollection，`setDistance` 更新 `MapLabels` 距离气泡；两者与 `setDestination` 一起传入空集合即可清除。状态由 `MapHomeScreen` 持有并直接交给 `MapLayers`。

`destinationCamera(destination, user, width, height, cardHeight, topInset)` 返回街区取景，不修改现有相机接口。答案卡先呈现，布局后测量实际高度，再将该高度用于取景，不延迟卡片出现。经纬度转换为归一化 Web Mercator 坐标，以屏幕宽度减去 112、可用高度减去卡片、顶部安全区及 144 作为两点取景空间。只有两点能在 zoom 14 及以上放入时才使用其中点，zoom 上限为 16.8；否则只取目标。倾角固定 55°，朝北。用原生地图的透视相机模型（相机屏幕距离为屏高的 1.5 倍）将中心向南移，使目标区域位于卡片上方的可见空间。屏幕偏移 `s = (topInset - cardHeight) / 2` 对应的地面偏移为 `s / (cos(pitch) + s * sin(pitch) / (height * 1.5))`；正向投影再验证目标落在可见区域中点，包含展开卡片的高度。相机指令仍通过 `createMapCamera` 补偿原生 pitch 换算。

有照片的答案先把底图切至 `islandCamera`，照片以 native driver 在 700 ms 内缩小并淡出，然后向取景落点发送 3000 ms 飞行。没有照片时直接从当前视角飞行。减弱动态效果通过已有 `jumpTo` 直接到落点。相机测试保护近处用户与目标的共同取景、远处用户不降低到全岛缩放，以及卡片空间预留。

`SharedMapValue.moveAndWait(target, durationMs)` 在发出相机指令后等待原生 `onRegionDidChange`，用于确保路线在飞行结束或减弱动态效果的直接切换完成后出现。原有 `move` 仍只等待指令发出。`route-data.ts` 导出的 `routeMapData(response)` 接收 API 边界已解析的 `RouteResponse`，保留 `geometry` 原样，将 `formatDistance(distanceM / 1000)` 放在线段累计长度的一半处；只使用返回的路网几何，不连接用户、目标与吸附点。

`mobile/src/lib/walking-route.ts` 导出的 `routeMidpoint(coordinates)` 按球面距离计算每段长度，累计到全线一半时在该段内插值，返回 `[longitude, latitude]`。零长度段保持原点。卡片内容、语言或展开状态改变高度后，答案按实测高度重新取景；首页路线按整个底部控件区域的实测高度取景。
