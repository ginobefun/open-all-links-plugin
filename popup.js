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
    this.loadHistory();
    this.loadFavorites();
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

    document.getElementById('removeDuplicates').addEventListener('change', (e) => {
      this.saveSetting('removeDuplicates', e.target.checked);
    });

    document.getElementById('openDelay').addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      document.getElementById('openDelayValue').textContent = value;
      this.saveSetting('openDelay', value);
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

    // 页面显示规则
    document.getElementById('siteRuleMode').addEventListener('change', (e) => {
      const mode = e.target.value;
      const container = document.getElementById('siteRulesPatternsContainer');
      container.style.display = mode === 'disabled' ? 'none' : 'block';
      const label = document.getElementById('siteRulesLabel');
      label.textContent = mode === 'blacklist'
        ? '在以下页面上不显示（每行一条）:'
        : '仅在以下页面上显示（每行一条）:';
      this.saveSetting('siteRuleMode', mode);
    });

    document.getElementById('saveSiteRules').addEventListener('click', () => {
      const patterns = document.getElementById('siteRulesPatterns').value
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);
      this.saveSetting('siteRulePatterns', patterns);
      this.showNotification('规则已保存', 'success');
    });

    document.getElementById('toggleSiteRulesHelp').addEventListener('click', () => {
      const help = document.getElementById('siteRulesHelp');
      help.style.display = help.style.display === 'none' ? 'block' : 'none';
    });

    // 快捷键自定义
    this.setupShortcutEditing();

    document.getElementById('resetShortcuts').addEventListener('click', () => {
      this.resetShortcuts();
    });

    // 历史记录和收藏
    document.getElementById('viewAllHistory').addEventListener('click', () => {
      this.viewAllHistory();
    });

    document.getElementById('viewAllFavorites').addEventListener('click', () => {
      this.viewAllFavorites();
    });
  }

  async loadSettings() {
    try {
      const settings = await chrome.storage.sync.get({
        openInNewWindow: false,
        limitTabs: true,
        maxTabs: 20,
        openDelay: 100,
        removeDuplicates: true,
        enableLearning: true,
        siteRuleMode: 'disabled',
        siteRulePatterns: []
      });

      document.getElementById('openInNewWindow').checked = settings.openInNewWindow;
      document.getElementById('limitTabs').checked = settings.limitTabs;
      document.getElementById('maxTabs').value = settings.maxTabs;
      document.getElementById('maxTabsValue').textContent = settings.maxTabs;
      document.getElementById('removeDuplicates').checked = settings.removeDuplicates;
      document.getElementById('openDelay').value = settings.openDelay;
      document.getElementById('openDelayValue').textContent = settings.openDelay;
      document.getElementById('enableLearning').checked = settings.enableLearning;

      // 加载页面显示规则
      document.getElementById('siteRuleMode').value = settings.siteRuleMode;
      const container = document.getElementById('siteRulesPatternsContainer');
      container.style.display = settings.siteRuleMode === 'disabled' ? 'none' : 'block';
      if (settings.siteRulePatterns.length > 0) {
        document.getElementById('siteRulesPatterns').value = settings.siteRulePatterns.join('\n');
      }
      const label = document.getElementById('siteRulesLabel');
      label.textContent = settings.siteRuleMode === 'blacklist'
        ? '在以下页面上不显示（每行一条）:'
        : '仅在以下页面上显示（每行一条）:';

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

      // 检查页面显示规则
      if (await this.isPageBlocked(tab.url)) {
        this.showNotification('此页面已被规则排除', 'warning');
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
            files: ['link-classifier.js', 'link-grouper.js', 'content.js']
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

  async isPageBlocked(url) {
    try {
      const settings = await chrome.storage.sync.get({
        siteRuleMode: 'disabled',
        siteRulePatterns: []
      });

      if (settings.siteRuleMode === 'disabled' || settings.siteRulePatterns.length === 0) {
        return false;
      }

      const matches = settings.siteRulePatterns.some(pattern => this.matchUrlPattern(url, pattern));

      if (settings.siteRuleMode === 'blacklist') {
        return matches; // 黑名单模式：匹配 = 被阻止
      } else {
        return !matches; // 白名单模式：不匹配 = 被阻止
      }
    } catch (error) {
      console.error('Failed to check site rules:', error);
      return false;
    }
  }

  matchUrlPattern(url, pattern) {
    try {
      // 将通配符模式转换为正则表达式
      const escaped = pattern
        .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&') // 转义除 * 外的特殊正则字符
        .replace(/\*/g, '.*'); // 将 * 转换为 .*
      // 匹配 URL 去掉协议后的部分
      const urlWithoutProtocol = url.replace(/^https?:\/\//, '');
      const regex = new RegExp('^' + escaped + '$', 'i');
      return regex.test(urlWithoutProtocol);
    } catch (e) {
      console.warn('Invalid URL pattern:', pattern, e);
      return false;
    }
  }

  // ==========================================
  // 快捷键自定义
  // ==========================================

  getDefaultShortcuts() {
    return {
      toggleSelect: { ctrl: true, shift: true, key: 'l' },
      selectAll: { ctrl: true, shift: true, key: 'a' },
      openSelected: { ctrl: true, shift: true, key: 'o' },
      collapsePanel: { ctrl: true, shift: true, key: 'c' },
      smartPreview: { ctrl: true, shift: true, key: 'q' },
      smartOpen: { ctrl: true, shift: true, key: 's' }
    };
  }

  setupShortcutEditing() {
    const editableKeys = document.querySelectorAll('.shortcut-editable');
    editableKeys.forEach(el => {
      el.addEventListener('click', () => {
        this.startRecordingShortcut(el);
      });
    });

    // 加载已保存的快捷键
    this.loadShortcuts();
  }

  async loadShortcuts() {
    try {
      const result = await chrome.storage.sync.get({
        customShortcuts: this.getDefaultShortcuts()
      });
      this.customShortcuts = result.customShortcuts;
      this.renderShortcuts();
    } catch (error) {
      console.error('Failed to load shortcuts:', error);
      this.customShortcuts = this.getDefaultShortcuts();
    }
  }

  renderShortcuts() {
    const editableKeys = document.querySelectorAll('.shortcut-editable');
    editableKeys.forEach(el => {
      const action = el.dataset.action;
      if (this.customShortcuts[action]) {
        el.innerHTML = this.shortcutToKbd(this.customShortcuts[action]);
      }
    });
  }

  shortcutToKbd(shortcut) {
    const parts = [];
    if (shortcut.ctrl) parts.push('<kbd>Ctrl</kbd>');
    if (shortcut.alt) parts.push('<kbd>Alt</kbd>');
    if (shortcut.shift) parts.push('<kbd>Shift</kbd>');
    if (shortcut.key) parts.push(`<kbd>${this.escapeHtml(shortcut.key.toUpperCase())}</kbd>`);
    return parts.join(' + ');
  }

  startRecordingShortcut(el) {
    // 如果已在录制另一个，先取消
    const recording = document.querySelector('.shortcut-editable.recording');
    if (recording && recording !== el) {
      recording.classList.remove('recording');
      this.renderShortcuts();
    }

    el.classList.add('recording');
    el.innerHTML = '<kbd style="color: #ef4444;">按下新的快捷键...</kbd>';

    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // 忽略单独的修饰键
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      // Escape 取消录制
      if (e.key === 'Escape') {
        el.classList.remove('recording');
        el.removeEventListener('keydown', handler);
        this.renderShortcuts();
        return;
      }

      // 必须包含至少一个修饰键
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        return;
      }

      const newShortcut = {
        ctrl: e.ctrlKey || e.metaKey,
        alt: e.altKey,
        shift: e.shiftKey,
        key: e.key.toLowerCase()
      };

      // 检测冲突
      const action = el.dataset.action;
      const conflict = this.findShortcutConflict(action, newShortcut);
      if (conflict) {
        this.showNotification(`快捷键与"${conflict}"冲突`, 'warning');
        el.classList.remove('recording');
        el.removeEventListener('keydown', handler);
        this.renderShortcuts();
        return;
      }

      // 保存新快捷键
      this.customShortcuts[action] = newShortcut;
      this.saveSetting('customShortcuts', this.customShortcuts);

      el.classList.remove('recording');
      el.removeEventListener('keydown', handler);
      this.renderShortcuts();
      this.showNotification('快捷键已更新', 'success');
    };

    el.addEventListener('keydown', handler);
    el.focus();
  }

  findShortcutConflict(currentAction, newShortcut) {
    const actionNames = {
      toggleSelect: '切换选择模式',
      selectAll: '全选链接',
      openSelected: '打开选中链接',
      collapsePanel: '折叠/展开面板',
      smartPreview: '智能预览',
      smartOpen: '智能打开'
    };

    for (const [action, shortcut] of Object.entries(this.customShortcuts)) {
      if (action === currentAction) continue;
      if (shortcut.ctrl === newShortcut.ctrl &&
          shortcut.alt === newShortcut.alt &&
          shortcut.shift === newShortcut.shift &&
          shortcut.key === newShortcut.key) {
        return actionNames[action] || action;
      }
    }
    return null;
  }

  async resetShortcuts() {
    this.customShortcuts = this.getDefaultShortcuts();
    await this.saveSetting('customShortcuts', this.customShortcuts);
    this.renderShortcuts();
    this.showNotification('快捷键已恢复默认', 'success');
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

  showNotification(message, type = 'success') {
    // 创建通知提示
    const notification = document.createElement('div');
    notification.className = 'popup-notification';

    // 图标和颜色映射
    const styles = {
      success: {
        icon: '✓',
        bg: 'linear-gradient(135deg, #10b981, #059669)'
      },
      error: {
        icon: '✕',
        bg: 'linear-gradient(135deg, #ef4444, #dc2626)'
      },
      warning: {
        icon: '⚠',
        bg: 'linear-gradient(135deg, #f59e0b, #d97706)'
      },
      info: {
        icon: 'ℹ',
        bg: 'linear-gradient(135deg, #3b82f6, #2563eb)'
      }
    };

    const style = styles[type] || styles.info;

    notification.innerHTML = `
      <span class="notification-icon">${style.icon}</span>
      <span class="notification-message">${this.escapeHtml(message)}</span>
    `;

    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${style.bg};
      color: white;
      padding: 12px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 10px;
      opacity: 0;
      backdrop-filter: blur(10px);
      max-width: 80%;
    `;

    document.body.appendChild(notification);

    // 淡入动画
    requestAnimationFrame(() => {
      notification.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
      notification.style.opacity = '1';
    });

    // 自动消失
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(-50%) translateY(-10px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 2000);
  }

  async loadHistory() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getHistory',
        limit: 5
      });

      if (response && response.success && response.history) {
        this.displayHistory(response.history);
      } else {
        document.getElementById('historyList').innerHTML = '<div class="empty-state">暂无历史记录</div>';
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      document.getElementById('historyList').innerHTML = '<div class="error-state">加载失败</div>';
    }
  }

  async loadFavorites() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getFavorites'
      });

      if (response && response.success && response.favorites) {
        this.displayFavorites(response.favorites);
      } else {
        document.getElementById('favoritesList').innerHTML = '<div class="empty-state">暂无收藏</div>';
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
      document.getElementById('favoritesList').innerHTML = '<div class="error-state">加载失败</div>';
    }
  }

  displayHistory(history) {
    const container = document.getElementById('historyList');

    if (!history || history.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无历史记录</div>';
      return;
    }

    container.innerHTML = history.map(item => `
      <div class="history-item" data-id="${item.id}">
        <div class="history-header">
          <div class="history-title" title="${this.escapeHtml(item.pageTitle)}">${this.escapeHtml(item.pageTitle)}</div>
          <button class="history-delete" data-id="${item.id}" title="删除">×</button>
        </div>
        <div class="history-meta">
          <span class="history-count">🔗 ${item.linksCount} 个链接</span>
          <span class="history-time">${this.formatTime(item.timestamp)}</span>
        </div>
        ${item.tags && item.tags.length > 0 ? `
          <div class="history-tags">
            ${item.tags.map(tag => `<span class="history-tag">${this.escapeHtml(tag)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');

    // Add click handlers to reopen
    container.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('history-delete')) {
          this.reopenHistory(item.dataset.id);
        }
      });
    });

    // Add delete handlers
    container.querySelectorAll('.history-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        await this.deleteHistoryItem(id);
      });
    });
  }

  displayFavorites(favorites) {
    const container = document.getElementById('favoritesList');

    if (!favorites || favorites.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无收藏</div>';
      return;
    }

    container.innerHTML = favorites.map(fav => `
      <div class="favorite-item" data-id="${fav.id}">
        <div class="favorite-header">
          <div class="favorite-name" title="${this.escapeHtml(fav.name)}">${this.escapeHtml(fav.name)}</div>
          <button class="favorite-delete" data-id="${fav.id}" title="删除">×</button>
        </div>
        <div class="favorite-meta">
          <span class="favorite-count">🔗 ${fav.links.length} 个链接</span>
        </div>
        ${fav.tags && fav.tags.length > 0 ? `
          <div class="favorite-tags">
            ${fav.tags.map(tag => `<span class="favorite-tag">${this.escapeHtml(tag)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');

    // Add click handlers to reopen
    container.querySelectorAll('.favorite-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('favorite-delete')) {
          this.reopenFavorite(item.dataset.id);
        }
      });
    });

    // Add delete handlers
    container.querySelectorAll('.favorite-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (confirm('确定要删除这个收藏吗？')) {
          await this.deleteFavoriteItem(id);
        }
      });
    });
  }

  async reopenHistory(id) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'reopenHistory',
        id: id
      });

      if (response && response.success) {
        this.showNotification(`已打开 ${response.count} 个链接`);
        window.close();
      } else {
        this.showNotification('重新打开失败');
      }
    } catch (error) {
      console.error('Failed to reopen history:', error);
      this.showNotification('操作失败', 'error');
    }
  }

  async reopenFavorite(id) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'reopenFavorite',
        id: id
      });

      if (response && response.success) {
        this.showNotification(`已打开 ${response.count} 个链接`, 'success');
        window.close();
      } else {
        this.showNotification('打开失败', 'error');
      }
    } catch (error) {
      console.error('Failed to reopen favorite:', error);
      this.showNotification('操作失败', 'error');
    }
  }

  async deleteHistoryItem(id) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'deleteHistory',
        id: id
      });

      if (response && response.success) {
        this.showNotification('已删除', 'success');
        this.loadHistory();
      }
    } catch (error) {
      console.error('Failed to delete history:', error);
      this.showNotification('删除失败', 'error');
    }
  }

  async deleteFavoriteItem(id) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'deleteFavorite',
        id: id
      });

      if (response && response.success) {
        this.showNotification('已删除', 'success');
        this.loadFavorites();
      }
    } catch (error) {
      console.error('Failed to delete favorite:', error);
      this.showNotification('删除失败', 'error');
    }
  }

  viewAllHistory() {
    // Open history management page in new tab
    chrome.tabs.create({
      url: chrome.runtime.getURL('history.html')
    });
  }

  viewAllFavorites() {
    // Open favorites management page in new tab
    chrome.tabs.create({
      url: chrome.runtime.getURL('favorites.html')
    });
  }

  formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) {
      return '刚刚';
    } else if (diff < hour) {
      return `${Math.floor(diff / minute)} 分钟前`;
    } else if (diff < day) {
      return `${Math.floor(diff / hour)} 小时前`;
    } else if (diff < 7 * day) {
      return `${Math.floor(diff / day)} 天前`;
    } else {
      const date = new Date(timestamp);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 初始化弹窗管理器
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});