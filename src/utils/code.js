import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

// 检测代码语言
export function detectLanguage(code) {
  try {
    const result = hljs.highlightAuto(code)
    return result.language || 'plaintext'
  } catch {
    return 'plaintext'
  }
}

// 代码高亮
export function highlightCode(code, language) {
  try {
    if (language && language !== 'plaintext') {
      return hljs.highlight(code, { language }).value
    } else {
      return hljs.highlightAuto(code).value
    }
  } catch {
    return code
  }
}

// 判断是否为代码片段
export function isCodeSnippet(text) {
  if (!text || typeof text !== 'string') return false

  // 检查是否包含常见的编程语言关键字
  const codePatterns = [
    /^(function|class|import|export|const|let|var|if|for|while)\s/,
    /{[\s\S]*}/,
    /\(\s*\)\s*=>/,
    /^[a-zA-Z]+\s+[a-zA-Z_$][0-9a-zA-Z_$]*\s*\(/,
    /^#include/,
    /^package\s/,
    /^using\s/,
    /^public\s/,
    /^private\s/,
    /^protected\s/
  ]

  // 检查是否包含多行代码结构
  const lines = text.split('\n')
  if (lines.length > 2) {
    const indentedLines = lines.filter(line => /^\s+/.test(line))
    if (indentedLines.length > 1) return true
  }

  // 检查是否匹配代码模式
  return codePatterns.some(pattern => pattern.test(text.trim()))
}

// 格式化代码
export function formatCode(code) {
  // TODO: 根据不同语言实现代码格式化
  return code
}

// 提取代码中的函数名
export function extractFunctions(code) {
  const functionPattern = /function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(/g
  const functions = []
  let match

  while ((match = functionPattern.exec(code)) !== null) {
    functions.push(match[1])
  }

  return functions
}

// 提取代码中的类名
export function extractClasses(code) {
  const classPattern = /class\s+([a-zA-Z_$][0-9a-zA-Z_$]*)/g
  const classes = []
  let match

  while ((match = classPattern.exec(code)) !== null) {
    classes.push(match[1])
  }

  return classes
}

// 生成代码片段标题
export function generateCodeTitle(code) {
  const functions = extractFunctions(code)
  const classes = extractClasses(code)
  
  if (classes.length > 0) {
    return `类: ${classes[0]}`
  } else if (functions.length > 0) {
    return `函数: ${functions[0]}`
  } else {
    const firstLine = code.split('\n')[0].trim()
    return firstLine.length > 30 ? firstLine.substring(0, 30) + '...' : firstLine
  }
} 