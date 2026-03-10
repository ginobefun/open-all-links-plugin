// Open All Links - Link Grouper
// 智能链接分组功能

class LinkGrouper {
  constructor() {
    this.groups = {
      article: { name: '文章/新闻', icon: '📰', priority: 1 },
      video: { name: '视频', icon: '🎥', priority: 2 },
      document: { name: '文档/PDF', icon: '📄', priority: 3 },
      image: { name: '图片', icon: '🖼️', priority: 4 },
      download: { name: '下载', icon: '📦', priority: 5 },
      external: { name: '外部链接', icon: '🔗', priority: 6 },
      internal: { name: '内部链接', icon: '🏠', priority: 7 },
      other: { name: '其他', icon: '📋', priority: 8 }
    };
  }

  /**
   * 对链接列表进行分组
   * @param {Array<HTMLAnchorElement>} links - 链接元素数组
   * @param {Object} options - 分组选项
   * @returns {Object} 分组结果
   */
  groupLinks(links, options = {}) {
    const currentOrigin = window.location.origin;
    const groupedLinks = {};

    // 初始化所有分组
    Object.keys(this.groups).forEach(key => {
      groupedLinks[key] = {
        ...this.groups[key],
        links: [],
        count: 0
      };
    });

    // 对每个链接进行分类
    links.forEach(link => {
      const type = this.detectLinkType(link, currentOrigin);
      if (groupedLinks[type]) {
        groupedLinks[type].links.push(link);
        groupedLinks[type].count++;
      }
    });

    // 移除空分组（如果配置要求）
    if (options.removeEmpty !== false) {
      Object.keys(groupedLinks).forEach(key => {
        if (groupedLinks[key].count === 0) {
          delete groupedLinks[key];
        }
      });
    }

    // 按优先级排序
    const sorted = {};
    Object.keys(groupedLinks)
      .sort((a, b) => groupedLinks[a].priority - groupedLinks[b].priority)
      .forEach(key => {
        sorted[key] = groupedLinks[key];
      });

    return sorted;
  }

  /**
   * 检测链接类型
   * @param {HTMLAnchorElement} link - 链接元素
   * @param {string} currentOrigin - 当前页面的源
   * @returns {string} 链接类型
   */
  detectLinkType(link, currentOrigin) {
    const href = link.href.toLowerCase();
    const text = link.textContent.trim().toLowerCase();

    // 1. 检查是否是下载链接
    if (this.isDownloadLink(link, href, text)) {
      return 'download';
    }

    // 2. 检查是否是视频链接
    if (this.isVideoLink(link, href, text)) {
      return 'video';
    }

    // 3. 检查是否是文档链接
    if (this.isDocumentLink(link, href, text)) {
      return 'document';
    }

    // 4. 检查是否是图片链接
    if (this.isImageLink(link, href, text)) {
      return 'image';
    }

    // 5. 检查是否是外部链接
    try {
      const linkOrigin = new URL(href).origin;
      if (linkOrigin !== currentOrigin) {
        return 'external';
      } else {
        // 内部链接，进一步判断是否是文章
        if (this.isArticleLink(link, href, text)) {
          return 'article';
        }
        return 'internal';
      }
    } catch (e) {
      // URL 解析失败，归类为其他
      return 'other';
    }
  }

  /**
   * 判断是否是视频链接
   */
  isVideoLink(link, href, text) {
    // 视频文件扩展名
    const videoExtensions = /\.(mp4|avi|mov|mkv|flv|wmv|webm|m4v)(\?|$)/i;
    if (videoExtensions.test(href)) {
      return true;
    }

    // 常见视频网站域名
    const videoDomains = [
      'youtube.com', 'youtu.be', 'vimeo.com', 'bilibili.com',
      'dailymotion.com', 'twitch.tv', 'tiktok.com'
    ];
    if (videoDomains.some(domain => href.includes(domain))) {
      return true;
    }

    // 包含视频关键词
    const videoKeywords = ['video', 'watch', '视频', '观看', '播放'];
    if (videoKeywords.some(keyword => href.includes(keyword) || text.includes(keyword))) {
      // 检查是否有视频相关的类名或属性
      if (link.querySelector('video') ||
          link.className.toLowerCase().includes('video') ||
          link.getAttribute('data-video')) {
        return true;
      }
    }

    return false;
  }

  /**
   * 判断是否是文档链接
   */
  isDocumentLink(link, href, text) {
    // 文档文件扩展名
    const docExtensions = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|odt|ods|odp)(\?|$)/i;
    if (docExtensions.test(href)) {
      return true;
    }

    // 包含文档关键词
    const docKeywords = ['document', 'pdf', 'download', '文档', '下载', 'file'];
    if (docKeywords.some(keyword => text.includes(keyword))) {
      return true;
    }

    return false;
  }

  /**
   * 判断是否是图片链接
   */
  isImageLink(link, href, text) {
    // 图片文件扩展名
    const imageExtensions = /\.(jpg|jpeg|png|gif|svg|webp|bmp|ico)(\?|$)/i;
    if (imageExtensions.test(href)) {
      return true;
    }

    // 链接只包含图片
    const images = link.querySelectorAll('img');
    if (images.length > 0 && link.textContent.trim().length === 0) {
      return true;
    }

    // 常见图片网站或图库
    const imageDomains = ['imgur.com', 'instagram.com', 'pinterest.com', 'flickr.com'];
    if (imageDomains.some(domain => href.includes(domain))) {
      return true;
    }

    return false;
  }

  /**
   * 判断是否是下载链接
   */
  isDownloadLink(link, href, text) {
    // 检查 download 属性
    if (link.hasAttribute('download')) {
      return true;
    }

    // URL 包含下载关键词
    if (href.includes('download') || href.includes('attachment')) {
      return true;
    }

    // 文本包含下载关键词
    const downloadKeywords = ['download', '下载', 'get', '获取'];
    if (downloadKeywords.some(keyword => text.includes(keyword))) {
      // 进一步检查是否有文件扩展名
      const fileExtension = /\.(zip|rar|tar|gz|7z|exe|dmg|apk|ipa)(\?|$)/i;
      if (fileExtension.test(href)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 判断是否是文章链接
   */
  isArticleLink(link, href, text) {
    // URL 包含文章相关路径
    const articlePaths = ['/article/', '/post/', '/blog/', '/news/', '/story/'];
    if (articlePaths.some(path => href.includes(path))) {
      return true;
    }

    // 在文章容器中
    if (link.closest('article, .article, .post, .news, .blog-post')) {
      return true;
    }

    // 文本长度适中（通常文章标题较长）
    if (text.length >= 15 && text.length <= 150) {
      // 在标题标签中
      if (link.closest('h1, h2, h3, h4')) {
        return true;
      }

      // 有描述性类名
      const articleClasses = ['title', 'heading', 'headline', 'article', 'post'];
      const className = link.className.toLowerCase();
      if (articleClasses.some(cls => className.includes(cls))) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取分组统计信息
   * @param {Object} groupedLinks - 分组后的链接
   * @returns {Object} 统计信息
   */
  getGroupStatistics(groupedLinks) {
    const stats = {
      totalGroups: Object.keys(groupedLinks).length,
      totalLinks: 0,
      groupDetails: {}
    };

    Object.keys(groupedLinks).forEach(key => {
      const group = groupedLinks[key];
      stats.totalLinks += group.count;
      stats.groupDetails[key] = {
        name: group.name,
        icon: group.icon,
        count: group.count,
        percentage: 0
      };
    });

    // 计算百分比
    Object.keys(stats.groupDetails).forEach(key => {
      if (stats.totalLinks > 0) {
        stats.groupDetails[key].percentage =
          Math.round((stats.groupDetails[key].count / stats.totalLinks) * 100);
      }
    });

    return stats;
  }

  /**
   * 按分组导出链接
   * @param {Object} groupedLinks - 分组后的链接
   * @param {string} format - 导出格式（'json', 'markdown', 'html'）
   * @returns {string} 导出的内容
   */
  exportGroupedLinks(groupedLinks, format = 'markdown') {
    switch (format) {
      case 'json':
        return this.exportAsJson(groupedLinks);
      case 'markdown':
        return this.exportAsMarkdown(groupedLinks);
      case 'html':
        return this.exportAsHtml(groupedLinks);
      default:
        return this.exportAsMarkdown(groupedLinks);
    }
  }

  exportAsJson(groupedLinks) {
    const data = {};
    Object.keys(groupedLinks).forEach(key => {
      data[key] = {
        name: groupedLinks[key].name,
        count: groupedLinks[key].count,
        links: groupedLinks[key].links.map(link => ({
          text: link.textContent.trim(),
          url: link.href
        }))
      };
    });
    return JSON.stringify(data, null, 2);
  }

  exportAsMarkdown(groupedLinks) {
    let markdown = '# 链接分组导出\n\n';
    markdown += `导出时间: ${new Date().toLocaleString()}\n\n`;

    Object.keys(groupedLinks).forEach(key => {
      const group = groupedLinks[key];
      markdown += `## ${group.icon} ${group.name} (${group.count})\n\n`;
      group.links.forEach(link => {
        const text = link.textContent.trim() || '无标题';
        markdown += `- [${text}](${link.href})\n`;
      });
      markdown += '\n';
    });

    return markdown;
  }

  escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return text.replace(/[&<>"']/g, c => map[c]);
  }

  exportAsHtml(groupedLinks) {
    let html = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n';
    html += '<meta charset="UTF-8">\n';
    html += '<title>链接分组导出</title>\n';
    html += '<style>body{font-family:Arial,sans-serif;margin:20px;}';
    html += 'h1{color:#333;}h2{color:#666;border-bottom:2px solid #eee;padding-bottom:10px;}';
    html += 'ul{list-style:none;padding:0;}li{margin:5px 0;}';
    html += 'a{color:#3b82f6;text-decoration:none;}a:hover{text-decoration:underline;}</style>\n';
    html += '</head>\n<body>\n';
    html += '<h1>链接分组导出</h1>\n';
    html += `<p>导出时间: ${this.escapeHtml(new Date().toLocaleString())}</p>\n`;

    Object.keys(groupedLinks).forEach(key => {
      const group = groupedLinks[key];
      html += `<h2>${this.escapeHtml(group.icon)} ${this.escapeHtml(group.name)} (${group.count})</h2>\n<ul>\n`;
      group.links.forEach(link => {
        const text = this.escapeHtml(link.textContent.trim() || '无标题');
        const href = this.escapeHtml(link.href);
        html += `<li><a href="${href}" target="_blank">${text}</a></li>\n`;
      });
      html += '</ul>\n';
    });

    html += '</body>\n</html>';
    return html;
  }
}

// 导出类
// 兼容不同环境：Node.js、浏览器、Service Worker
(function(global) {
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js 环境
    module.exports = LinkGrouper;
  } else {
    // Service Worker 或浏览器环境
    global.LinkGrouper = LinkGrouper;
  }
})(typeof self !== 'undefined' ? self : this);
