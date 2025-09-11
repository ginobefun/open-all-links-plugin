# 🔧 Open All Links - 安装与调试指南

## 🚀 安装步骤

### 1. 准备文件
确保以下文件存在：
```
open-all-links/
├── manifest.json
├── content.js
├── content.css
├── link-classifier.js
├── background.js
├── popup.html
├── popup.js
├── popup.css
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── debug.html (测试页面)
```

### 2. 加载扩展
1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `open-all-links` 文件夹
6. 确保扩展显示为"已启用"状态

### 3. 检查权限
在扩展详情页面确认以下权限已授予：
- ✅ 读取和更改您在所有网站上的数据
- ✅ 读取您的浏览历史记录  
- ✅ 存储无限制的客户端数据

## 🧪 测试方法

### 方法1：使用调试页面
1. 启动本地服务器：
   ```bash
   cd /Users/ginozhang/Documents/Github/open-all-links
   python3 -m http.server 8000
   ```

2. 在浏览器中访问：`http://localhost:8000/debug.html`

3. 点击页面上的各种检测按钮：
   - "检测插件状态"
   - "检测内容脚本"  
   - "检测分类器"
   - "分析页面链接"

### 方法2：使用在线网站
1. 访问任意网站（如 https://github.com 或 https://stackoverflow.com）
2. 点击浏览器工具栏中的插件图标
3. 点击"切换控制面板"

### 方法3：检查控制台
1. 按 F12 打开开发者工具
2. 查看 Console 标签页中的错误信息
3. 检查是否有脚本加载失败的错误

## 🐛 常见问题排查

### 问题1：提示"无法在此页面使用插件"

**可能原因：**
- 当前页面是 Chrome 系统页面（chrome://、chrome-extension://）
- 页面是 Chrome 网上应用店
- 页面是空白页面或新标签页

**解决方案：**
- 切换到普通网站（如 https://github.com）
- 使用本地服务器测试：`http://localhost:8000/debug.html`

### 问题2：插件图标点击无反应

**排查步骤：**
1. 检查扩展是否启用：`chrome://extensions/`
2. 查看控制台错误：F12 → Console
3. 重新加载扩展：点击扩展页面的"刷新"按钮
4. 重启浏览器

### 问题3：内容脚本未加载

**排查步骤：**
1. 在页面控制台输入：`typeof window.openAllLinksManager`
2. 如果返回 "undefined"，说明脚本未加载
3. 检查 manifest.json 中的 content_scripts 配置
4. 检查文件路径是否正确

### 问题4：权限不足

**解决方案：**
1. 在 `chrome://extensions/` 中找到插件
2. 点击"详情"
3. 确保"允许访问文件网址"已开启（如测试本地文件）
4. 确保所有网站权限已授予

## 📊 调试信息收集

如果问题仍然存在，请收集以下信息：

### 1. 浏览器信息
- Chrome 版本：`chrome://version/`
- 操作系统版本
- 是否使用了其他安全扩展

### 2. 控制台错误
- 页面控制台错误（F12 → Console）
- 扩展后台脚本错误（`chrome://extensions/` → 插件详情 → "检查视图: Service Worker"）

### 3. 网络状态
- 是否能正常访问 `http://localhost:8000/debug.html`
- 页面 URL 类型（http://、https://、file://）

### 4. 插件状态
访问调试页面后的检测结果：
- 插件是否被检测到
- 内容脚本是否正常工作
- 链接分类器是否可用

## 🔄 完全重装步骤

如果以上方法都不起作用：

1. **完全卸载：**
   - 在 `chrome://extensions/` 中删除扩展
   - 重启 Chrome 浏览器

2. **清理缓存：**
   - 按 Ctrl+Shift+Delete 清理浏览器缓存
   - 或在开发者工具中右键刷新按钮选择"强制刷新并清空缓存"

3. **重新安装：**
   - 按照安装步骤重新加载扩展
   - 确保所有文件权限正确

## 📞 获取帮助

如果问题依然存在，请提供：
1. Chrome 版本信息
2. 完整的控制台错误信息
3. 调试页面的检测结果截图
4. 尝试访问的网站 URL

这些信息将帮助快速定位并解决问题。