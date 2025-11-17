// Open All Links - Content Script
class OpenAllLinksManager {
  constructor() {
    this.selectedLinks = new Set();
    this.controlPanel = null;
    this.isActive = false;
    this.linkCheckboxes = new Map();
    this.classifier = new LinkClassifier();
    this.filterMode = 'smart'; // 'all', 'smart', 'content', 'navigation'
    this.userPreferences = {};
    this.isPanelCollapsed = true; // 默认折叠状态
    this.isPanelPinned = false; // 默认未固定
    this.init();
  }

  init() {
    this.loadUserPreferences();
    this.createControlPanel();
    this.listenForMessages();
  }

  createControlPanel() {
    this.controlPanel = document.createElement('div');
    this.controlPanel.id = 'open-all-links-panel';
    this.controlPanel.className = 'oal-collapsed'; // 默认折叠状态
    this.controlPanel.innerHTML = `
      <div class="oal-header">
        <div class="oal-header-left">
          <span class="oal-logo">🔗</span>
          <span class="oal-title">Open All Links</span>
          <span class="oal-quick-stats">
            <span class="oal-found-count">0</span> | 
            <span class="oal-selected-count">0</span>
          </span>
        </div>
        <div class="oal-header-controls">
          <button class="oal-collapse-btn" title="展开/折叠面板">
            <span class="oal-collapse-icon">▼</span>
          </button>
          <button class="oal-pin-btn" title="固定/取消固定">
            <span class="oal-pin-icon">📌</span>
          </button>
          <button class="oal-close" title="关闭面板">×</button>
        </div>
      </div>
      <div class="oal-body">
        <div class="oal-quick-actions">
          <button class="oal-btn oal-quick-toggle" title="快速开始选择">
            <span class="oal-btn-icon">⚡</span>
            <span class="oal-btn-text">开启选择</span>
          </button>
          <button class="oal-btn oal-quick-open" title="智能打开推荐链接" disabled>
            <span class="oal-btn-icon">🚀</span>
            <span class="oal-btn-text">智能打开</span>
          </button>
        </div>
        
        <div class="oal-controls">
          <div class="oal-filter-section">
            <label class="oal-filter-label">过滤模式:</label>
            <select class="oal-filter-select" title="选择要显示的链接类型">
              <option value="smart">🎯 智能推荐</option>
              <option value="content">📄 内容链接</option>
              <option value="all">🌐 所有链接</option>
              <option value="navigation">🧭 导航链接</option>
            </select>
          </div>
          
          <div class="oal-action-buttons">
            <button class="oal-btn oal-select-all" title="选择所有链接" disabled>
              <span class="oal-btn-icon">✅</span>
              全选
            </button>
            <button class="oal-btn oal-deselect-all" title="取消所有选择" disabled>
              <span class="oal-btn-icon">❌</span>
              取消
            </button>
            <button class="oal-btn oal-open-selected oal-primary" title="打开选中的链接" disabled>
              <span class="oal-btn-icon">🔗</span>
              打开选中 (<span class="oal-count">0</span>)
            </button>
          </div>
        </div>
        
        <div class="oal-stats">
          <div class="oal-stats-row">
            <span class="oal-stats-label">发现链接:</span>
            <span class="oal-stats-value"><span class="oal-total-links">0</span> 个</span>
          </div>
          <div class="oal-stats-row">
            <span class="oal-stats-label">已选择:</span>
            <span class="oal-stats-value"><span class="oal-selected-links">0</span> 个</span>
          </div>
          <div class="oal-stats-row">
            <span class="oal-stats-label">过滤模式:</span>
            <span class="oal-stats-value" id="oal-current-mode">智能推荐</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.controlPanel);
    this.bindControlEvents();
    
    // 设置默认的过滤模式
    const filterSelect = this.controlPanel.querySelector('.oal-filter-select');
    filterSelect.value = this.filterMode;
    filterSelect.disabled = true; // 初始状态下禁用
  }

  bindControlEvents() {
    // 主要功能按钮
    const quickToggleBtn = this.controlPanel.querySelector('.oal-quick-toggle');
    const quickOpenBtn = this.controlPanel.querySelector('.oal-quick-open');
    const selectAllBtn = this.controlPanel.querySelector('.oal-select-all');
    const deselectAllBtn = this.controlPanel.querySelector('.oal-deselect-all');
    const openSelectedBtn = this.controlPanel.querySelector('.oal-open-selected');
    const filterSelect = this.controlPanel.querySelector('.oal-filter-select');
    
    // 面板控制按钮
    const collapseBtn = this.controlPanel.querySelector('.oal-collapse-btn');
    const pinBtn = this.controlPanel.querySelector('.oal-pin-btn');
    const closeBtn = this.controlPanel.querySelector('.oal-close');

    // 绑定功能事件
    quickToggleBtn.addEventListener('click', () => this.toggleSelectionMode());
    quickOpenBtn.addEventListener('click', () => this.quickOpenRecommended());
    selectAllBtn.addEventListener('click', () => this.selectAllLinks());
    deselectAllBtn.addEventListener('click', () => this.deselectAllLinks());
    openSelectedBtn.addEventListener('click', () => this.openSelectedLinks());
    filterSelect.addEventListener('change', (e) => this.changeFilterMode(e.target.value));

    // 绑定面板控制事件
    collapseBtn.addEventListener('click', () => this.togglePanelCollapse());
    pinBtn.addEventListener('click', () => this.togglePanelPin());
    closeBtn.addEventListener('click', () => this.hideControlPanel());

    // 添加键盘快捷键支持
    this.addKeyboardShortcuts();

    // 使面板可拖拽（仅在未固定时）
    this.makeDraggable();
  }

  makeDraggable() {
    const header = this.controlPanel.querySelector('.oal-header');
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.controlPanel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    const onMouseMove = (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      this.controlPanel.style.left = (startLeft + deltaX) + 'px';
      this.controlPanel.style.top = (startTop + deltaY) + 'px';
    };

    const onMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }

  changeFilterMode(newMode) {
    this.filterMode = newMode;
    
    // 如果当前处于活动状态，重新应用过滤
    if (this.isActive) {
      this.removeLinkCheckboxes();
      this.addLinkCheckboxes();
    }
    
    // 保存用户偏好
    this.saveUserPreference('filterMode', newMode);
    
    // 更新UI显示
    const modeNames = {
      'smart': '🎯 智能推荐',
      'content': '📄 内容链接',
      'all': '🌐 所有链接',
      'navigation': '🧭 导航链接'
    };
    
    const currentModeElement = this.controlPanel.querySelector('#oal-current-mode');
    if (currentModeElement) {
      currentModeElement.textContent = modeNames[newMode] || '智能推荐';
    }
    
    this.showNotification(`已切换到: ${modeNames[newMode]}`);
  }

  // 切换面板折叠状态
  togglePanelCollapse() {
    this.isPanelCollapsed = !this.isPanelCollapsed;
    const collapseIcon = this.controlPanel.querySelector('.oal-collapse-icon');
    
    if (this.isPanelCollapsed) {
      this.controlPanel.classList.add('oal-collapsed');
      collapseIcon.textContent = '▼';
    } else {
      this.controlPanel.classList.remove('oal-collapsed');
      collapseIcon.textContent = '▲';
    }
    
    // 保存用户偏好
    this.saveUserPreference('panelCollapsed', this.isPanelCollapsed);
  }

  // 切换面板固定状态
  togglePanelPin() {
    this.isPanelPinned = !this.isPanelPinned;
    const pinIcon = this.controlPanel.querySelector('.oal-pin-icon');
    
    if (this.isPanelPinned) {
      this.controlPanel.classList.add('oal-pinned');
      pinIcon.textContent = '📌';
      this.showNotification('面板已固定');
    } else {
      this.controlPanel.classList.remove('oal-pinned');
      pinIcon.textContent = '📍';
      this.showNotification('面板已取消固定');
    }
    
    // 保存用户偏好
    this.saveUserPreference('panelPinned', this.isPanelPinned);
  }

  // 快速打开推荐链接
  quickOpenRecommended() {
    if (!this.isActive) {
      // 如果未激活，先激活选择模式
      this.toggleSelectionMode();
    }
    
    // 获取智能推荐的链接
    const recommendedLinks = this.classifier.getRecommendedLinks(
      Array.from(document.querySelectorAll('a[href]')).filter(link => this.isValidLink(link))
    );
    
    if (recommendedLinks.length === 0) {
      this.showNotification('未找到推荐的链接');
      return;
    }
    
    // 自动选择推荐链接
    recommendedLinks.forEach(link => {
      this.selectedLinks.add(link);
      const checkbox = this.linkCheckboxes.get(link);
      if (checkbox) {
        checkbox.checked = true;
      }
    });
    
    this.updateUI();
    
    // 询问是否立即打开
    if (confirm(`找到 ${recommendedLinks.length} 个推荐链接，是否立即打开？`)) {
      this.openSelectedLinks();
    }
  }

  // 添加键盘快捷键支持
  addKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // 只在面板显示时响应快捷键
      if (this.controlPanel.style.display === 'none') return;
      
      // Ctrl/Cmd + Shift + 组合键
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'l': // Ctrl+Shift+L 切换选择模式
            e.preventDefault();
            this.toggleSelectionMode();
            break;
          case 'a': // Ctrl+Shift+A 全选链接
            e.preventDefault();
            if (this.isActive) this.selectAllLinks();
            break;
          case 'o': // Ctrl+Shift+O 打开选中链接
            e.preventDefault();
            if (this.selectedLinks.size > 0) this.openSelectedLinks();
            break;
          case 'c': // Ctrl+Shift+C 折叠/展开面板
            e.preventDefault();
            this.togglePanelCollapse();
            break;
          case 'q': // Ctrl+Shift+Q 快速打开推荐
            e.preventDefault();
            this.quickOpenRecommended();
            break;
        }
      }
      
      // Escape 键关闭面板
      if (e.key === 'Escape' && !this.isPanelPinned) {
        this.hideControlPanel();
      }
    });
  }

  toggleSelectionMode() {
    this.isActive = !this.isActive;
    const quickToggleBtn = this.controlPanel.querySelector('.oal-quick-toggle .oal-btn-text');
    const quickOpenBtn = this.controlPanel.querySelector('.oal-quick-open');
    const buttons = this.controlPanel.querySelectorAll('.oal-action-buttons .oal-btn');
    const filterSelect = this.controlPanel.querySelector('.oal-filter-select');

    if (this.isActive) {
      quickToggleBtn.textContent = '关闭选择';
      quickOpenBtn.disabled = false;
      buttons.forEach(btn => btn.disabled = false);
      filterSelect.disabled = false;
      this.addLinkCheckboxes();
      this.controlPanel.classList.add('active');
      
      // 自动展开面板以显示更多选项
      if (this.isPanelCollapsed) {
        this.togglePanelCollapse();
      }
    } else {
      quickToggleBtn.textContent = '开启选择';
      quickOpenBtn.disabled = true;
      buttons.forEach(btn => btn.disabled = true);
      filterSelect.disabled = true;
      this.removeLinkCheckboxes();
      this.controlPanel.classList.remove('active');
      this.selectedLinks.clear();
      this.updateUI();
    }
  }

  addLinkCheckboxes() {
    // 查找所有可能的链接
    const links = this.findAllLinks();
    
    links.forEach((link, index) => {
      if (this.linkCheckboxes.has(link)) return; // 避免重复添加

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'oal-link-checkbox';
      checkbox.dataset.linkIndex = index;
      
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.selectedLinks.add(link);
        } else {
          this.selectedLinks.delete(link);
        }
        this.updateUI();
      });

      // 尝试在链接前面插入复选框
      this.insertCheckboxNearLink(link, checkbox);
      this.linkCheckboxes.set(link, checkbox);

      // 为链接添加预览功能
      this.setupLinkPreview(link);
    });

    this.updateStats(links.length);
  }

  findAllLinks() {
    const allLinks = Array.from(document.querySelectorAll('a[href]'));
    
    // 先过滤基本有效性
    const validLinks = allLinks.filter(link => this.isValidLink(link));
    
    // 根据过滤模式返回不同的链接集合
    switch (this.filterMode) {
      case 'all':
        return validLinks;
      case 'smart':
        return this.classifier.getRecommendedLinks(validLinks);
      case 'content':
        return this.classifier.filterLinksByType(validLinks, ['content']);
      case 'navigation':
        return this.classifier.filterLinksByType(validLinks, ['navigation']);
      default:
        return this.classifier.getRecommendedLinks(validLinks);
    }
  }

  isValidLink(link) {
    const href = link.href;
    const text = link.textContent.trim();
    
    // 过滤条件
    if (!href || href === '#' || href === 'javascript:void(0)') return false;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    if (text.length === 0) return false;
    if (link.closest('#open-all-links-panel')) return false; // 排除插件自身的元素
    
    // 检查是否是文档或有意义的链接
    if (text.length < 2) return false;
    
    return true;
  }

  insertCheckboxNearLink(link, checkbox) {
    // 尝试多种插入策略
    const parent = link.parentElement;
    
    // 策略1: 如果父元素是列表项、表格行或卡片容器
    if (parent.tagName === 'LI' || parent.tagName === 'TR' || 
        parent.classList.contains('item') || parent.classList.contains('card')) {
      parent.insertBefore(checkbox, parent.firstChild);
      return;
    }
    
    // 策略2: 直接在链接前插入
    try {
      link.parentNode.insertBefore(checkbox, link);
    } catch (e) {
      // 策略3: 创建包装器
      const wrapper = document.createElement('span');
      wrapper.style.display = 'inline-block';
      wrapper.style.marginRight = '8px';
      wrapper.appendChild(checkbox);
      
      try {
        link.parentNode.insertBefore(wrapper, link);
      } catch (e2) {
        console.warn('Failed to insert checkbox for link:', link);
      }
    }
  }

  removeLinkCheckboxes() {
    this.linkCheckboxes.forEach((checkbox, link) => {
      try {
        if (checkbox.parentNode) {
          checkbox.parentNode.removeChild(checkbox);
        }
      } catch (e) {
        console.warn('Failed to remove checkbox:', e);
      }
    });
    this.linkCheckboxes.clear();
  }

  selectAllLinks() {
    this.linkCheckboxes.forEach((checkbox, link) => {
      checkbox.checked = true;
      this.selectedLinks.add(link);
    });
    this.updateUI();
  }

  deselectAllLinks() {
    this.linkCheckboxes.forEach((checkbox, link) => {
      checkbox.checked = false;
      this.selectedLinks.delete(link);
    });
    this.updateUI();
  }

  updateUI() {
    const count = this.selectedLinks.size;
    const totalLinks = this.linkCheckboxes.size;
    
    // 更新各种计数显示
    const countElement = this.controlPanel.querySelector('.oal-count');
    const selectedCountElement = this.controlPanel.querySelector('.oal-selected-count');
    const selectedLinksElement = this.controlPanel.querySelector('.oal-selected-links');
    const foundCountElement = this.controlPanel.querySelector('.oal-found-count');
    const openBtn = this.controlPanel.querySelector('.oal-open-selected');
    
    if (countElement) countElement.textContent = count;
    if (selectedCountElement) selectedCountElement.textContent = count;
    if (selectedLinksElement) selectedLinksElement.textContent = count;
    if (foundCountElement) foundCountElement.textContent = totalLinks;
    if (openBtn) openBtn.disabled = count === 0;
    
    // 更新按钮状态指示
    if (count > 0) {
      this.controlPanel.classList.add('has-selection');
    } else {
      this.controlPanel.classList.remove('has-selection');
    }
  }

  updateStats(totalLinks) {
    const totalElement = this.controlPanel.querySelector('.oal-total-links');
    totalElement.textContent = totalLinks;
  }

  openSelectedLinks() {
    if (this.selectedLinks.size === 0) return;

    const selectedLinksArray = Array.from(this.selectedLinks);
    const urls = selectedLinksArray.map(link => link.href);
    
    // 记录用户选择模式以供智能学习
    this.recordUserSelection(selectedLinksArray);
    
    // 发送消息给background script来打开链接
    chrome.runtime.sendMessage({
      action: 'openLinks',
      urls: urls
    });

    // 显示确认消息
    this.showNotification(`正在打开 ${urls.length} 个链接...`);
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'oal-notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  hideControlPanel() {
    if (this.isActive) {
      this.toggleSelectionMode();
    }
    this.controlPanel.style.display = 'none';
  }

  showControlPanel() {
    this.controlPanel.style.display = 'block';
  }

  listenForMessages() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'togglePanel':
          if (this.controlPanel.style.display === 'none') {
            this.showControlPanel();
          } else {
            this.hideControlPanel();
          }
          break;
        case 'quickSelectAll':
          if (!this.isActive) {
            this.toggleSelectionMode();
          }
          this.selectAllLinks();
          break;
        case 'getStats':
          sendResponse({
            totalLinks: this.linkCheckboxes.size,
            selectedLinks: this.selectedLinks.size
          });
          break;
        case 'showNotification':
          this.showNotification(message.message);
          break;
        case 'resetLearningData':
          this.resetLearningData();
          break;
        default:
          break;
      }
    });
  }

  // 用户偏好管理
  loadUserPreferences() {
    try {
      const hostname = window.location.hostname;
      const saved = localStorage.getItem(`openAllLinks_${hostname}`);
      if (saved) {
        this.userPreferences = JSON.parse(saved);
        this.filterMode = this.userPreferences.filterMode || 'smart';
        this.isPanelCollapsed = this.userPreferences.panelCollapsed !== false; // 默认折叠
        this.isPanelPinned = this.userPreferences.panelPinned || false;
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  }

  saveUserPreference(key, value) {
    try {
      const hostname = window.location.hostname;
      this.userPreferences[key] = value;
      localStorage.setItem(`openAllLinks_${hostname}`, JSON.stringify(this.userPreferences));
    } catch (error) {
      console.warn('Failed to save user preference:', error);
    }
  }

  // 智能学习功能
  recordUserSelection(selectedLinks) {
    try {
      const hostname = window.location.hostname;
      const patterns = this.analyzeSelectedLinkPatterns(selectedLinks);
      
      if (!this.userPreferences.learnedPatterns) {
        this.userPreferences.learnedPatterns = {};
      }
      
      this.userPreferences.learnedPatterns[hostname] = patterns;
      this.saveUserPreference('learnedPatterns', this.userPreferences.learnedPatterns);
    } catch (error) {
      console.warn('Failed to record user selection:', error);
    }
  }

  analyzeSelectedLinkPatterns(selectedLinks) {
    const patterns = {
      selectors: [],
      textPatterns: [],
      parentSelectors: [],
      linkTypes: []
    };

    selectedLinks.forEach(link => {
      // 分析链接的CSS选择器模式
      const classes = link.className ? '.' + link.className.split(' ').join('.') : '';
      if (classes) {
        patterns.selectors.push(`a${classes}`);
      }

      // 分析父元素模式
      const parent = link.parentElement;
      if (parent && parent.className) {
        const parentClasses = '.' + parent.className.split(' ').join('.');
        patterns.parentSelectors.push(parentClasses + ' a');
      }

      // 分析链接文本模式
      const text = link.textContent.trim();
      if (text.length > 0) {
        patterns.textPatterns.push(text);
      }

      // 记录链接分类
      const classification = this.classifier.classifyLink(link);
      patterns.linkTypes.push(classification.type);
    });

    return patterns;
  }

  // 重置学习数据
  resetLearningData() {
    try {
      const hostname = window.location.hostname;
      
      // 清除当前网站的学习数据
      localStorage.removeItem(`openAllLinks_${hostname}`);
      
      // 重置内存中的偏好设置
      this.userPreferences = {};
      this.filterMode = 'smart';
      
      // 更新UI
      const filterSelect = this.controlPanel.querySelector('.oal-filter-select');
      if (filterSelect) {
        filterSelect.value = 'smart';
      }
      
      this.showNotification('学习数据已重置');
    } catch (error) {
      console.error('Failed to reset learning data:', error);
      this.showNotification('重置失败');
    }
  }

  // ==========================================
  // Link Preview Feature
  // ==========================================

  setupLinkPreview(link) {
    let previewTimeout = null;
    let currentPreview = null;

    link.addEventListener('mouseenter', (e) => {
      // 延迟显示，避免快速划过时频繁显示
      previewTimeout = setTimeout(() => {
        currentPreview = this.showLinkPreview(link, e);
      }, 500);
    });

    link.addEventListener('mouseleave', () => {
      if (previewTimeout) {
        clearTimeout(previewTimeout);
        previewTimeout = null;
      }
      if (currentPreview) {
        this.hideLinkPreview(currentPreview);
        currentPreview = null;
      }
    });
  }

  showLinkPreview(link, event) {
    // 如果预览被禁用，直接返回
    const settings = this.userPreferences;
    if (settings && settings.disablePreview) {
      return null;
    }

    // 创建预览元素
    const preview = document.createElement('div');
    preview.className = 'oal-link-preview';

    // 获取链接分类和评分
    const classification = this.classifier.classifyLink(link);
    const score = this.classifier.calculateLinkScore(link);

    // 获取链接信息
    const linkText = link.textContent.trim() || '(无标题)';
    const linkUrl = link.href;
    const linkDomain = new URL(linkUrl).hostname;

    // 计算评分百分比（假设最大分数为10）
    const maxScore = 10;
    const scorePercent = Math.min(100, (score / maxScore) * 100);

    // 获取分类类型的中文名
    const typeNames = {
      'content': '内容链接',
      'navigation': '导航链接',
      'sidebar': '侧边栏',
      'footer': '页脚链接',
      'excluded': '已排除'
    };

    const typeName = typeNames[classification.type] || '其他';
    const typeClass = `oal-type-${classification.type}`;

    // 填充预览内容
    preview.innerHTML = `
      <div class="oal-link-preview-title">${this.escapeHtml(linkText)}</div>
      <div class="oal-link-preview-url" title="${this.escapeHtml(linkUrl)}">${this.escapeHtml(linkUrl)}</div>
      <div class="oal-link-preview-meta">
        <span class="oal-link-preview-label">类型:</span>
        <span class="oal-link-preview-value">
          <span class="oal-link-preview-type ${typeClass}">${typeName}</span>
        </span>
        <span class="oal-link-preview-label">评分:</span>
        <span class="oal-link-preview-value">
          <span class="oal-link-preview-score">
            ${score.toFixed(1)}
            <span class="oal-score-bar">
              <span class="oal-score-fill" style="width: ${scorePercent}%"></span>
            </span>
          </span>
        </span>
        <span class="oal-link-preview-label">置信度:</span>
        <span class="oal-link-preview-value">${(classification.confidence * 100).toFixed(0)}%</span>
      </div>
      <div class="oal-link-preview-domain">
        <span class="oal-domain-icon">🌐</span>
        <span>${this.escapeHtml(linkDomain)}</span>
      </div>
      <div class="oal-link-preview-hint">按住 Ctrl 点击在新标签页中打开</div>
    `;

    // 添加到页面
    document.body.appendChild(preview);

    // 计算位置（避免超出视口）
    const linkRect = link.getBoundingClientRect();
    const previewRect = preview.getBoundingClientRect();

    let left = linkRect.right + 10;
    let top = linkRect.top;

    // 如果右侧空间不足，显示在左侧
    if (left + previewRect.width > window.innerWidth) {
      left = linkRect.left - previewRect.width - 10;
    }

    // 如果左侧仍然不足，显示在链接上方
    if (left < 0) {
      left = Math.max(10, linkRect.left);
      top = linkRect.top - previewRect.height - 10;
    }

    // 如果上方不足，显示在下方
    if (top < 0) {
      top = linkRect.bottom + 10;
    }

    // 如果下方不足，尽量靠上显示
    if (top + previewRect.height > window.innerHeight) {
      top = Math.max(10, window.innerHeight - previewRect.height - 10);
    }

    preview.style.left = `${left}px`;
    preview.style.top = `${top}px`;

    return preview;
  }

  hideLinkPreview(preview) {
    if (preview && preview.parentNode) {
      preview.style.animation = 'previewFadeOut 0.2s ease-in';
      setTimeout(() => {
        if (preview.parentNode) {
          preview.parentNode.removeChild(preview);
        }
      }, 200);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

}

// 初始化插件
if (typeof window.openAllLinksManager === 'undefined') {
  window.openAllLinksManager = new OpenAllLinksManager();
}