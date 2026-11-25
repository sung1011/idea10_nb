# 工程落地点

纯前端 Vue 3 + Vite + TypeScript，GitHub Pages 发布。无后端、无 Service Worker、无离线缓存、无音效。

## 结构

- `src/logic/makeProblem.ts` 出题：加法 `a+b≤10`，减法 `a≥b`，一轮 10 题不重复，混合必含加减，含 0 题（操作数或答案为 0）每轮最多 1 道
- `src/storage/appStorage.ts` 键 `idea10Nb.v1`，内部 version 2：统计+对局同一 JSON；读 v1 只升统计；损坏或更高版本不覆盖；会话坏则丢会话保统计
- `src/storage/playSnapshot.ts` 校验并规范化可恢复对局
- `src/logic/appVersion.ts` / `src/composables/useAppVersions.ts` 用构建常量 `__APP_VERSION__` 和远端 `versions.json` 比较
- `src/session/appSession.ts` 练习 / 完成 / 设置 / 坐车状态机；坐车动画磁盘快照为已抵达的下一题 idle
- `src/logic/busRoute.ts` / `busMove.ts`：可解 10 题、当站撤回、发车少/多、四类错误方向；正确发车 `leave` 420ms 驶离后换题，再 `enter` 420ms 驶入；第 10 题只驶出；`prefers-reduced-motion` 用 360ms 车灯闪而不位移
- 坐车进度与算术共用 `progressLabel.vue`，文案「第 x / 10 题」；不再用地标路线条
- 390 窄屏车头在车顶右侧（挡风玻璃），车灯在保险杠，轮子压在车身下沿，不占第五列座位、不靠裁切藏车头
- `src/views/` 算术、完成、设置、坐车（儿童主流程无可见操作文字）；设置内页签「题目」「更新」
- `src/components/` 键盘、积木、进度、贴纸、车票、动物脸、巴士、数量帮助、更新框
- 动物 / 巴士 / 路线 / 车票用 Vue+SVG/CSS，与游戏页同一组件
- `src/composables/useInstallPrompt.ts` 缓存 `beforeinstallprompt`，不注册 Service Worker
- `public/manifest.webmanifest` 与 `public/icons/`：添加到主屏幕 / standalone；图标 `purpose` 仅为 `any`
- `yiqisuan-assets/approved-app-icon.jpg` 用户确认的主图标原图；`scripts/makeIcons.sh` 只做高质量缩放转 PNG

## 统计

- 练习次数：完成 10 题进入完成页时 +1
- 首次答对：该题第一次确定就对（可用提示）
- 使用提示：该题第一次展开积木
- 三项都在完成时一次性写入；未完成算术/坐车每次有效操作后自动写入，刷新继续；完成页 `settled`/`accounted` 防重复计次
- 设置页不入库：刷新回到进入设置前的玩法；设置中已改模式则磁盘上新开算术并保留坐车
- 初始化未 hydrate 前不写盘，避免空白快照覆盖有效进度；写失败沿用「写入失败，未保存。」
- 坐车四项（坐车次数 / 独立完成 / 调整次数 / 坐车提示）仅 10 题完成时写入；旧 v1 缺字段当 0
- 独立完成允许发车试错和点动物撤回，只要没点开车顶对照；调整只计发车失败
- 旧 `idea10Nb.v1` 可继续读；ack 在单独键 `idea10Nb.ackedVersion`
- 记录不跨设备；独立窗口与浏览器标签页可能隔离

## 更新

- 每 10 秒 `no-store` 拉 `/idea10_nb/versions.json?t=`
- 远端版本号大于当前构建才提示；不把尚未加载的新版本写成 ack
- 设置按钮右下 popover，内部 sticky「更新」；设置页打开时隐藏
- 「更新」用 `_reload` 时间戳 `location.replace`，不注册 Service Worker
- 练习或坐车中已有进展需二次确认；完成页不误报；取消不 ack

## 桌面 App

- `display: standalone`，`id` / `start_url` / `scope` 均为 `/idea10_nb/`
- 主题色与背景色 `#fff4e4`
- 仍需联网加载；不加离线缓存
- 设置「更新」页未处于独立窗口时显示「安装到桌面」；有系统安装事件才 `prompt()`，否则给平台指引

## 部署

推送到 `main` 后 `.github/workflows/deployPages.yml` 构建 `dist/` 并发布。

线上地址：https://sung1011.github.io/idea10_nb/

Vite `base` 为 `/idea10_nb/`。
