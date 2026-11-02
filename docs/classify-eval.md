# 分类评测与发布证据

评测代码位于 `app/scripts/classify-eval/`。运行环境为 Node v24.22.1。
离线 CI 不调用模型；付费运行必须先获得用户批准。本文的生产身份对应
2026-10-25 实际部署的 `5a19b7f0854ac15a63263996692601eaaa5554b0`。

## 当前真值与判定

`sg-consumer-text-v4` 有 86 条文字用例；`sg-bcrs-v22` 有 32 条四语文字用例，
以及来自 58 个 SHA-256 固定来源的 61 条图片用例。其中 7 条是 holdout：代码和标签冻结后于
2026-11-02 选定并逐像素复核，3 张回收点（铝罐、手持塑料瓶、即饮咖啡短罐），4 张非回收点
（玻璃啤酒瓶、屋顶形纸盒、洗发水瓶、带吸管的砖形纸盒）。其余都是 regression。

判定依据：2026-10-01 起，在新加坡销售的受管制饮料都必须印押金标志和条码，是否退款由回收机
扫码比对 BCRS Ltd 的注册库决定，境外购买的即使印有标志也不退。所以照片里拍没拍到标志既不必要
也不充分，判定看容器是否属于押金类别；在哪里购买只有用户知道，由应用文案提示。

BCRS core 按以下顺序处理模型事实：

1. 多个并列容器、外包装、没有容器：`not_sure`，不给动作。单个容器外的松散包装不增加容器数。
2. 产品或主体已识别为 `other`：保留模型普通渠道；模型的 `return_point` 改为 `not_sure`。
3. 产品、容器数量或主体有 `unknown`：形状为瓶、罐、杯或未知，同时材质为塑料、金属或未知时，
   给 `not_sure`，不给动作。其他形状或材质保留模型普通渠道，`return_point` 改为 `not_sure`。
4. 已确定的单个预包装饮料按容器类别判断：塑料或金属瓶、罐、杯脏污时给 `general_waste`；
   否则损坏、条码损坏、写明或看得出容量不在 150ml–3L，或文字明确说没有新加坡押金标志、在境外
   购买时，给 `blue_bin`；其余给 `return_point` 和 `return_container`。容量和损坏、脏污一样只用于
   排除，容量未知不影响回收点：不在 150ml–3L 的容器不印押金标志，回收点文案已要求用户先看标志。
5. 已确定的单个饮料若形状或材质未知，主体上可读的 `10¢ SG RETURN` 仅填补这两项，不能覆盖已知
   排除条件；没有这项证据时给 `not_sure` 和 `check_container_type`。
6. 单个未损坏、未脏污的玻璃饮料瓶：模型给 `general_waste`、null 或 `return_point` 时改为
   `blue_bin`，使用 `classify.cleanGlass*`；模型其他普通渠道保持不变。损坏或脏污的玻璃瓶
   保留普通渠道，`return_point` 改为 `not_sure`。
7. 纸盒、软袋、非饮料、粉状饮料、特殊医疗用途食品、现做饮品等按普通规则处理，不能给 `return_point`。

容量只取用户写明的、容器上印出的或画面中看得出的大小，否则为未知，模型不按产品常见规格推断；
提示词不含评测输入示例。图片有印出的容量，或有完整外形、手或已知物体作尺寸参照时，才能看出
是否超出范围；标签特写没有参照时容量未知。损坏和脏污只根据观察或明确描述；正常饮料内容物可以倒空，
看不到条码不等于条码损坏。外国标志不作为购买地证据。

回收点的原因、四步准备和提示始终由 core 使用 `bcrs.classifyReason`、`bcrs.step1–4`、
`bcrs.refundAmount` 生成，包括模型本来就给回收点的情况。普通渠道与规则一致时保留模型文字。
退款要求在新加坡购买并带押金标志，是否接收由退还点扫码决定。所有 `not_sure` 应用文案和
check 动作都不提蓝色回收箱。四语应用文案均绑定在候选摘要中；v1 契约及旧动作枚举保持原样。

## 发布门槛

| 项目 | 要求 |
| --- | --- |
| 普通文字 exact / channel / status | 各至少 90% |
| 每个普通文字渠道 | 至少 80% |
| 普通文字非必要不确定 | 少于 15% |
| 安全渠道误导 | 错误非 null 渠道为 0 |
| Provider 错误 | 0 |
| BCRS 四语文字 | 全部精确通过 |
| BCRS 图片精确率 | 至少 95% |
| 图片回收点真值召回 | 至少 90% |
| BCRS 错误非 null 渠道 / 错误回收点 | 均为 0 |
| 不确定结果提蓝箱 | 0 |
| 新 holdout | 回收点真值至少 2 个，其他真值至少 2 个 |
| Holdout | 每条分类、动作、安全断言均通过，零 provider 错误 |

召回和错误回收点依据审核后的类别真值计算，不以标志是否拍到为准。普通文字候选还必须保留
生产答对的每条用例、每个渠道正确数、整体三项准确率及不确定数，不能用相同总分掩盖换错。
生产测量可以不通过质量门槛，但必须完整且零错误。候选与生产必须使用当前真值，生产先完成，
两者时间相差不超过 24 小时。延迟 p50/p95 是诊断数据，超时造成的 provider 错误使测量无效。

## 实际部署版本的生产基线

`PRODUCTION_PROFILE` 只记录 `production-5a19b7f` 及完整 revision。
候选运行器拒绝 `--profile=production`，生产执行入口为 `baseline:production`。
worktree 路径是必填参数，没有默认值。worktree 在仓库外，由 owner 创建并安装自己的依赖。
唯一源码补丁是 `patches/production-5a19b7f.patch`，只把 TokenHub 地址改为国际站；超时不打补丁。

编排脚本 `run-production.ts` 导出当前全部输入到仓库外临时目录。图片携带当前缓存的
绝对路径、SHA-256 和裁切；逐个验摘要，缺失或不符直接失败，不下载。清单摘要只包含
id、模式、locale、文字、来源 SHA-256、裁切，绝对路径不进入摘要。新增真值后会自动改变摘要。

子进程使用 `<worktree>/app/node_modules/.bin/tsx`，cwd 是 `<worktree>/app`。
脚本没有主干运行时模块导入；用 worktree 的 `createRequire` 锚点解析 sharp、app/core 各自的
zod、`@binwhere/core`、provider、TokenHub、image-security 和 deposit-mark-ocr。
模块的实际相对路径、sharp 0.35.4、两份 zod 4.6.7 和 Node 版本均记入输出。

生产路由使用默认 `new TokenHubProvider()`，没有评测选项。主干完整序列化当前
`DEFAULT_EXECUTION_POLICY`；子进程先比对它与部署版本默认策略的字段集合，再作为
`classifyItem(request, provider, executionPolicy)` 第三个参数传入，生效数值全部记录。
图片逐行采用部署版本的 crop → rotate → resize → flatten → JPEG
`Math.round(IMAGE_QUALITY * 100)` → `validateAndSanitizeImage`，使用 worktree 自己的常量和 sharp。
全部图片预处理及近重复检查完成后才开始模型调用，所有用例顺序执行。

| 核对项 | 运行时 | 浅克隆 CI / 候选配对 / 发布检查 |
| --- | --- | --- |
| HEAD | 启动子进程前读取，必须等于完整部署 revision | 来源记录与 `PRODUCTION_REVISION` 比较 |
| 已跟踪改动 | porcelain 只能列出 `app/src/lib/ai/providers/tokenhub.ts` | 核对记录中的文件列表及通过状态 |
| TokenHub blob | `git hash-object` 必须为 `06a5cfc1e0eec0824b3c91fda6c249d90d6babd8` | 核对已提交的预期 blob 常量 |
| 两份 lockfile | 对 worktree 文件计算 SHA-256 | 核对已提交摘要常量 |
| 补丁 | 对主干补丁文件计算 SHA-256，写入原始输出 | 重新计算已提交补丁文件的 SHA-256 |
| 模块及依赖 | 实际解析路径、加载版本必须匹配部署常量 | 核对来源记录 |
| 清单 | 导出验图片摘要，子进程重算清单摘要 | 仅从当前真值重算，无需缓存 |
| 执行策略 | 字段集合必须匹配部署版本 | 整组数值必须等于主干当前默认值 |
| 有效性 | 每条结果或错误、耗时及开始结束时间均记录 | 完整、零错误、非空跑、24 小时内 |

CI 不读取旧 git 对象、worktree 或 fixture 缓存，不比较受 git 配置影响的 diff 文本。
两份 lockfile 常量分别是：

- app：`e998a8edace813bdc33880ba629ab670c96f8af4fe66d3472a7033595fc1e7dd`
- core：`465985793d7630bd7ff724bbbcaf67423611c8037a90c06b221eff8550b95941`

`production-validation.ts` 是两个候选运行器及 `release-evidence.ts` 共用的校验模块。
`production-scoring.ts` 使用当前真值、`checkBcrsResult` 和候选共用的 `scoring.ts` 评分。
付费有效结果写为以下两份文件，沿用原有字段并新增 `source`：

- `baselines/sg-consumer-text-v4/production-5a19b7f.json`
- `baselines/sg-bcrs-v22/production-5a19b7f.json`

`timestamp` 永远取子进程结束时间。重新评分旧原始输出不会刷新 24 小时窗口。
原始输出包含运行时核对、清单和补丁摘要、模块路径、版本、执行策略、图片处理记录、
是否空跑、开始结束时间，以及每条用例的结果或错误和耗时。

空跑不需要密钥，不调用模型、不联网；它完成身份核对、模块加载、所有图片的两段处理、
近重复检查、策略字段核对，并对一张清洗后的图片实际调用
`readDepositMarkText(image, null)`，诊断 worktree 的 OCR worker 和本地模型加载。
子进程写完输出后显式退出。空跑结果可核对格式和身份，但评分写入函数及基线校验器都拒绝它。

密钥由编排脚本按现有运行器方式读取主干 `app/.env`，仅通过子进程环境变量
`TOKENHUB_API_KEY` 传递。不得复制 `.env` 到 worktree，不得把密钥写入产物或日志。

## 运行命令

以下命令在仓库的 `app/` 下执行，Node 必须是 `.nvmrc` 指定的 v24.22.1。worktree 建在仓库目录之外。

建 worktree、打补丁、装依赖（先 core 后 app）：

```bash
REPO=$(git rev-parse --show-toplevel)
WT=/private/tmp/binwhere-production-5a19b7f
git -C "$REPO" worktree add --detach "$WT" 5a19b7f0854ac15a63263996692601eaaa5554b0
git -C "$WT" apply "$REPO/app/scripts/classify-eval/patches/production-5a19b7f.patch"
git -C "$WT" hash-object app/src/lib/ai/providers/tokenhub.ts  # 06a5cfc1e0eec0824b3c91fda6c249d90d6babd8
(cd "$WT/packages/core" && npm ci) && (cd "$WT/app" && npm ci)
```

预取图片，然后空跑。预取只下载并核对 SHA-256，不读密钥、不调用模型；新增图片来源后也要运行：

```bash
npm run fixtures:prefetch
RUN=$(mktemp -d /private/tmp/binwhere-baseline-run.XXXXXX)
npm run baseline:production -- --worktree="$WT" --output="$RUN/dry-run.json" --dry-run
npm run baseline:score -- --raw="$RUN/dry-run.json"
```

付费运行需要用户批准，并且要在文案、真值和 holdout 冻结之后。先跑生产，两个候选在之后 24 小时内跑完：

```bash
npm run baseline:production -- --worktree="$WT" --output="$RUN/paid-run.json"
npm run test:classify -- --profile=candidate
npm run test:classify:bcrs -- --profile=candidate
```

`npm run baseline:score -- --raw=<原始输出>` 可以重新评分归档的原始输出，`timestamp` 仍取原运行的结束时间。
候选结果写入 gitignored 的 `results/`。`--mode`、`--case`、`--partition` 只是诊断子集，不能作为发布证据。
审查完整的付费结果后，记录证据：

```bash
npm run release-evidence:record -- --text-result=<候选文字结果> --bcrs-result=<候选 BCRS 结果>
npm run test:release-evidence
```

## 证据、图片与 holdout

`release-evidence/current.json` 记录每条候选回答。离线检查重新推导门槛，绑定当前真值摘要、
候选源码与 profile、所有应用分类文案、客户端和服务器图片管线、锁定的 sharp，以及配对生产来源。
相关配置变更需要新的审核后付费结果，不能手改旧证据使其通过。现有证据与当前配置不符，
`release-evidence.ts --check` 的断言失败是预期状态。

图片必须是真实照片或由真实照片组成的出版物合成图；来源清单记录网页、credit、授权边界、
审核日期、裁切和 SHA-256。缓存不提交，也不重新分发出版物图片。不使用生成图片或虚构来源。
来源网页只证明出处，不能补足像素里不可见的主体、容量、材质、状况或标志文字。
完整图片管线后，来源之间的感知相似度达到 0.995 就在模型调用前拒绝。

代码、文案和标签冻结后才选择并逐像素复核新的正负 holdout；已经提交给模型的 holdout 在下轮
转为 regression。这些检查公开、冻结且不自适应，不声称是保密盲测。
负例照片覆盖六类：压扁的罐、小于 150ml 的瓶、大于 3L 的瓶、饮料纸盒、非饮料塑料瓶和粉状饮料罐。
软袋没有权威出处能确定唯一的普通渠道，现做饮品杯没有合适的照片，这两类不在清单里。
