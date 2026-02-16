import TurndownService from 'turndown'

// 初始化 Turndown 服务
const turndownService = new TurndownService({
  headingStyle: 'atx', // 使用 # 风格的标题
  codeBlockStyle: 'fenced', // 使用 ``` 风格的代码块
  bulletListMarker: '-', // 使用 - 作为列表标记
})

// 自定义规则：处理代码块
turndownService.addRule('codeBlock', {
  filter: (node) => {
    return node.nodeName === 'PRE' && node.querySelector('code')
  },
  replacement: (content, node) => {
    const codeElement = node.querySelector('code')
    const language = codeElement?.className?.match(/language-(\w+)/)?.[1] || ''
    const code = codeElement?.textContent || ''
    return `\n\`\`\`${language}\n${code}\n\`\`\`\n\n`
  },
})

// 自定义规则：处理图片
turndownService.addRule('image', {
  filter: 'img',
  replacement: (content, node) => {
    const alt = node.getAttribute('alt') || ''
    const src = node.getAttribute('src') || ''
    const title = node.getAttribute('title') || ''
    return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`
  },
})

// 自定义规则：处理链接
turndownService.addRule('link', {
  filter: 'a',
  replacement: (content, node) => {
    const href = node.getAttribute('href') || ''
    const title = node.getAttribute('title') || ''
    return title ? `[${content}](${href} "${title}")` : `[${content}](${href})`
  },
})

// 自定义规则：处理表格
turndownService.addRule('table', {
  filter: 'table',
  replacement: (content) => {
    return `\n${content}\n`
  },
})

/**
 * 将 HTML 转换为 Markdown
 * @param {string} html - HTML 内容
 * @returns {string} Markdown 内容
 */
export function htmlToMarkdown(html) {
  if (!html) return ''
  
  try {
    // 清理 HTML
    const cleanHtml = html.trim()
    if (!cleanHtml) return ''
    
    // 转换为 Markdown
    const markdown = turndownService.turndown(cleanHtml)
    
    // 清理多余的空行
    return markdown
      .replace(/\n{3,}/g, '\n\n') // 将3个以上连续换行替换为2个
      .trim()
  } catch (error) {
    console.error('HTML to Markdown 转换失败:', error)
    return ''
  }
}

/**
 * 导出文档为 Markdown 文件
 * @param {Object} document - 文档对象
 * @param {string} htmlContent - HTML 内容
 */
export function exportToMarkdown(docMeta, htmlContent) {
  if (!docMeta || !htmlContent) {
    throw new Error('文档或内容不能为空')
  }

  // 转换为 Markdown
  const markdown = htmlToMarkdown(htmlContent)
  
  // 添加文档标题
  const title = docMeta.title || '未命名文档'
  const fullMarkdown = `# ${title}\n\n${markdown}`
  
  // 创建 Blob
  const blob = new Blob([fullMarkdown], { type: 'text/markdown;charset=utf-8' })
  
  // 创建下载链接
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${title}.md`
  
  // 触发下载
  document.body.appendChild(link)
  link.click()
  
  // 清理
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 导出文档为 HTML 文件
 * @param {Object} document - 文档对象
 * @param {string} htmlContent - HTML 内容
 */
export function exportToHTML(docMeta, htmlContent) {
  if (!docMeta || !htmlContent) {
    throw new Error('文档或内容不能为空')
  }

  const title = docMeta.title || '未命名文档'
  
  // 创建完整的 HTML 文档
  const fullHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
    }
    h1 { font-size: 2em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    p { margin: 1em 0; }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace;
    }
    pre {
      background: #f5f5f5;
      padding: 1em;
      border-radius: 6px;
      overflow-x: auto;
    }
    pre code {
      background: transparent;
      padding: 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    table td, table th {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
    }
    table th {
      background: #f5f5f5;
      font-weight: 600;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 1em 0;
    }
    blockquote {
      border-left: 4px solid #ddd;
      padding-left: 1em;
      margin: 1em 0;
      color: #666;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${htmlContent}
</body>
</html>`
  
  // 创建 Blob
  const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' })
  
  // 创建下载链接
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${title}.html`
  
  // 触发下载
  document.body.appendChild(link)
  link.click()
  
  // 清理
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

