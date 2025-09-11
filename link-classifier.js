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
          '.share a[href]'
        ],
        excludePatterns: [
          /^#/, // 锚点链接
          /javascript:/i,
          /mailto:/i,
          /tel:/i,
          /^\/\/(www\.)?(login|register|logout|signin|signup)/i
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
      classification: this.classifyLink(link)
    }));

    // 优先返回内容链接
    const contentLinks = classified
      .filter(item => item.classification.type === 'content')
      .sort((a, b) => b.classification.confidence - a.classification.confidence)
      .map(item => item.element);

    return contentLinks;
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
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LinkClassifier;
} else {
  window.LinkClassifier = LinkClassifier;
}