# AI Role Chat PWA

AI Role Chat PWA 是一款 iPhone Safari 优先的本地优先 AI 角色聊天应用。部署到 HTTPS 后，用户可以在 Safari 中打开，并通过“添加到主屏幕”把它作为接近原生 App 的个人工具使用。

个人数据默认保存在浏览器 IndexedDB 中；AI 请求只走自己的 `/api/chat` 服务端代理。前端不会保存或暴露真实 DeepSeek API Key。

## 技术栈

- React + TypeScript strict mode + Vite
- Tailwind CSS + shadcn 风格本地 UI primitives
- Zustand
- Dexie.js + IndexedDB
- PWA Manifest + Service Worker + Vite PWA Plugin
- Vercel Edge Function / Cloudflare Pages Functions / Cloudflare Worker
- Zod + React Hook Form
- Vitest + ESLint + Prettier
- pnpm

## 本地运行

```bash
pnpm install
pnpm dev -- --host 0.0.0.0
```

如果用手机局域网预览，手机和电脑需要连接同一个 Wi-Fi，然后访问电脑局域网 IP，例如：

```txt
http://192.168.1.5:5173
```

注意：PWA 的完整 Service Worker、安装体验和 iPhone 主屏幕运行体验应在 HTTPS 部署站点上验证。

访问保护依赖 `/api/auth` 服务端接口。普通 `pnpm dev` 只运行 Vite 前端；需要本地完整联调登录和 `/api/chat` 时，请使用 Vercel/Cloudflare 的本地函数开发环境，或直接部署到 HTTPS 后测试。

## 构建输出

```bash
pnpm build
```

构建产物会输出到标准 `dist/` 目录。构建后会生成：

- `dist/index.html`
- `dist/manifest.webmanifest`
- `dist/sw.js`
- `dist/registerSW.js`
- `dist/icons/*`
- `dist/assets/*`

部署平台的 Output Directory 填 `dist`。

## 访问保护

应用有简单访问保护：

- 首次打开需要输入访问密码。
- 访问密码通过服务端环境变量 `APP_PASSWORD` 配置。
- 前端不会暴露 `APP_PASSWORD`。
- 登录成功后，前端只保存服务端签名的访问 token。
- 所有 `/api/chat` 请求都必须带有效 token。
- 未通过访问校验时，服务端不会调用 DeepSeek。
- DeepSeek API Key 只保存在服务端环境变量 `DEEPSEEK_API_KEY`。

必需环境变量：

```bash
APP_PASSWORD=your-private-app-password
DEEPSEEK_API_KEY=sk-...
```

可选环境变量：

```bash
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

`.env` 和 `.env.*` 已加入 `.gitignore`。不要提交真实密码或 API Key。

## 推送到 GitHub

在项目目录初始化 Git 并推送：

```bash
git init
git add .
git commit -m "Initial PWA app"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/YOUR_REPO.git
git push -u origin main
```

如果你已经有 GitHub 仓库，只需要确认 `.env` 没有被提交，然后正常 push。

## 部署到 Vercel

本项目优先支持 Vercel。已提供：

- `api/auth.ts`
- `api/chat.ts`
- `vercel.json`

部署步骤：

1. 将项目推送到 GitHub。
2. 打开 Vercel，选择 `Add New Project`。
3. 导入 GitHub 仓库。
4. Framework Preset 选择 `Vite`。
5. Build Command 填：

```bash
pnpm build
```

6. Output Directory 填：

```txt
dist
```

7. 在 Environment Variables 中添加：

```bash
APP_PASSWORD=你的访问密码
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

8. 点击 Deploy。
9. 部署完成后，访问 Vercel 提供的 HTTPS 域名。

前端默认 API 代理地址是：

```txt
/api/chat
```

登录接口是：

```txt
/api/auth
```

两者在 Vercel 上都是同源 Edge Function。

## Vercel 部署后检查

打开这些地址确认 PWA 资源正常：

```txt
https://your-domain.vercel.app/manifest.webmanifest
https://your-domain.vercel.app/sw.js
https://your-domain.vercel.app/icons/apple-touch-icon.png
```

再打开首页：

```txt
https://your-domain.vercel.app
```

输入 `APP_PASSWORD` 配置的访问密码。登录成功后再进入聊天页。

## iPhone Safari 添加到主屏幕

1. 在 iPhone 上用 Safari 打开你的 HTTPS 部署地址。
2. 输入访问密码进入应用。
3. 点击 Safari 底部分享按钮。
4. 选择“添加到主屏幕”。
5. 名称可保留 `RoleChat`。
6. 从 iPhone 桌面图标打开。

项目已配置：

- `manifest.webmanifest`
- `apple-touch-icon`
- `theme-color`
- `apple-mobile-web-app-capable`
- `apple-mobile-web-app-status-bar-style`
- `viewport-fit=cover`
- `safe-area-inset-top`
- `safe-area-inset-bottom`
- Service Worker 离线缓存基础页面

## 部署到 Cloudflare Pages

项目也提供 Cloudflare Pages Functions：

- `functions/api/auth.ts`
- `functions/api/chat.ts`

Cloudflare Pages 配置：

- Framework preset: `Vite`
- Build command: `pnpm build`
- Build output directory: `dist`
- Root directory: 项目根目录

环境变量：

```bash
APP_PASSWORD=你的访问密码
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

Cloudflare Pages 会将 `functions/api/auth.ts` 和 `functions/api/chat.ts` 部署为同源接口：

```txt
/api/auth
/api/chat
```

## 部署为 Cloudflare Worker

如果你想把 API 代理单独部署为 Worker，项目提供：

```txt
worker/deepseek-proxy.ts
```

该 Worker 支持：

```txt
/api/auth
/api/chat
```

Worker 环境变量同样需要：

```bash
APP_PASSWORD
DEEPSEEK_API_KEY
DEEPSEEK_BASE_URL
```

推荐让 PWA 前端和 Worker 处于同一域名下；如果不是同源，需要在设置页把代理地址改成 Worker 的完整 HTTPS 地址，并确保 `/api/auth` 也能通过同域访问或配置对应登录入口。

## 功能

- AI 角色聊天：流式输出、停止、重新生成、复制、删除、Markdown 消息
- 多角色群聊：speaker_id、手动/轮流/指定回应、当前发言角色约束
- 角色卡管理：新建、编辑、删除、复制、搜索、JSON 导入导出
- 问答式创建角色：每轮 1 到 3 个问题，生成结构化角色卡并用 Zod 校验
- 世界书：关键词触发、启用/禁用、待确认候选、从角色/故事/聊天记录生成
- Prompt 模板：内置单聊、群聊、角色创建、世界书、聊天总结模板
- Prompt Engine：角色卡转 prompt、世界书注入、历史裁剪、变量替换、调试信息
- 本地数据：Dexie/IndexedDB 自动保存
- 导入导出：角色 JSON、会话 Markdown、完整备份 JSON、恢复备份

## 备份和恢复

进入 `设置 -> 数据备份 / 恢复`：

- 点击“备份”生成完整 JSON。
- 将 JSON 保存到你自己的安全位置。
- 恢复时粘贴 JSON，点击“恢复”。
- API Key 不会进入备份，因为真实 Key 不在前端。

## 项目结构

```txt
src/
  app/
  components/
    auth/
    ui/
    layout/
  features/
    chat/
    characters/
    worldbook/
    settings/
  lib/
    auth/
    db/
    llm/
    prompt-engine/
    pwa/
    export/
    validation/
  stores/
  types/
  tests/
api/
  auth.ts
  chat.ts
functions/
  api/
    auth.ts
    chat.ts
server/
  auth.ts
  chat.ts
worker/
  deepseek-proxy.ts
public/
  icons/
  manifest.webmanifest
```

## 常见问题

手机打不开局域网地址：
确认电脑和手机在同一个 Wi-Fi，且 Windows 防火墙允许 Node/Vite 访问专用网络。

添加到主屏幕后还是像网页：
iOS 对 PWA 有缓存，删除主屏幕图标后重新添加。确保用 Safari 打开，不是微信或 iOS Chrome。

登录失败：
确认部署平台设置了 `APP_PASSWORD`，并且重新部署后再测试。

AI 请求失败：
确认已设置 `DEEPSEEK_API_KEY`，并且前端已先通过访问密码登录。

离线能聊天吗：
离线可以打开基础页面、查看本地数据；AI 生成需要网络恢复后继续。

## 已知限制

- 角色向导和世界书候选生成当前是本地 MVP 逻辑；后续可接入 `/api/chat` 走真实 AI 生成。
- 群聊“AI 自动选择下一位发言人”目前是占位策略，后续应加规则评分或小模型选择。
- iOS Safari 的键盘高度事件不可完全控制，当前通过 `100dvh`、安全区和非固定三栏布局降低遮挡。
- shadcn/ui 采用本地 primitives 风格实现，后续可接入官方 CLI 组件库。
- 大量长消息场景可进一步加入虚拟列表优化滚动性能。

## 后续计划

- IndexedDB 增量迁移 v2：角色版本历史、生成日志可视化
- AI 角色创建和世界书生成走 `/api/chat`
- 聊天记录总结和长期记忆压缩
- 群聊自动发言人选择器
- 更完整的离线状态提示和请求重试队列
- iPhone 启动画面图集和更多图标尺寸
