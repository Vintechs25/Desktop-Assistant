import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  if (isToday(date)) {
    return formatDistanceToNow(date, { addSuffix: true })
  }
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'h:mm a')}`
  }
  return format(date, 'MMM d, yyyy')
}

export function formatDateFull(timestamp: number): string {
  return format(new Date(timestamp), 'MMM d, yyyy h:mm a')
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function extractCodeBlocks(markdown: string): { language: string; code: string }[] {
  const regex = /```(\w*)\n([\s\S]*?)```/g
  const blocks: { language: string; code: string }[] = []
  let match
  while ((match = regex.exec(markdown)) !== null) {
    blocks.push({ language: match[1] || 'text', code: match[2] })
  }
  return blocks
}

export function highlightSearchTerms(text: string, query: string): string {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>')
}

export function groupByDate(items: { createdAt: number }[]): Record<string, typeof items> {
  return items.reduce(
    (acc, item) => {
      const date = new Date(item.createdAt)
      let key: string
      if (isToday(date)) key = 'Today'
      else if (isYesterday(date)) key = 'Yesterday'
      else key = format(date, 'MMM d, yyyy')
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    },
    {} as Record<string, typeof items>
  )
}
