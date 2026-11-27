# 工程落地点

纯前端 Vue 3 + Vite + TypeScript，GitHub Pages 发布。无后端、无 Service Worker、无离线缓存、无音效。

## 结构

- `src/logic/makeProblem.ts` 出题：`RANGE_MAX=10` 仍是坐车/跷跷板/盖碗固定上限；`DEFAULT_RANGE=10`、`RANGE_LIMIT=999`；`normalizeRange` 把空/0/非正回 10，小数取最近正整数，超过 999 按 999。加法 `a+b≤N`，减法被减数 `a≤N` 且 `a≥b`。一轮 10 题不重复，混合必含加减，含 0 题每轮最多 1 道。`makeRound` 第四参 `range` 只给普通算式用
- `src/storage/appStorage.ts` 键 `idea10Nb.v1`，内部 version 4：统计+对局同一 JSON；读 v1/v2/v3 升到 4 并保留已有对局；损坏或更高版本不覆盖（给仍在跑的 0.6.10 保护：它按 v3 规则读 v4 会失败且不写回）；坏盖碗/坏跷跷板只丢掉该局，绝不让 parseBus 失败或整份 play 判空；贴纸袋 `stickerBag`/`stickerBagNext` 为可选字段，缺或损坏当空袋，不丢四局。可选 `rangeMax`，缺字段按 10，不升 v5
- `src/storage/playSnapshot.ts` 校验并规范化可恢复对局（含 `seesaw`/`bowl`）；算术 `stickerId`、坐车/跷跷板/盖碗贴纸可选；旧算术 emoji 保留；非法贴纸 ID 忽略，只降级奖励
- `src/logic/stickerPool.ts`：25 个 ID 洗牌袋，发完才重洗；`public/stickers/sticker-*.svg` 独立资源，经 `base` 引用，不内嵌、不进 zip
- `src/logic/appVersion.ts` / `src/composables/useAppVersions.ts` 用构建常量 `__APP_VERSION__` 和远端 `versions.json` 比较
- `src/session/appSession.ts` 练习 / 完成 / 设置 / 坐车 / 跷跷板 / 盖碗状态机；新开算式局才用 `stats.rangeMax`，`setRangeMax` 只写设置不重开当前局；坐车/跷跷板/盖碗 `makeRound()` / 坐车路线仍固定 10 以内，不读这个设置。`switchPlay` 四玩法互切，已完成回对应完成页不新开；坐车动画磁盘快照为已抵达的下一题 idle；跷跷板正确 `level`/`cheer` 快照已到下一题 idle，错误 `hold` 快照为原题 idle；盖碗开场 `bounce`/`cover` 只在内存播放，磁盘永远是已扣好 idle；正确 `cheer` 快照已到下一题 idle 或完成页，错误 `shake` 快照为原题 idle 且输入已清；切走会 flush 开场与对错动画收尾，再切回不重播开场；`prefers-reduced-motion` 跳过跳动与扣碗，直接 idle，对错仍显示静态对勾/箭头并停留同样时长
- `src/logic/playKind.ts` / `src/components/playSwitch.vue`：左上原生 select，选项「➕ 算式 / 🚌 坐车 / ⚖️ 跷跷板 / 🥣 盖碗」，value 仍是 practice/bus/seesaw/bowl；设置页无下拉，仍显示静态「设置」
- `src/logic/seesawProblem.ts` / `seesawMove.ts`：复用 `makeRound`，□=`b`；左盘开题=`a`（存档字段仍叫 `play.right`，idle 原点必须是 a），右盘固定=`answer`；确认后左盘整批 `a±□`；倾角 `(right-left)*7` 夹在 ±28°；正确 `level` 420ms 回平后 `cheer` 1000ms 再下一题，错误停实际倾角 `hold` 800ms 再还原；磁盘快照把 `level`/`cheer` 收成下一题 idle，`hold` 收成原题 idle
- `src/logic/bowlProblem.ts` / `bowlMove.ts`：复用 `makeRound`，□=`b`；加法明盘=`a`、总数=`answer`，减法明盘=`answer`、总数=`a`，碗里永远是 b。内存开场 `bounce` 1000ms 后 `cover` 700ms 整团扣走，结束后才可确认；`intro` 不落盘。选数不揭盖不预演；正确揭盖两边跳 1000ms 后下一题，错误不揭盖晃 800ms 后清空输入；点大数字只朗读总数；旧 v4 无 intro 字段读成已扣好 idle
- `src/logic/busRoute.ts` / `busMove.ts`：可解 10 题、当站撤回、发车少/多、四类错误方向；正确发车 `leave` 420ms 驶离后换题，再 `enter` 420ms 驶入；第 10 题只驶出；`prefers-reduced-motion` 用 360ms 车灯闪而不位移
- 坐车、跷跷板、盖碗进度与算术共用 `progressLabel.vue`，文案「第 x / 10 题」；不再用地标路线条
- 390 窄屏车头在车顶右侧（挡风玻璃），车灯在保险杠，轮子压在车身下沿，不占第五列座位、不靠裁切藏车头
- `src/views/` 算术、完成、设置、坐车、跷跷板、盖碗（儿童主流程少字，靠盘面数量和倾角）；设置内页签「题目」「更新」；题目页「算式范围」数字框 +「以内」，说明只作用于普通算式
- `src/components/` 键盘、积木、进度、贴纸卡、车票、动物脸、巴士、数量帮助、更新框、跷跷板梁与苹果、盖碗笑脸豆子与舞台、玩法下拉；完成页共用 `stickerCard` 显示 25 款 SVG（旧算术完成页可仍显示当时的 emoji）；答对/答错反馈是 CSS/SVG 对勾、星光、重试箭头与轻晃，无新位图，`pointer-events: none`
- 动物 / 巴士 / 路线 / 车票 / 跷跷板用 Vue+SVG/CSS，与游戏页同一组件；完成页再玩为文字或图形按钮，奖励图为独立 SVG 贴纸，无贴纸 PNG
- `src/composables/useInstallPrompt.ts` 缓存 `beforeinstallprompt`，不注册 Service Worker
- `public/manifest.webmanifest` 与 `public/icons/`：添加到主屏幕 / standalone；图标 `purpose` 仅为 `any`
- `yiqisuan-assets/approved-app-icon.jpg` 用户确认的主图标原图；`scripts/makeIcons.sh` 只做高质量缩放转 PNG

## 统计

- 练习次数：完成 10 题进入完成页时 +1
- 首次答对：该题第一次确定就对（可用提示）
- 使用提示：该题第一次展开积木
- 三项都在完成时一次性写入；未完成算术/坐车/跷跷板/盖碗每次有效操作后自动写入，刷新继续；完成页 `settled`/`accounted` 防重复计次
- 贴纸只在 `finishRound` / `finishBus` / `finishSeesaw` / `finishBowl` 从共用袋抽一次并写入；刷新和玩法切回读已存 ID，不重抽；旧坐车/跷跷板完成档缺字段展示默认星星，不消耗袋、不加次数；hydrate 不为补奖额外写盘
- 设置页不入库：刷新回到进入设置前的玩法；设置中已改模式则磁盘上新开算术和盖碗并保留坐车与跷跷板（现有 pendingMode）
- 初始化未 hydrate 前不写盘，避免空白快照覆盖有效进度；写失败沿用「写入失败，未保存。」
- 坐车四项（坐车次数 / 独立完成 / 调整次数 / 坐车提示）仅 10 题完成时写入；旧 v1 缺字段当 0
- 跷跷板三项（跷跷板次数 / 首次答对 / 跷跷板提示）独立统计，不计算术练习次数；旧档缺字段当 0
- 盖碗三项（盖碗次数 / 首次答对 / 盖碗提示）独立统计，完成十题才落盘；旧档缺字段当 0
- 独立完成允许发车试错和点动物撤回，只要没点开车顶对照；调整只计发车失败
- 旧 `idea10Nb.v1` 可继续读；ack 在单独键 `idea10Nb.ackedVersion`
- 记录不跨设备；独立窗口与浏览器标签页可能隔离

## 更新

- 每 10 秒 `no-store` 拉 `/idea10_nb/versions.json?t=`
- 远端版本号大于当前构建才提示；不把尚未加载的新版本写成 ack
- 设置按钮右下 popover，内部 sticky「更新」；设置页打开时隐藏
- 「更新」用 `_reload` 时间戳 `location.replace`，不注册 Service Worker；顶部 popover 与设置页同一 `applyUpdate`，有未完成进度也不再二次确认
- `applyUpdate` 用 `updating` 锁一次刷新，防止连点多次 `location.replace`；刷新前不 ack 远端版本

## 桌面 App

- `display: standalone`，`id` / `start_url` / `scope` 均为 `/idea10_nb/`
- 主题色与背景色 `#fff4e4`
- 仍需联网加载；不加离线缓存
- 设置「更新」页未处于独立窗口时显示「安装到桌面」；有系统安装事件才 `prompt()`，否则给平台指引

## 部署

推送到 `main` 后 `.github/workflows/deployPages.yml` 构建 `dist/` 并发布。

线上地址：https://sung1011.github.io/idea10_nb/

Vite `base` 为 `/idea10_nb/`。
