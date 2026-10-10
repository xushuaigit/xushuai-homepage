# 徐帅的个人网站

本仓库是当前 Apple 风格个人网站的独立发布源码，包含已确认的五项实践、五段经历、专业背景与联系方式。

网站只展示新版PMO。顶部“PMO 体系”入口打开 `pmo-system.html` 的完整体系版本：10模块、255节点、30项机制、8个交付关口、19项指标和28份模板。页面提供可编辑XMind及完整备份包下载，备份包包含HTML、结构JSON、Markdown大纲和XMind。旧地址 `pmo.html` 仅跳转到新版，不再展示旧脑图。

完整体系为设计方案、待试运行；公开副本保留规则、适用条件和依据类型，原始引用、本机路径和内部来源索引不进入本仓库。

页面按“治理基础 → 流程与敏捷 → 协同与交付 → AI 业务落地”组织实践。各案例保留自己的企业与事实边界。经历使用浏览器原生折叠面板，导航使用页内锚点。

## 本地运行

需要 Node.js 22.13 或更新版本。依赖版本由 `package-lock.json` 固定。

```sh
npm ci
npm run dev
npm run typecheck
npm run build
```

`npm run build` 使用 Vinext 的 `output: 'export'` 生成静态网站，并自动运行产物检查。发布目录是 `dist/client`。检查覆盖完整正文、五项唯一案例、四层实践主线、五段经历、页内锚点、字体与 favicon 的路径、404 页面，以及无其他 Demo 路由。

## GitHub Pages

目标地址为 `https://xushuaigit.github.io/xushuai-homepage/`。仓库 Settings → Pages 的发布来源设为 GitHub Actions；推送到 `main` 或手动运行 Pages workflow 后，Actions 安装依赖、构建、检查并部署 `dist/client`。

默认 `PAGES_BASE_PATH` 为 `/xushuai-homepage`。workflow 使用 `configure-pages` 返回的 `base_path`，使资源前缀与实际 Pages 地址一致。若使用账户主页，构建时将 `PAGES_BASE_PATH` 设为空字符串。

构建时路由 `basePath` 固定为空：Vinext 1.0.0-beta.5 的静态预渲染在根路径请求首页，非空路由前缀会使该请求返回 404。资源使用绝对 `assetPrefix`（`https://xushuaigit.github.io` 加 `PAGES_BASE_PATH`），让 CSS、脚本与字体的公网 URL 带仓库前缀，同时让磁盘资源留在产物根下，避免出现两层仓库目录。favicon 使用同一部署前缀。

产物检查只接受 `https://xushuaigit.github.io` 同源资源，并根据部署前缀映射到实际静态文件。若改用自定义域名，需要同时调整资源来源配置与检查规则，并重新验证产物。

GitHub Pages 的静态导出机制参考 [Vinext 官方示例](https://github.com/cloudflare/vinext/blob/main/examples/static-export/README.md) 和 [GitHub 官方自定义 workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 内容与样式

- `lib/apple-homepage.ts`：本页面实际展示的资料与实践层级。
- `app/page.tsx`：单页结构、文字排版与页内导航。
- `app/apple.module.css`：Apple 页面样式及手机布局。
- `app/globals.css`：页面所需的浏览器默认样式重置。
- `app/assets/apple-demo-sans.woff2`：本地字体子集，由 Vite 输出带哈希的静态资源。
- `public/fonts/OFL.txt`：字体的 SIL Open Font License 1.1。
- `public/pmo-system.html`：新版完整PMO体系，数据、样式和脚本内嵌。
- `public/pmo.html`：旧链接的跳转入口，统一进入新版。

更新个人资料时保留数字的观察期、工作日及职责限定；顾问客户继续匿名。字体使用已经生成并验证的 WOFF2，构建不读取本机系统字体。

此发布源码独立于本地其他网站版本，构建不引用父目录文件。

更新脑图时替换公开 HTML，并核对内容日期、节点状态和返回主页链接。保留实践、规则、目标、归纳和待补的口径；示意数字不能写成实测成绩。不要加入本地材料路径或内部来源索引。构建会检查脑图节点完整性、公开链接及这些发布边界；推送到 `main` 后与首页一起重新部署。
