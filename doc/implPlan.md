# 工程落地点

纯前端 Vue 3 + Vite + TypeScript，GitHub Pages 发布。无后端、无 PWA、无音效。

## 结构

- `src/logic/makeProblem.ts` 出题：加法 `a+b≤10`，减法 `a≥b`，含 0，一轮 5 题不重复，混合必含加减
- `src/storage/appStorage.ts` 键 `idea10Nb.v1`；损坏不覆盖；写失败不假报
- `src/session/appSession.ts` 练习 / 完成 / 设置状态机
- `src/views/` 三视图；`src/components/` 键盘、积木、贴纸

## 统计

- 练习次数：完成 5 题进入完成页时 +1
- 首次答对：该题第一次确定就对（可用提示）
- 使用提示：该题第一次展开积木
- 三项都在完成时一次性写入；刷新中途轮次作废并重开新轮

## 部署

推送到 `main` 后 `.github/workflows/deployPages.yml` 构建 `dist/` 并发布。

线上地址：https://sung1011.github.io/idea10_nb/

Vite `base` 为 `/idea10_nb/`。
