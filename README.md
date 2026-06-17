# 📄 简历工坊 — 在线简历制作工具

一个功能完整的在线简历制作网站，支持多模板切换、实时预览、PDF 导出和本地持久化。

## 功能特色

- **实时预览** — 编辑内容即时反映在右侧简历预览中
- **多模板切换** — 内置 3 套专业简历模板（简约经典、现代清新、专业商务）
- **导出 PDF** — 浏览器打印功能导出为 PDF 文件
- **自动保存** — 内容自动保存到浏览器 localStorage，刷新不丢失
- **头像支持** — 可选添加头像 URL
- **响应式设计** — 桌面和移动端均可使用

## 使用方法

### 方式一：直接打开（最简单）

直接用浏览器打开 `index.html` 文件即可使用。注意：部分浏览器的 `file://` 协议下 localStorage 可能受限，推荐方式二。

### 方式二：使用 HTTP 服务器

```bash
# 使用 Python
cd resume-builder
python -m http.server 8080

# 或使用 Node.js
cd resume-builder
npx serve .
```

然后在浏览器中访问 `http://localhost:8080`。

## 项目结构

```
resume-builder/
├── index.html          # 主页面
├── css/
│   └── style.css       # 编辑器样式和布局
├── js/
│   ├── storage.js      # localStorage 持久化模块
│   ├── templates.js    # 模板系统（3 套模板）
│   └── app.js          # 主应用逻辑
└── README.md           # 本文件
```

## 技术栈

- 原生 JavaScript (ES6+)
- CSS3 (Flexbox, Grid, 渐变, 动画)
- HTML5 (语义化标签)
- 无任何第三方依赖

## 模板

| 模板名称 | 风格 | 特点 |
|---------|------|------|
| 简约经典 | 传统 | 左右分栏、清晰的时间线、进度条技能 |
| 现代清新 | 现代 | 侧边栏设计、紫色渐变主题、圆点标记 |
| 专业商务 | 商务 | 深色顶栏、双列布局、正式稳重 |

## 许可

MIT License
