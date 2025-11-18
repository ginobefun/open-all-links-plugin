// Open All Links - History Manager
// 管理历史记录和收藏功能

class HistoryManager {
  constructor() {
    this.maxHistoryItems = 50; // 最多保存 50 条历史记录
    this.maxFavorites = 20; // 最多保存 20 个收藏
  }

  // ==========================================
  // 历史记录管理
  // ==========================================

  /**
   * 添加一条历史记录
   * @param {Object} record - 历史记录对象
   * @param {string} record.url - 页面 URL
   * @param {string} record.pageTitle - 页面标题
   * @param {Array<string>} record.links - 打开的链接列表
   * @param {string} record.filterMode - 使用的过滤模式
   */
  async addHistory(record) {
    try {
      const history = await this.getHistory();

      // 创建新的历史记录项
      const historyItem = {
        id: this.generateId(),
        timestamp: Date.now(),
        url: record.url,
        pageTitle: record.pageTitle,
        links: record.links,
        linksCount: record.links.length,
        filterMode: record.filterMode || 'smart',
        tags: [], // 用户可以添加标签
        note: '' // 用户可以添加备注
      };

      // 添加到历史记录数组开头
      history.unshift(historyItem);

      // 限制历史记录数量
      if (history.length > this.maxHistoryItems) {
        history.splice(this.maxHistoryItems);
      }

      // 保存到 storage
      await chrome.storage.local.set({ openLinksHistory: history });

      console.log('History added:', historyItem);
      return historyItem;
    } catch (error) {
      console.error('Failed to add history:', error);
      return null;
    }
  }

  /**
   * 获取所有历史记录
   * @param {number} limit - 限制返回的记录数量
   * @returns {Promise<Array>}
   */
  async getHistory(limit = null) {
    try {
      const result = await chrome.storage.local.get({ openLinksHistory: [] });
      const history = result.openLinksHistory || [];

      if (limit && limit > 0) {
        return history.slice(0, limit);
      }

      return history;
    } catch (error) {
      console.error('Failed to get history:', error);
      return [];
    }
  }

  /**
   * 根据 ID 获取历史记录
   * @param {string} id - 历史记录 ID
   * @returns {Promise<Object|null>}
   */
  async getHistoryById(id) {
    try {
      const history = await this.getHistory();
      return history.find(item => item.id === id) || null;
    } catch (error) {
      console.error('Failed to get history by id:', error);
      return null;
    }
  }

  /**
   * 删除历史记录
   * @param {string} id - 历史记录 ID
   */
  async deleteHistory(id) {
    try {
      const history = await this.getHistory();
      const filteredHistory = history.filter(item => item.id !== id);
      await chrome.storage.local.set({ openLinksHistory: filteredHistory });
      return true;
    } catch (error) {
      console.error('Failed to delete history:', error);
      return false;
    }
  }

  /**
   * 清空所有历史记录
   */
  async clearHistory() {
    try {
      await chrome.storage.local.set({ openLinksHistory: [] });
      return true;
    } catch (error) {
      console.error('Failed to clear history:', error);
      return false;
    }
  }

  /**
   * 更新历史记录（添加标签、备注等）
   * @param {string} id - 历史记录 ID
   * @param {Object} updates - 要更新的字段
   */
  async updateHistory(id, updates) {
    try {
      const history = await this.getHistory();
      const index = history.findIndex(item => item.id === id);

      if (index === -1) {
        return false;
      }

      // 更新记录
      history[index] = { ...history[index], ...updates };
      await chrome.storage.local.set({ openLinksHistory: history });
      return true;
    } catch (error) {
      console.error('Failed to update history:', error);
      return false;
    }
  }

  // ==========================================
  // 收藏管理
  // ==========================================

  /**
   * 添加收藏
   * @param {Object} favorite - 收藏对象（可以是历史记录或新建）
   */
  async addFavorite(favorite) {
    try {
      const favorites = await this.getFavorites();

      // 创建收藏项
      const favoriteItem = {
        id: favorite.id || this.generateId(),
        timestamp: Date.now(),
        name: favorite.name || favorite.pageTitle || '未命名收藏',
        url: favorite.url,
        pageTitle: favorite.pageTitle,
        links: favorite.links,
        linksCount: favorite.links.length,
        filterMode: favorite.filterMode || 'smart',
        tags: favorite.tags || [],
        note: favorite.note || ''
      };

      // 检查是否已存在（避免重复）
      const exists = favorites.some(item => item.id === favoriteItem.id);
      if (exists) {
        return false;
      }

      // 添加到收藏数组开头
      favorites.unshift(favoriteItem);

      // 限制收藏数量
      if (favorites.length > this.maxFavorites) {
        favorites.splice(this.maxFavorites);
      }

      // 保存到 storage
      await chrome.storage.local.set({ openLinksFavorites: favorites });

      console.log('Favorite added:', favoriteItem);
      return favoriteItem;
    } catch (error) {
      console.error('Failed to add favorite:', error);
      return null;
    }
  }

  /**
   * 获取所有收藏
   * @returns {Promise<Array>}
   */
  async getFavorites() {
    try {
      const result = await chrome.storage.local.get({ openLinksFavorites: [] });
      return result.openLinksFavorites || [];
    } catch (error) {
      console.error('Failed to get favorites:', error);
      return [];
    }
  }

  /**
   * 删除收藏
   * @param {string} id - 收藏 ID
   */
  async deleteFavorite(id) {
    try {
      const favorites = await this.getFavorites();
      const filteredFavorites = favorites.filter(item => item.id !== id);
      await chrome.storage.local.set({ openLinksFavorites: filteredFavorites });
      return true;
    } catch (error) {
      console.error('Failed to delete favorite:', error);
      return false;
    }
  }

  /**
   * 更新收藏
   * @param {string} id - 收藏 ID
   * @param {Object} updates - 要更新的字段
   */
  async updateFavorite(id, updates) {
    try {
      const favorites = await this.getFavorites();
      const index = favorites.findIndex(item => item.id === id);

      if (index === -1) {
        return false;
      }

      // 更新收藏
      favorites[index] = { ...favorites[index], ...updates };
      await chrome.storage.local.set({ openLinksFavorites: favorites });
      return true;
    } catch (error) {
      console.error('Failed to update favorite:', error);
      return false;
    }
  }

  /**
   * 检查是否已收藏
   * @param {string} id - ID
   * @returns {Promise<boolean>}
   */
  async isFavorite(id) {
    try {
      const favorites = await this.getFavorites();
      return favorites.some(item => item.id === id);
    } catch (error) {
      console.error('Failed to check favorite:', error);
      return false;
    }
  }

  // ==========================================
  // 搜索和筛选
  // ==========================================

  /**
   * 搜索历史记录
   * @param {string} query - 搜索关键词
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Array>}
   */
  async searchHistory(query, filters = {}) {
    try {
      let history = await this.getHistory();

      // 关键词搜索
      if (query) {
        const lowerQuery = query.toLowerCase();
        history = history.filter(item => {
          return (
            item.pageTitle.toLowerCase().includes(lowerQuery) ||
            item.url.toLowerCase().includes(lowerQuery) ||
            item.note.toLowerCase().includes(lowerQuery) ||
            item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
          );
        });
      }

      // 标签筛选
      if (filters.tags && filters.tags.length > 0) {
        history = history.filter(item => {
          return filters.tags.some(tag => item.tags.includes(tag));
        });
      }

      // 日期范围筛选
      if (filters.startDate) {
        history = history.filter(item => item.timestamp >= filters.startDate);
      }
      if (filters.endDate) {
        history = history.filter(item => item.timestamp <= filters.endDate);
      }

      // 过滤模式筛选
      if (filters.filterMode) {
        history = history.filter(item => item.filterMode === filters.filterMode);
      }

      return history;
    } catch (error) {
      console.error('Failed to search history:', error);
      return [];
    }
  }

  // ==========================================
  // 工具方法
  // ==========================================

  /**
   * 生成唯一 ID
   * @returns {string}
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 格式化时间戳
   * @param {number} timestamp
   * @returns {string}
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;

    // 超过 7 天显示具体日期
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    if (year === now.getFullYear()) {
      return `${month}-${day} ${hours}:${minutes}`;
    } else {
      return `${year}-${month}-${day}`;
    }
  }

  /**
   * 获取统计信息
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    try {
      const history = await this.getHistory();
      const favorites = await this.getFavorites();

      const totalLinks = history.reduce((sum, item) => sum + item.linksCount, 0);
      const avgLinksPerSession = history.length > 0 ? Math.round(totalLinks / history.length) : 0;

      // 最常访问的域名
      const domainCounts = {};
      history.forEach(item => {
        try {
          const domain = new URL(item.url).hostname;
          domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        } catch (e) {
          // 忽略无效 URL
        }
      });

      const topDomains = Object.entries(domainCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([domain, count]) => ({ domain, count }));

      return {
        totalHistory: history.length,
        totalFavorites: favorites.length,
        totalLinksOpened: totalLinks,
        avgLinksPerSession,
        topDomains
      };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return {
        totalHistory: 0,
        totalFavorites: 0,
        totalLinksOpened: 0,
        avgLinksPerSession: 0,
        topDomains: []
      };
    }
  }
}

// 导出类
// 兼容不同环境：Node.js、浏览器、Service Worker
(function(global) {
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js 环境
    module.exports = HistoryManager;
  } else {
    // Service Worker 或浏览器环境
    global.HistoryManager = HistoryManager;
  }
})(typeof self !== 'undefined' ? self : this);
