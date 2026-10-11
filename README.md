# 徐帅的个人网站

本仓库是当前 Apple 风格个人网站的独立发布源码，包含已确认的五项实践、五段经历、专业背景与联系方式。

网站只展示新版PMO。顶部“PMO 体系”入口打开 `pmo-system.html` 的完整体系版本：10模块、255节点、30项机制、8个交付关口、19项指标和28份模板。页面复用个人网站同一顶部导航，品牌“徐帅”返回首页，其余菜单进入首页对应位置；阅读说明默认收起。内容采用连续阅读的卡片结构，总览脑图直接定位对应模块卡片，分支及运行记录可以展开，关联模板和角色可以直接定位。页面不设内容切换下拉框或概览数字统计行，仅点击浏览，不提供下载或导出；本地可编辑备份不进入发布目录。旧地址 `pmo.html` 仅跳转到新版。

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

## 访问统计

首页和新版 PMO 使用同一 Umami Cloud 网站配置，按页面分别查看访问与匿名点击。当前 `public/analytics-config.json` 为 `enabled: false`、空 `websiteId`：统计代码已准备，账号连接前不加载外部 tracker、不收集统计。完成 Umami 网站登记后，将公开的网站 UUID 写入 `websiteId`，再将 `enabled` 设为 `true`。不要放入后台 API key、登录信息或其他秘密。统计后台保持私人，不开启公开分享。

脚本通过同源 `site-analytics.js` 加载固定官方 tracker，仅限正式 GitHub Pages 首页及新版 PMO 路径。本地预览、说明页、根短入口和旧 PMO 跳转页不记录。默认自动跟踪关闭，内容页手动发送一次访问，记录导航、案例与经历展开、联系方式点击类型、PMO 模块与详情展开；邮件地址、电话值和正文不会进入自定义事件。

简历投递可使用 `https://xushuaigit.github.io/?ref=r01`，不同投递使用不同编号，在本地另存编号与投递对象的对应表。来源参数仅接受 `utm_source`、`utm_medium`、`utm_campaign`、`utm_content`、`ref`；来源码最多 40 个 ASCII 字母、数字、下划线或连字符，需至少一个字母，并拒绝长数字串。请使用事先指定的编号，勿填姓名、邮箱、手机号或私人标识；字符验证不能判断一个 ASCII 单词是否为姓名。只保留公开锚点与合规来源参数，内部跨页来源在同源 sessionStorage 保留 30 分钟，外部 referrer 只保留站点主机。

来源编号只能说明某个投递链接被访问，不能证明访问者就是对应公司或某个人。匿名统计也会受广告拦截、隐私选择和网络条件影响，不能视为完整访问名册。

`analytics-privacy.html` 提供访客说明和本浏览器退出按钮。尊重 DNT、GPC 和退出设置，存储拒绝访问时停止统计；统计服务故障不影响阅读和导航。`npm run test:analytics` 离线检查上述边界，CI 在部署前执行；`--verify-live-tracker` 仅用于手动 GET 官方脚本兼容性检查，所有发送均在 VM 中拦截。真实账号收数与私人看板仍须接入后验收。
