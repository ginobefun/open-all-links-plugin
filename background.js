// Open All Links - Background Script (Service Worker)

class BackgroundManager {
  constructor() {
    this.init();
  }

  init() {
    this.setupMessageListener();
    this.setupInstallHandler();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'openLinks':
          this.handleOpenLinks(message.urls, sender.tab.id);
          break;
        case 'getStats':
          this.handleGetStats(sender.tab.id, sendResponse);
          return true; // 保持消息通道开放
        default:
          break;
      }
    });
  }

  setupInstallHandler() {
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.handleInstall();
      } else if (details.reason === 'update') {
        this.handleUpdate(details.previousVersion);
      }
    });
  }

  async handleOpenLinks(urls, tabId) {
    if (!urls || urls.length === 0) {
      console.warn('No URLs provided for opening');
      return;
    }

    try {
      // 获取用户设置
      const settings = await this.getSettings();
      const maxTabs = settings.limitTabs ? settings.maxTabs : urls.length;
      const openInNewWindow = settings.openInNewWindow;

      // 限制要打开的链接数量
      const urlsToOpen = urls.slice(0, maxTabs);
      const skippedCount = urls.length - urlsToOpen.length;

      console.log(`Opening ${urlsToOpen.length} links, skipped ${skippedCount}`);

      if (openInNewWindow) {
        // 在新窗口中打开链接
        await this.openInNewWindow(urlsToOpen);
      } else {
        // 在新标签页中打开链接
        await this.openInNewTabs(urlsToOpen, tabId);
      }

      // 发送完成通知给content script
      this.sendNotificationToTab(tabId, `成功打开 ${urlsToOpen.length} 个链接${skippedCount > 0 ? `，跳过 ${skippedCount} 个` : ''}`);

    } catch (error) {
      console.error('Error opening links:', error);
      this.sendNotificationToTab(tabId, '打开链接时发生错误');
    }
  }

  async openInNewTabs(urls, sourceTabId) {
    const delay = 100; // 延迟100ms避免过快创建标签页
    
    for (let i = 0; i < urls.length; i++) {
      try {
        await chrome.tabs.create({
          url: urls[i],
          active: false // 在后台打开
        });
        
        // 添加延迟避免浏览器限制
        if (i < urls.length - 1) {
          await this.sleep(delay);
        }
      } catch (error) {
        console.error(`Failed to open URL ${urls[i]}:`, error);
      }
    }
  }

  async openInNewWindow(urls) {
    try {
      // 创建新窗口并打开第一个链接
      const window = await chrome.windows.create({
        url: urls[0],
        focused: false
      });

      // 在新窗口中打开其余链接
      const remainingUrls = urls.slice(1);
      const delay = 100;

      for (let i = 0; i < remainingUrls.length; i++) {
        try {
          await chrome.tabs.create({
            url: remainingUrls[i],
            windowId: window.id,
            active: false
          });

          if (i < remainingUrls.length - 1) {
            await this.sleep(delay);
          }
        } catch (error) {
          console.error(`Failed to open URL ${remainingUrls[i]}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to create new window:', error);
      // 回退到在当前窗口打开
      await this.openInNewTabs(urls);
    }
  }

  async sendNotificationToTab(tabId, message) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: 'showNotification',
        message: message
      });
    } catch (error) {
      console.error('Failed to send notification to tab:', error);
    }
  }

  async getSettings() {
    try {
      return await chrome.storage.sync.get({
        openInNewWindow: false,
        limitTabs: true,
        maxTabs: 20
      });
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {
        openInNewWindow: false,
        limitTabs: true,
        maxTabs: 20
      };
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  handleInstall() {
    console.log('Open All Links extension installed');
    
    // 设置默认设置
    chrome.storage.sync.set({
      openInNewWindow: false,
      limitTabs: true,
      maxTabs: 20
    });

    // 可以选择性地打开欢迎页面
    // chrome.tabs.create({ url: 'welcome.html' });
  }

  handleUpdate(previousVersion) {
    console.log(`Open All Links extension updated from ${previousVersion}`);
    
    // 处理版本更新逻辑
    // 例如：迁移旧设置、清理缓存等
  }

  // 处理来自popup的统计信息请求
  async handleGetStats(tabId, sendResponse) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'getStats' });
      sendResponse(response);
    } catch (error) {
      console.error('Failed to get stats from content script:', error);
      sendResponse({ totalLinks: 0, selectedLinks: 0 });
    }
  }
}

// 初始化背景脚本管理器
const backgroundManager = new BackgroundManager();

// 处理扩展图标点击事件（可选）
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // 发送消息给content script切换控制面板
    await chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
  } catch (error) {
    console.error('Failed to toggle panel via icon click:', error);
    // 如果content script未加载，可以注入脚本
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      // 再次尝试发送消息
      await chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
    } catch (injectionError) {
      console.error('Failed to inject content script:', injectionError);
    }
  }
});

// 处理标签页更新事件
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 页面加载完成，可以进行一些初始化操作
    // 例如：检查页面是否支持插件功能
  }
});

// 处理扩展卸载事件
chrome.runtime.onSuspend.addListener(() => {
  console.log('Open All Links extension is being suspended');
  // 清理资源
});