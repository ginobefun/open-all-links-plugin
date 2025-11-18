// Open All Links - 智能链接分类器

class LinkClassifier {
  constructor() {
    this.siteRules = this.initializeSiteRules();
    this.commonPatterns = this.initializeCommonPatterns();
  }

  // 初始化常见网站规则
  initializeSiteRules() {
    return {
      // 通用规则
      '*': {
        contentSelectors: [
          'article a[href]',
          '.content a[href]',
          '.post a[href]',
          '.entry a[href]',
          'main a[href]',
          '.article-list a[href]',
          '.news-list a[href]',
          '.item-title a[href]',
          'h1 a[href], h2 a[href], h3 a[href]'
        ],
        excludeSelectors: [
          'nav a[href]',
          '.navigation a[href]',
          '.navbar a[href]',
          '.menu a[href]',
          '.sidebar a[href]',
          '.footer a[href]',
          '.header a[href]',
          '.breadcrumb a[href]',
          '.pagination a[href]',
          '.social a[href]',
          '.share a[href]',
          '.logo a[href]',
          '.brand a[href]',
          '.site-logo a[href]',
          '.top-nav a[href]',
          '.main-nav a[href]'
        ],
        excludePatterns: [
          /^#/, // 锚点链接
          /javascript:/i,
          /mailto:/i,
          /tel:/i,
          /^\/\/(www\.)?(login|register|logout|signin|signup)/i
        ],
        // 主页文本模式（用于识别主页链接）
        homePageTextPatterns: [
          /^首页$/i,
          /^主页$/i,
          /^home$/i,
          /^homepage$/i,
          /^index$/i,
          /^回到首页$/i,
          /^返回首页$/i,
          /^back to home$/i,
          /^网站首页$/i,
          /^logo$/i
        ]
      },

      // 特定网站规则
      'github.com': {
        contentSelectors: [
          '.js-navigation-item .Link--primary',
          '.Box-row .Link--primary',
          '.repository-content a[href*="/tree/"]',
          '.repository-content a[href*="/blob/"]',
          '.js-navigation-item h4 a',
          '.issue-title-link'
        ],
        excludeSelectors: [
          '.Header a',
          '.subnav a',
          '.UnderlineNav a',
          '.pagehead-actions a',
          '.btn'
        ]
      },

      'stackoverflow.com': {
        contentSelectors: [
          '.s-post-summary--content-title a',
          '.question-hyperlink',
          '.answer-hyperlink'
        ],
        excludeSelectors: [
          '.top-bar a',
          '.left-sidebar a',
          '.js-gps-track'
        ]
      },

      'reddit.com': {
        contentSelectors: [
          '[data-testid="post-content"] h3 a',
          '.Post a[href*="/r/"]',
          '.thing .title a'
        ],
        excludeSelectors: [
          'header a',
          '.side a',
          '.subreddit a'
        ]
      },

      // 知乎
      'zhihu.com': {
        contentSelectors: [
          '.ContentItem-title a',
          '.QuestionItem-title a',
          '.ArticleItem-title a'
        ],
        excludeSelectors: [
          '.AppHeader a',
          '.Sidebar a',
          '.QuestionHeader a'
        ]
      },

      // 简书
      'jianshu.com': {
        contentSelectors: [
          '.note-list .title a',
          '.article-list .title a'
        ],
        excludeSelectors: [
          '.header a',
          '.nav a',
          '.sidebar a'
        ]
      }
    };
  }

  // 初始化通用模式
  initializeCommonPatterns() {
    return {
      navigation: {
        selectors: [
          'nav a', '.nav a', '.navigation a', '.navbar a',
          '.menu a', '.main-menu a', '.site-header a',
          '.top-bar a', '.header a', '.masthead a'
        ],
        patterns: [
          /首页|home|主页/i,
          /登录|login|signin/i,
          /注册|register|signup/i,
          /关于|about/i,
          /联系|contact/i,
          /帮助|help/i
        ]
      },
      content: {
        selectors: [
          'article a', '.article a', '.post a', '.content a',
          '.entry a', '.news a', '.item a', '.card a',
          'main a', '.main-content a'
        ],
        patterns: [
          /阅读更多|read more|查看详情|详细内容/i
        ]
      },
      sidebar: {
        selectors: [
          '.sidebar a', '.aside a', '.widget a',
          '.secondary a', '.related a'
        ]
      },
      footer: {
        selectors: [
          '.footer a', '.site-footer a', '.page-footer a',
          'footer a'
        ]
      }
    };
  }

  // 获取当前域名的规则
  getCurrentSiteRules() {
    const hostname = window.location.hostname;
    
    // 检查是否有特定站点规则
    for (const domain in this.siteRules) {
      if (domain !== '*' && hostname.includes(domain)) {
        return {
          ...this.siteRules['*'],
          ...this.siteRules[domain]
        };
      }
    }
    
    return this.siteRules['*'];
  }

  // 分类链接
  classifyLink(link) {
    const rules = this.getCurrentSiteRules();
    const linkText = link.textContent.trim().toLowerCase();
    const linkHref = link.href;
    const linkClasses = link.className;
    
    // 检查是否应该排除
    if (this.shouldExcludeLink(link, rules)) {
      return { type: 'excluded', reason: 'excluded_by_rules' };
    }

    // 检查是否是内容链接
    if (this.isContentLink(link, rules)) {
      return { type: 'content', confidence: 0.9 };
    }

    // 检查是否是导航链接
    if (this.isNavigationLink(link)) {
      return { type: 'navigation', confidence: 0.8 };
    }

    // 检查是否是侧边栏链接
    if (this.isSidebarLink(link)) {
      return { type: 'sidebar', confidence: 0.7 };
    }

    // 检查是否是页脚链接
    if (this.isFooterLink(link)) {
      return { type: 'footer', confidence: 0.6 };
    }

    // 默认分类为其他内容
    return { type: 'content', confidence: 0.5 };
  }

  // 检查是否应该排除链接
  shouldExcludeLink(link, rules) {
    const href = link.href;
    const element = link;
    const linkText = link.textContent.trim();

    // 检查是否是主页链接
    if (this.isHomepageLink(link, rules)) {
      return true;
    }

    // 检查排除模式
    if (rules.excludePatterns) {
      for (const pattern of rules.excludePatterns) {
        if (pattern.test(href)) {
          return true;
        }
      }
    }

    // 检查排除选择器
    if (rules.excludeSelectors) {
      for (const selector of rules.excludeSelectors) {
        try {
          if (element.matches(selector) || element.closest(selector)) {
            return true;
          }
        } catch (e) {
          console.warn('Invalid selector:', selector);
        }
      }
    }

    return false;
  }

  // 检查是否是主页链接
  isHomepageLink(link, rules) {
    const href = link.href;
    const linkText = link.textContent.trim();
    const currentOrigin = window.location.origin;

    try {
      const url = new URL(href);

      // 检查是否是根路径或主页路径
      const homepagePaths = ['/', '/index.html', '/index.htm', '/home', '/home.html', '/main'];
      const isRootPath = homepagePaths.includes(url.pathname) || url.pathname === '';

      // 如果指向同一域名的根路径，很可能是主页链接
      if (url.origin === currentOrigin && isRootPath) {
        // 进一步检查文本是否匹配主页模式
        if (rules.homePageTextPatterns) {
          for (const pattern of rules.homePageTextPatterns) {
            if (pattern.test(linkText)) {
              return true;
            }
          }
        }

        // 如果链接文本非常短（1-3个字符）且指向根路径，也可能是 logo
        if (linkText.length <= 3 && isRootPath) {
          return true;
        }
      }

      // 检查链接文本是否完全匹配主页模式
      if (rules.homePageTextPatterns) {
        for (const pattern of rules.homePageTextPatterns) {
          if (pattern.test(linkText)) {
            return true;
          }
        }
      }

      // 检查是否在 logo 或 brand 元素内
      const logoSelectors = ['.logo', '.brand', '.site-logo', '.site-brand', '.header-logo'];
      for (const selector of logoSelectors) {
        try {
          if (link.closest(selector)) {
            return true;
          }
        } catch (e) {
          continue;
        }
      }

    } catch (e) {
      // URL 解析失败，继续其他检查
    }

    return false;
  }

  // 检查是否是内容链接
  isContentLink(link, rules) {
    const element = link;

    // 检查内容选择器
    if (rules.contentSelectors) {
      for (const selector of rules.contentSelectors) {
        try {
          if (element.matches(selector) || element.closest(selector)) {
            return true;
          }
        } catch (e) {
          console.warn('Invalid selector:', selector);
        }
      }
    }

    // 检查是否在内容区域内
    const contentContainers = [
      'article', '.article', '.post', '.content', '.entry',
      'main', '.main-content', '.primary', '.news-list',
      '.article-list', '.post-list'
    ];

    for (const container of contentContainers) {
      try {
        if (element.closest(container)) {
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    return false;
  }

  // 检查是否是导航链接
  isNavigationLink(link) {
    const patterns = this.commonPatterns.navigation;
    
    // 检查选择器
    for (const selector of patterns.selectors) {
      try {
        if (link.matches(selector) || link.closest(selector)) {
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    // 检查文本模式
    const linkText = link.textContent.trim();
    for (const pattern of patterns.patterns) {
      if (pattern.test(linkText)) {
        return true;
      }
    }

    return false;
  }

  // 检查是否是侧边栏链接
  isSidebarLink(link) {
    const patterns = this.commonPatterns.sidebar;
    
    for (const selector of patterns.selectors) {
      try {
        if (link.closest(selector)) {
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    return false;
  }

  // 检查是否是页脚链接
  isFooterLink(link) {
    const patterns = this.commonPatterns.footer;
    
    for (const selector of patterns.selectors) {
      try {
        if (link.closest(selector)) {
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    return false;
  }

  // 获取推荐的链接列表
  getRecommendedLinks(allLinks) {
    const classified = allLinks.map(link => ({
      element: link,
      classification: this.classifyLink(link),
      score: this.calculateLinkScore(link)
    }));

    // 过滤出内容链接并按综合得分排序
    const contentLinks = classified
      .filter(item => item.classification.type === 'content')
      .sort((a, b) => {
        // 先按分类置信度排序，再按综合得分排序
        const confidenceDiff = b.classification.confidence - a.classification.confidence;
        if (Math.abs(confidenceDiff) > 0.1) {
          return confidenceDiff;
        }
        return b.score - a.score;
      })
      .map(item => item.element);

    return contentLinks;
  }

  // 计算链接的综合得分
  calculateLinkScore(link) {
    let score = 0;
    const text = link.textContent.trim();
    const href = link.href;

    // 1. 文本长度得分（理想长度 10-100 个字符）
    if (text.length >= 10 && text.length <= 100) {
      score += 2;
    } else if (text.length > 5 && text.length < 200) {
      score += 1;
    }

    // 2. 链接位置得分（越靠前的链接得分越高）
    const position = this.getLinkPosition(link);
    if (position < 10) {
      score += 2;
    } else if (position < 30) {
      score += 1;
    }

    // 3. 是否在列表中（列表项通常是内容链接）
    if (link.closest('li, tr, .item, .card, .list-item')) {
      score += 2;
    }

    // 4. 是否在标题标签中
    if (link.closest('h1, h2, h3, h4')) {
      score += 3;
    }

    // 5. 是否有描述性类名
    const className = link.className.toLowerCase();
    const descriptiveClasses = ['title', 'heading', 'post', 'article', 'content', 'link', 'item'];
    if (descriptiveClasses.some(cls => className.includes(cls))) {
      score += 1;
    }

    // 6. URL 质量得分
    if (this.isQualityUrl(href)) {
      score += 1;
    }

    // 7. 是否有图片（带图片的链接通常是重要内容）
    if (link.querySelector('img')) {
      score += 1;
    }

    // 8. 惩罚过短的文本
    if (text.length < 5) {
      score -= 2;
    }

    // 9. 惩罚纯数字或特殊字符
    if (/^[\d\s\-_\.]+$/.test(text)) {
      score -= 1;
    }

    return score;
  }

  // 获取链接在页面中的位置（0-based index）
  getLinkPosition(link) {
    const allLinks = Array.from(document.querySelectorAll('a[href]'));
    return allLinks.indexOf(link);
  }

  // 判断 URL 是否有较高质量
  isQualityUrl(href) {
    try {
      const url = new URL(href);

      // 排除查询参数过多的 URL
      const searchParams = new URLSearchParams(url.search);
      if (searchParams.toString().length > 100) {
        return false;
      }

      // 排除包含追踪参数的 URL
      const trackingParams = ['utm_', 'ref', 'source', 'campaign'];
      for (const param of trackingParams) {
        if (url.search.includes(param)) {
          return false;
        }
      }

      // 偏好语义化的 URL 路径
      const path = url.pathname;
      if (/\/[a-z0-9\-]+\/[a-z0-9\-]+/.test(path)) {
        return true;
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  // 按类型过滤链接
  filterLinksByType(allLinks, types = ['content']) {
    const classified = allLinks.map(link => ({
      element: link,
      classification: this.classifyLink(link)
    }));

    return classified
      .filter(item => types.includes(item.classification.type))
      .map(item => item.element);
  }
}

// 导出类
// 兼容不同环境：Node.js、浏览器、Service Worker
(function(global) {
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js 环境
    module.exports = LinkClassifier;
  } else {
    // Service Worker 或浏览器环境
    global.LinkClassifier = LinkClassifier;
  }
})(typeof self !== 'undefined' ? self : this);