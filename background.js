// Open All Links - Background Script (Service Worker)

// 导入 HistoryManager（在 Service Worker 中需要通过 importScripts）
importScripts('history-manager.js');

class BackgroundManager {
  constructor() {
    this.historyManager = new HistoryManager();
    this.init();
  }

  init() {
    this.setupMessageListener();
    this.setupInstallHandler();
    this.setupContextMenus();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'openLinks':
          this.handleOpenLinks(message.urls, sender.tab.id, message.pageInfo);
          break;
        case 'getStats':
          this.handleGetStats(sender.tab.id, sendResponse);
          return true; // 保持消息通道开放
        case 'getHistory':
          this.handleGetHistory(message.limit, sendResponse);
          return true;
        case 'getFavorites':
          this.handleGetFavorites(sendResponse);
          return true;
        case 'addFavorite':
          this.handleAddFavorite(message.favorite, sendResponse);
          return true;
        case 'deleteFavorite':
          this.handleDeleteFavorite(message.id, sendResponse);
          return true;
        case 'deleteHistory':
          this.handleDeleteHistory(message.id, sendResponse);
          return true;
        case 'clearHistory':
          this.handleClearHistory(sendResponse);
          return true;
        case 'reopenHistory':
          this.handleReopenHistory(message.id, sender.tab ? sender.tab.id : null, sendResponse);
          return true;
        case 'reopenFavorite':
          this.handleReopenFavorite(message.id, sender.tab ? sender.tab.id : null, sendResponse);
          return true;
        case 'getStatistics':
          this.handleGetStatistics(sendResponse);
          return true;
        case 'getErrorLogs':
          this.getErrorLogs(sendResponse);
          return true;
        case 'clearErrorLogs':
          this.clearErrorLogs(sendResponse);
          return true;
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

  setupContextMenus() {
    // 在安装/启动时创建右键菜单
    chrome.contextMenus.removeAll(() => {
      // 父菜单
      chrome.contextMenus.create({
        id: 'oal-parent',
        title: 'Open All Links',
        contexts: ['page', 'selection', 'link']
      });

      // 页面级操作
      chrome.contextMenus.create({
        id: 'oal-toggle-panel',
        parentId: 'oal-parent',
        title: '切换控制面板',
        contexts: ['page', 'selection', 'link']
      });

      chrome.contextMenus.create({
        id: 'oal-toggle-select',
        parentId: 'oal-parent',
        title: '开启/关闭选择模式',
        contexts: ['page', 'selection', 'link']
      });

      chrome.contextMenus.create({
        id: 'oal-separator-1',
        parentId: 'oal-parent',
        type: 'separator',
        contexts: ['page', 'selection', 'link']
      });

      chrome.contextMenus.create({
        id: 'oal-select-all',
        parentId: 'oal-parent',
        title: '全选页面链接',
        contexts: ['page', 'selection', 'link']
      });

      chrome.contextMenus.create({
        id: 'oal-smart-open',
        parentId: 'oal-parent',
        title: '智能打开推荐链接',
        contexts: ['page', 'selection', 'link']
      });

      chrome.contextMenus.create({
        id: 'oal-open-selected',
        parentId: 'oal-parent',
        title: '打开已选中的链接',
        contexts: ['page', 'selection', 'link']
      });

      chrome.contextMenus.create({
        id: 'oal-separator-2',
        parentId: 'oal-parent',
        type: 'separator',
        contexts: ['selection']
      });

      // 选区专用：打开选区中的所有链接
      chrome.contextMenus.create({
        id: 'oal-open-selection-links',
        parentId: 'oal-parent',
        title: '打开选区中的所有链接',
        contexts: ['selection']
      });
    });

    // 监听右键菜单点击
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenuClick(info, tab);
    });
  }

  async handleContextMenuClick(info, tab) {
    if (!tab || !tab.id) return;

    const tabId = tab.id;

    try {
      switch (info.menuItemId) {
        case 'oal-toggle-panel':
          await chrome.tabs.sendMessage(tabId, { action: 'togglePanel' });
          break;

        case 'oal-toggle-select':
          await chrome.tabs.sendMessage(tabId, { action: 'toggleManualMode' });
          break;

        case 'oal-select-all':
          await chrome.tabs.sendMessage(tabId, { action: 'quickSelectAll' });
          break;

        case 'oal-smart-open':
          await chrome.tabs.sendMessage(tabId, { action: 'smartOpen' });
          break;

        case 'oal-open-selected':
          await chrome.tabs.sendMessage(tabId, { action: 'openSelected' });
          break;

        case 'oal-open-selection-links':
          // 打开选区中的链接 - 需要 content script 从选区中提取链接
          await chrome.tabs.sendMessage(tabId, {
            action: 'openSelectionLinks',
            selectionText: info.selectionText
          });
          break;
      }
    } catch (error) {
      console.error('Context menu action failed:', error);
      // 尝试注入 content script 后重试
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['link-classifier.js', 'link-grouper.js', 'content.js']
        });
        await chrome.scripting.insertCSS({
          target: { tabId },
          files: ['content.css']
        });
        // 等一下再重试
        await this.sleep(200);
        await chrome.tabs.sendMessage(tabId, { action: info.menuItemId.replace('oal-', '') });
      } catch (retryError) {
        console.error('Context menu retry failed:', retryError);
      }
    }
  }

  async handleOpenLinks(urls, tabId, pageInfo = {}) {
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

      // 记录到历史
      if (urlsToOpen.length > 0) {
        await this.historyManager.addHistory({
          url: pageInfo.url || 'unknown',
          pageTitle: pageInfo.title || 'Untitled',
          links: urlsToOpen,
          filterMode: pageInfo.filterMode || 'smart'
        });
      }

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
    const delay = settings.openDelay || 100;
    const maxRetries = 3; // 最大重试次数
    const MAX_RETRY_DELAY = 5000; // 最大重试延迟5秒
    const failedUrls = [];
    const total = urls.length;
    // 生成唯一的操作ID - 防止多个操作的进度条冲突
    const operationId = Date.now() + Math.random();

    // 发送开始进度通知
    if (sourceTabId && total > 5) {
      this.sendProgressUpdate(sourceTabId, 0, total, 'start', operationId);
    }

    for (let i = 0; i < urls.length; i++) {
      let success = false;
      let attempts = 0;

      while (attempts < maxRetries && !success) {
        try {
          await chrome.tabs.create({
            url: urls[i],
            active: false
          });
          success = true;

          // 发送进度更新（每打开一个链接）
          if (sourceTabId && total > 5) {
            this.sendProgressUpdate(sourceTabId, i + 1, total, 'progress', operationId);
          }

          // 添加延迟避免浏览器限制
          if (i < urls.length - 1) {
            await this.sleep(delay);
          }
        } catch (error) {
          attempts++;
          console.error(`Failed to open URL ${urls[i]} (attempt ${attempts}/${maxRetries}):`, error);

          if (attempts < maxRetries) {
            // 指数退避策略，但不超过最大延迟
            const retryDelay = Math.min(delay * Math.pow(2, attempts), MAX_RETRY_DELAY);
            await this.sleep(retryDelay);
          } else {
            // 达到最大重试次数，记录失败的 URL
            failedUrls.push({
              url: urls[i],
              error: error.message
            });
          }
        }
      }
    }

    // 发送完成通知
    if (sourceTabId && total > 5) {
      this.sendProgressUpdate(sourceTabId, total, total, 'complete', operationId);
    }

    // 如果有失败的 URL，显示错误报告
    if (failedUrls.length > 0) {
      this.showErrorReport(failedUrls, sourceTabId);
    }

    return { success: urls.length - failedUrls.length, failed: failedUrls.length };
  }

  async openInNewWindow(urls, settings) {
    const delay = settings.openDelay || 100;
    const maxRetries = 3;
    const failedUrls = [];

    try {
      // 创建新窗口并打开第一个链接
      let windowCreated = false;
      let window = null;
      let attempts = 0;

      while (attempts < maxRetries && !windowCreated) {
        try {
          window = await chrome.windows.create({
            url: urls[0],
            focused: false
          });
          windowCreated = true;
        } catch (error) {
          attempts++;
          console.error(`Failed to create window (attempt ${attempts}/${maxRetries}):`, error);
          if (attempts < maxRetries) {
            await this.sleep(delay * Math.pow(2, attempts));
          } else {
            // 回退到在当前窗口打开
            console.log('Fallback to opening in current window');
            return await this.openInNewTabs(urls, null, settings);
          }
        }
      }

      // 在新窗口中打开其余链接（使用重试逻辑）
      const remainingUrls = urls.slice(1);

      for (let i = 0; i < remainingUrls.length; i++) {
        let success = false;
        let attempts = 0;

        while (attempts < maxRetries && !success) {
          try {
            await chrome.tabs.create({
              url: remainingUrls[i],
              windowId: window.id,
              active: false
            });
            success = true;

            if (i < remainingUrls.length - 1) {
              await this.sleep(delay);
            }
          } catch (error) {
            attempts++;
            console.error(`Failed to open URL ${remainingUrls[i]} (attempt ${attempts}/${maxRetries}):`, error);

            if (attempts < maxRetries) {
              await this.sleep(delay * Math.pow(2, attempts));
            } else {
              failedUrls.push({
                url: remainingUrls[i],
                error: error.message
              });
            }
          }
        }
      }

      if (failedUrls.length > 0) {
        this.showErrorReport(failedUrls, null);
      }

      return { success: urls.length - failedUrls.length, failed: failedUrls.length };
    } catch (error) {
      console.error('Unexpected error in openInNewWindow:', error);
      return await this.openInNewTabs(urls, null, settings);
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

  /**
   * 显示错误报告
   * @param {Array} failedUrls - 失败的 URL 列表
   * @param {number} tabId - 标签页 ID
   */
  async showErrorReport(failedUrls, tabId) {
    console.error('Failed URLs:', failedUrls);

    // 生成错误报告
    const errorReport = {
      timestamp: Date.now(),
      failedCount: failedUrls.length,
      failures: failedUrls
    };

    // 保存错误日志到 storage
    try {
      const result = await chrome.storage.local.get({ errorLogs: [] });
      const errorLogs = result.errorLogs || [];
      errorLogs.unshift(errorReport);

      // 只保留最近 20 条错误日志
      if (errorLogs.length > 20) {
        errorLogs.splice(20);
      }

      await chrome.storage.local.set({ errorLogs });
    } catch (error) {
      console.error('Failed to save error log:', error);
    }

    // 如果有 tabId，发送错误通知
    if (tabId) {
      const message = `${failedUrls.length} 个链接打开失败，请检查错误日志`;
      await this.sendNotificationToTab(tabId, message);
    }
  }

  /**
   * 获取错误日志
   */
  async getErrorLogs(sendResponse) {
    try {
      const result = await chrome.storage.local.get({ errorLogs: [] });
      sendResponse({ success: true, errorLogs: result.errorLogs || [] });
    } catch (error) {
      console.error('Failed to get error logs:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * 清空错误日志
   */
  async clearErrorLogs(sendResponse) {
    try {
      await chrome.storage.local.set({ errorLogs: [] });
      sendResponse({ success: true });
    } catch (error) {
      console.error('Failed to clear error logs:', error);
      sendResponse({ success: false, error: error.message });
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

  // 发送进度更新到 content script
  async sendProgressUpdate(tabId, current, total, status, operationId) {
    // 参数验证
    if (!tabId || tabId < 0) {
      console.warn('Invalid tabId for progress update');
      return;
    }

    try {
      // 检查tab是否存在
      const tab = await chrome.tabs.get(tabId);
      if (!tab) {
        console.warn('Tab not found for progress update');
        return;
      }

      await chrome.tabs.sendMessage(tabId, {
        action: 'progressUpdate',
        operationId: operationId || Date.now(), // 确保有operationId
        data: {
          current,
          total,
          percentage: Math.round((current / total) * 100),
          status
        }
      });
    } catch (error) {
      // Tab可能已关闭或content script未加载 - 这是预期行为
      if (error.message && !error.message.includes('Could not establish connection') &&
          !error.message.includes('No tab with id')) {
        console.error('Unexpected error sending progress update:', error);
      }
      // 静默忽略连接错误
    }
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

  // ==========================================
  // 历史记录和收藏相关处理器
  // ==========================================

  async handleGetHistory(limit, sendResponse) {
    try {
      const history = await this.historyManager.getHistory(limit);
      sendResponse({ success: true, history });
    } catch (error) {
      console.error('Failed to get history:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleGetFavorites(sendResponse) {
    try {
      const favorites = await this.historyManager.getFavorites();
      sendResponse({ success: true, favorites });
    } catch (error) {
      console.error('Failed to get favorites:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleAddFavorite(favorite, sendResponse) {
    try {
      const result = await this.historyManager.addFavorite(favorite);
      sendResponse({ success: !!result, favorite: result });
    } catch (error) {
      console.error('Failed to add favorite:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleDeleteFavorite(id, sendResponse) {
    try {
      const result = await this.historyManager.deleteFavorite(id);
      sendResponse({ success: result });
    } catch (error) {
      console.error('Failed to delete favorite:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleDeleteHistory(id, sendResponse) {
    try {
      const result = await this.historyManager.deleteHistory(id);
      sendResponse({ success: result });
    } catch (error) {
      console.error('Failed to delete history:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleClearHistory(sendResponse) {
    try {
      const result = await this.historyManager.clearHistory();
      sendResponse({ success: result });
    } catch (error) {
      console.error('Failed to clear history:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleReopenHistory(id, tabId, sendResponse) {
    try {
      const historyItem = await this.historyManager.getHistoryById(id);
      if (!historyItem) {
        sendResponse({ success: false, error: 'History item not found' });
        return;
      }

      // 重新打开历史记录中的链接
      await this.handleOpenLinks(historyItem.links, tabId, {
        url: historyItem.url,
        title: historyItem.pageTitle,
        filterMode: historyItem.filterMode
      });

      sendResponse({ success: true, count: historyItem.links.length });
    } catch (error) {
      console.error('Failed to reopen history:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleReopenFavorite(id, tabId, sendResponse) {
    try {
      const favorites = await this.historyManager.getFavorites();
      const favoriteItem = favorites.find(item => item.id === id);
      if (!favoriteItem) {
        sendResponse({ success: false, error: 'Favorite item not found' });
        return;
      }

      await this.handleOpenLinks(favoriteItem.links, tabId, {
        url: favoriteItem.url,
        title: favoriteItem.pageTitle || favoriteItem.name,
        filterMode: favoriteItem.filterMode
      });

      sendResponse({ success: true, count: favoriteItem.links.length });
    } catch (error) {
      console.error('Failed to reopen favorite:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleGetStatistics(sendResponse) {
    try {
      const stats = await this.historyManager.getStatistics();
      sendResponse({ success: true, statistics: stats });
    } catch (error) {
      console.error('Failed to get statistics:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
}

// 初始化背景脚本管理器
const backgroundManager = new BackgroundManager();

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