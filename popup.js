// Open All Links - Popup Script

class PopupManager {
  constructor() {
    this.init();
  }

  init() {
    this.loadSettings();
    this.bindEvents();
    this.updatePageInfo();
    this.updateStats();
  }

  bindEvents() {
    // Quick Actions
    document.getElementById('togglePanel').addEventListener('click', () => {
      this.toggleControlPanel();
    });

    document.getElementById('quickSelectAll').addEventListener('click', () => {
      this.quickSelectAll();
    });

    // Settings
    document.getElementById('openInNewWindow').addEventListener('change', (e) => {
      this.saveSetting('openInNewWindow', e.target.checked);
    });

    document.getElementById('limitTabs').addEventListener('change', (e) => {
      this.saveSetting('limitTabs', e.target.checked);
      this.updateMaxTabsState();
    });

    document.getElementById('maxTabs').addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      document.getElementById('maxTabsValue').textContent = value;
      this.saveSetting('maxTabs', value);
    });

    // Help links
    document.getElementById('helpLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.showHelp();
    });

    document.getElementById('feedbackLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.showFeedback();
    });

    // 智能学习相关设置
    document.getElementById('enableLearning').addEventListener('change', (e) => {
      this.saveSetting('enableLearning', e.target.checked);
    });

    document.getElementById('resetLearning').addEventListener('click', () => {
      this.resetLearningData();
    });
  }

  async loadSettings() {
    try {
      const settings = await chrome.storage.sync.get({
        openInNewWindow: false,
        limitTabs: true,
        maxTabs: 20,
        enableLearning: true
      });

      document.getElementById('openInNewWindow').checked = settings.openInNewWindow;
      document.getElementById('limitTabs').checked = settings.limitTabs;
      document.getElementById('maxTabs').value = settings.maxTabs;
      document.getElementById('maxTabsValue').textContent = settings.maxTabs;
      document.getElementById('enableLearning').checked = settings.enableLearning;

      this.updateMaxTabsState();
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async saveSetting(key, value) {
    try {
      await chrome.storage.sync.set({ [key]: value });
    } catch (error) {
      console.error('Failed to save setting:', error);
    }
  }

  updateMaxTabsState() {
    const limitTabs = document.getElementById('limitTabs').checked;
    const maxTabsInput = document.getElementById('maxTabs');
    const maxTabsValue = document.getElementById('maxTabsValue');
    
    maxTabsInput.disabled = !limitTabs;
    maxTabsValue.style.opacity = limitTabs ? '1' : '0.5';
  }

  async toggleControlPanel() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 调试信息
      console.log('Current tab:', tab);
      console.log('Tab URL:', tab.url);
      console.log('Tab ID:', tab.id);
      
      // 检查是否是受限页面
      if (this.isRestrictedPage(tab.url)) {
        this.showNotification('此页面类型不支持插件功能');
        return;
      }
      
      // 尝试注入脚本（如果需要）
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => { return typeof window.openAllLinksManager !== 'undefined'; }
        });
      } catch (injectionError) {
        console.log('Content script not loaded, trying to inject...');
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['link-classifier.js', 'content.js']
          });
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['content.css']
          });
          // 等待脚本加载
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (scriptError) {
          console.error('Failed to inject scripts:', scriptError);
          this.showNotification('无法在此页面注入插件脚本');
          return;
        }
      }
      
      await chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
      window.close();
    } catch (error) {
      console.error('Failed to toggle control panel:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      this.showNotification(`插件错误: ${error.message}`);
    }
  }

  async quickSelectAll() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { action: 'quickSelectAll' });
      this.showNotification('已选择所有链接');
      setTimeout(() => window.close(), 1000);
    } catch (error) {
      console.error('Failed to quick select all:', error);
      this.showNotification('无法在此页面使用插件');
    }
  }

  async updatePageInfo() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 更新页面标题
      const titleElement = document.getElementById('pageTitle');
      titleElement.textContent = tab.title || '未知页面';
      titleElement.title = tab.title || '';

    } catch (error) {
      console.error('Failed to get page info:', error);
      document.getElementById('pageTitle').textContent = '无法获取页面信息';
    }
  }

  async updateStats() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 发送消息获取统计信息
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStats' });
      
      if (response) {
        document.getElementById('linkCount').textContent = response.totalLinks || 0;
        document.getElementById('selectedCount').textContent = response.selectedLinks || 0;
      }
    } catch (error) {
      console.error('Failed to get stats:', error);
      document.getElementById('linkCount').textContent = '无法获取';
      document.getElementById('selectedCount').textContent = '无法获取';
    }
  }

  showHelp() {
    const helpWindow = window.open('', '_blank', 'width=500,height=600');
    helpWindow.document.write(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <title>Open All Links - 帮助</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            padding: 20px; 
            line-height: 1.6; 
            color: #333;
          }
          h1 { color: #667eea; margin-bottom: 20px; }
          h2 { color: #495057; margin-top: 24px; margin-bottom: 12px; }
          ul, ol { padding-left: 20px; }
          li { margin-bottom: 8px; }
          .tip { 
            background: #e7f3ff; 
            border-left: 4px solid #667eea; 
            padding: 12px; 
            margin: 16px 0; 
          }
        </style>
      </head>
      <body>
        <h1>🔗 Open All Links 使用帮助</h1>
        
        <h2>📖 基本功能</h2>
        <ul>
          <li><strong>智能链接检测</strong>：自动识别页面中的有效链接</li>
          <li><strong>批量选择</strong>：支持单选、多选、全选链接</li>
          <li><strong>批量打开</strong>：一键在新标签页中打开所有选中的链接</li>
          <li><strong>控制面板</strong>：可拖拽的浮动控制界面</li>
        </ul>
        
        <h2>🚀 使用步骤</h2>
        <ol>
          <li>在需要批量打开链接的页面点击插件图标</li>
          <li>点击"切换控制面板"显示页面控制器</li>
          <li>点击"开启选择"激活链接选择模式</li>
          <li>勾选想要打开的链接（或使用"全选"按钮）</li>
          <li>点击"打开选中"批量打开链接</li>
        </ol>
        
        <h2>⚙️ 设置选项</h2>
        <ul>
          <li><strong>在新窗口中打开</strong>：链接将在新窗口而非新标签页中打开</li>
          <li><strong>限制标签页数量</strong>：防止同时打开过多标签页导致浏览器卡顿</li>
          <li><strong>最大标签页数量</strong>：设置同时打开的标签页上限（5-50个）</li>
        </ul>
        
        <div class="tip">
          <strong>💡 使用技巧：</strong><br>
          • 控制面板可以拖拽移动位置<br>
          • 在设置中适当限制标签页数量可以提高浏览器性能<br>
          • 插件会自动过滤无效链接（如锚点、邮箱等）
        </div>
        
        <h2>🔧 故障排除</h2>
        <ul>
          <li>如果控制面板没有显示，请刷新页面后重试</li>
          <li>某些特殊页面可能不支持插件功能</li>
          <li>如果遇到问题，请检查是否已授予必要的权限</li>
        </ul>
      </body>
      </html>
    `);
  }

  isRestrictedPage(url) {
    if (!url) return true;
    
    // Chrome系统页面
    if (url.startsWith('chrome://') || 
        url.startsWith('chrome-extension://') ||
        url.startsWith('edge://') ||
        url.startsWith('moz-extension://')) {
      return true;
    }
    
    // Chrome网上应用店
    if (url.includes('chrome.google.com/webstore')) {
      return true;
    }
    
    // 新标签页
    if (url === 'chrome://newtab/' || url === 'about:blank') {
      return true;
    }
    
    return false;
  }

  showFeedback() {
    // 可以链接到GitHub Issues或反馈表单
    chrome.tabs.create({
      url: 'mailto:feedback@example.com?subject=Open All Links 反馈&body=请描述您遇到的问题或建议：'
    });
  }

  async resetLearningData() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (confirm('确定要重置所有智能学习数据吗？这将清除插件记住的所有网站偏好设置。')) {
        // 发送消息给content script重置数据
        await chrome.tabs.sendMessage(tab.id, { action: 'resetLearningData' });
        
        this.showNotification('学习数据已重置');
      }
    } catch (error) {
      console.error('Failed to reset learning data:', error);
      this.showNotification('重置失败');
    }
  }

  showNotification(message) {
    // 创建简单的通知提示
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #28a745;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      animation: fadeInOut 2s ease-in-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 2000);
  }
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateX(100%); }
    20% { opacity: 1; transform: translateX(0); }
    80% { opacity: 1; transform: translateX(0); }
    100% { opacity: 0; transform: translateX(100%); }
  }
`;
document.head.appendChild(style);

// 初始化弹窗管理器
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});