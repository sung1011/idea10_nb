# 工程落地点

纯前端 Vue 3 + Vite + TypeScript，GitHub Pages 发布。无后端、无 PWA、无音效。

## 结构

- `src/logic/makeProblem.ts` 出题：加法 `a+b≤10`，减法 `a≥b`，一轮 10 题不重复，混合必含加减，含 0 题（操作数或答案为 0）每轮最多 1 道
- `src/storage/appStorage.ts` 键 `idea10Nb.v1`；损坏不覆盖；写失败不假报
- `src/logic/appVersion.ts` / `src/composables/useAppVersions.ts` 用构建常量 `__APP_VERSION__` 和远端 `versions.json` 比较
- `src/session/appSession.ts` 练习 / 完成 / 设置状态机
- `src/views/` 三视图；`src/components/` 键盘、积木、贴纸、更新框

## 统计

- 练习次数：完成 10 题进入完成页时 +1
- 首次答对：该题第一次确定就对（可用提示）
- 使用提示：该题第一次展开积木
- 三项都在完成时一次性写入；刷新中途轮次作废并重开新轮
- 旧 `idea10Nb.v1` 可继续读；ack 在单独键 `idea10Nb.ackedVersion`

## 更新

- 每 10 秒 `no-store` 拉 `/idea10_nb/versions.json?t=`
- 远端版本号大于当前构建才提示；不把尚未加载的新版本写成 ack
- 设置按钮右下 popover，内部 sticky「更新」；设置页打开时隐藏
- 「更新」用 `_reload` 时间戳 `location.replace`，不注册 Service Worker
- 练习中已有进展需二次确认；取消不 ack

## 部署

推送到 `main` 后 `.github/workflows/deployPages.yml` 构建 `dist/` 并发布。

线上地址：https://sung1011.github.io/idea10_nb/

Vite `base` 为 `/idea10_nb/`。
