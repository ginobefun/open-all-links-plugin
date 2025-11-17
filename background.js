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

      // 去重处理
      let processedUrls = urls;
      if (settings.removeDuplicates) {
        processedUrls = this.removeDuplicateUrls(urls);
        console.log(`Removed ${urls.length - processedUrls.length} duplicate URLs`);
      }

      // 限制要打开的链接数量
      const urlsToOpen = processedUrls.slice(0, maxTabs);
      const skippedCount = processedUrls.length - urlsToOpen.length;

      console.log(`Opening ${urlsToOpen.length} links, skipped ${skippedCount}`);

      if (openInNewWindow) {
        // 在新窗口中打开链接
        await this.openInNewWindow(urlsToOpen, settings);
      } else {
        // 在新标签页中打开链接
        await this.openInNewTabs(urlsToOpen, tabId, settings);
      }

      // 发送完成通知给content script
      this.sendNotificationToTab(tabId, `成功打开 ${urlsToOpen.length} 个链接${skippedCount > 0 ? `，跳过 ${skippedCount} 个` : ''}`);

    } catch (error) {
      console.error('Error opening links:', error);
      this.sendNotificationToTab(tabId, '打开链接时发生错误');
    }
  }

  // 去重 URL 列表
  removeDuplicateUrls(urls) {
    const uniqueUrls = new Set();
    const result = [];

    for (const url of urls) {
      try {
        // 标准化 URL（移除尾部斜杠、查询参数等）
        const normalized = this.normalizeUrl(url);
        if (!uniqueUrls.has(normalized)) {
          uniqueUrls.add(normalized);
          result.push(url); // 保留原始 URL
        }
      } catch (e) {
        // 如果 URL 解析失败，仍然添加（避免丢失）
        result.push(url);
      }
    }

    return result;
  }

  // 标准化 URL 用于去重比较
  normalizeUrl(urlString) {
    const url = new URL(urlString);
    // 移除尾部斜杠
    let pathname = url.pathname.replace(/\/$/, '');
    // 移除常见的追踪参数
    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'source'];
    paramsToRemove.forEach(param => url.searchParams.delete(param));

    return `${url.origin}${pathname}${url.search}`;
  }

  async openInNewTabs(urls, sourceTabId, settings) {
    const delay = settings.openDelay || 100; // 使用用户设置的延迟时间

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

  async openInNewWindow(urls, settings) {
    try {
      // 创建新窗口并打开第一个链接
      const window = await chrome.windows.create({
        url: urls[0],
        focused: false
      });

      // 在新窗口中打开其余链接
      const remainingUrls = urls.slice(1);
      const delay = settings.openDelay || 100;

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
      await this.openInNewTabs(urls, null, settings);
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
        maxTabs: 20,
        openDelay: 100,           // 打开链接的延迟时间（毫秒）
        removeDuplicates: true,   // 是否去除重复链接
        enableLearning: true      // 是否启用智能学习
      });
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {
        openInNewWindow: false,
        limitTabs: true,
        maxTabs: 20,
        openDelay: 100,
        removeDuplicates: true,
        enableLearning: true
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
      maxTabs: 20,
      openDelay: 100,
      removeDuplicates: true,
      enableLearning: true
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