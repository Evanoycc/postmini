# PostMini

> 一个基于 Tauri、React、TypeScript 和 Rust 构建的轻量级 Windows 桌面 API 调试工具。

PostMini 面向日常接口调试场景，目标不是做成一个臃肿的平台，而是做成一个打开就能用、发送就有结果、适合长期本地使用的小而快的桌面工具。

它专注一件事：

让 HTTP 调试更直接、更轻、更本地化。

## 为什么做 PostMini

很多接口工具都会落在下面几类里：

- 基于浏览器，受 Web 环境限制
- 功能很多，但体积和学习成本都偏大
- 更适合团队协作，但拿来做本地快速调试又显得太重

PostMini 选择的是另一条路：

- 桌面优先：它是一个真正的 Windows 应用，不是浏览器里的 localhost 页面
- 小而直接：打开、发请求、看结果，不绕路
- 本地优先：接口分组、环境变量、调试内容默认都保存在本机
- Rust 发请求：请求从原生层发送，更适合桌面工具的稳定性和能力边界

## 项目特点

- 基于 Tauri 的原生感 Windows 桌面应用
- 支持 `GET`、`POST`、`PUT`、`DELETE`
- 支持 `JSON` 请求体编辑
- 支持 `form-data` 和文件上传
- 大响应内容可直接保存到本地文件
- 支持接口分组与树形组织
- 支持多标签页并行调试
- 支持环境变量模板，例如 `{{base_url}}`
- 支持浅色 / 深色主题
- 支持接口分组导入 / 导出 JSON
- 支持中英文界面切换

## 适合谁

- 需要频繁调试内部接口的后端开发者
- 联调阶段需要快速验证接口的前端开发者
- 想找一个更轻量 Postman 替代方案的个人开发者
- 更喜欢独立 `.exe` 工作流的 Windows 用户

## 当前界面结构

- 左侧：接口分组树与已保存接口
- 顶部：请求标签页切换
- 中间上方：请求编辑区
- 中间下方：响应预览区

请求编辑区目前已经拆成更适合调试的几个分栏：

- `Headers`
- `Params`
- `Authorization`
- `Body`

## 核心能力

### 1. 接口分组与树形组织

你可以按项目、模块、环境或业务域对接口进行分组，并且支持子分组。对经常要反复调试的一组接口来说，这比临时复制粘贴 URL 更高效。

### 2. 原生层发起 HTTP 请求

PostMini 不是依赖浏览器网络行为来调接口，而是通过 Rust 原生层发送请求。对于桌面 API 工具来说，这种方式更直接，也更适合做文件上传、响应落盘等能力。

### 3. 大响应与文件下载

如果返回内容很大，或者你本来就是在下载文件，可以把响应直接保存到本地路径，而不是强行塞进预览框里。

### 4. 本地化接口集合

接口分组可以导出为 JSON，也可以重新导入，适合这些场景：

- 多台电脑之间迁移接口集合
- 和同事共享一小组接口配置
- 做轻量级本地备份

### 5. 更适合日常调试的响应区

响应区支持：

- 固定大小预览框
- JSON / XML 自动格式化
- 左侧行号显示
- 请求错误展示
- `4xx / 5xx` 业务错误响应提示

## 技术栈

- 前端：React 19 + TypeScript + Vite
- 桌面壳：Tauri 2
- 原生层：Rust
- HTTP 引擎：`reqwest`

## 项目结构

```text
src/
  components/    界面组件
  store/         本地状态管理
  utils/         Tauri 调用封装、模板处理、存储工具
  App.tsx        主应用壳

src-tauri/
  src/lib.rs     Rust 命令、HTTP 请求、文件保存
  tauri.conf.json
```

## 开发环境

### 依赖要求

在 Windows 上开发这个项目，通常需要：

- Node.js
- Rust
- Tauri 相关前置依赖
- WebView2 Runtime

官方文档：

- [Tauri Prerequisites](https://tauri.app/start/prerequisites/)

### 开发模式运行

```bash
npm install
npm run tauri dev
```

## 构建

```bash
npm run tauri build
```

默认生成的主要可执行文件位置：

```text
src-tauri/target/release/postmini.exe
```

当前仓库里的 `src-tauri/tauri.conf.json` 将 `bundle.active` 设置为了 `false`，因此现在更偏向直接产出可执行文件，而不是安装包。

## 打包说明

如果后续要发布 MSI 或 NSIS 安装包，可以重新开启 `src-tauri/tauri.conf.json` 里的 bundling 配置，并参考 Tauri 官方的 Windows 分发文档：

- [Tauri Windows Distribution](https://v2.tauri.app/distribute/windows/)

## 设计理念

PostMini 不打算变成一个巨型 API 平台。

它希望保持这些特质：

- 打开快
- 学习成本低
- 日常调试顺手
- 足够轻，足够容易维护

## 后续可以继续完善的方向

- 请求复制
- 分组内拖拽排序
- 响应头单独面板
- 更完整的成功 / 失败通知
- 安装包构建与发布

## 截图

发布到 GitHub 后，你可以在这里补截图：

```md
<img width="2560" height="1384" alt="image" src="https://github.com/user-attachments/assets/4a2533e9-8cb4-410b-8344-e8b76e90456b" />

![接口分组](./docs/screenshot-groups.png)
```

## License

你可以根据准备公开发布的方式选择许可证，例如：

- MIT
- Apache-2.0
- GPL-3.0

如果你愿意，我下一步也可以继续帮你补：

- `LICENSE`
- GitHub 仓库简介
- 首个版本发布文案
- 中英 README 互相链接
