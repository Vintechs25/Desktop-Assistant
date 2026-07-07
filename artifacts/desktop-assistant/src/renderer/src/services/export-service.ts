import type { Conversation, Message } from '@shared/types'

class ExportService {
  /**
   * Export a conversation and its messages to Markdown format.
   */
  toMarkdown(conversation: Conversation, messages: Message[]): string {
    const lines: string[] = []

    // Header
    lines.push(`# ${conversation.title}`)
    lines.push('')

    // Metadata
    const createdDate = new Date(conversation.createdAt).toLocaleString()
    const updatedDate = new Date(conversation.updatedAt).toLocaleString()
    lines.push(`**Created:** ${createdDate}`)
    lines.push(`**Last updated:** ${updatedDate}`)
    if (conversation.model) lines.push(`**Model:** ${conversation.model}`)
    if (conversation.summary) {
      lines.push('')
      lines.push(`**Summary:** ${conversation.summary}`)
    }
    lines.push('')
    lines.push('---')
    lines.push('')

    // Messages
    for (const msg of messages) {
      const timestamp = new Date(msg.createdAt).toLocaleString()
      const roleLabel = this.formatRole(msg.role)

      lines.push(`### ${roleLabel}`)
      lines.push(`*${timestamp}*`)
      lines.push('')

      if (msg.images && msg.images.length > 0) {
        for (const img of msg.images) {
          if (img.startsWith('data:')) {
            lines.push(`> 📷 *[Image attached]*`)
          } else {
            lines.push(`![Image](${img})`)
          }
        }
        lines.push('')
      }

      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          lines.push(`> 📎 *[Attachment: ${att.name} (${this.formatBytes(att.size)})]* `)
        }
        lines.push('')
      }

      lines.push(msg.content)
      lines.push('')

      if (msg.tokens) {
        lines.push(`*Tokens: ${msg.tokens}*`)
        lines.push('')
      }

      lines.push('---')
      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * Export a conversation and its messages to JSON format.
   */
  toJSON(conversation: Conversation, messages: Message[]): string {
    const exportData = {
      exportedAt: new Date().toISOString(),
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        model: conversation.model ?? null,
        providerId: conversation.providerId ?? null,
        summary: conversation.summary ?? null,
        pinned: conversation.pinned,
        archived: conversation.archived,
        folderId: conversation.folderId ?? null,
        messageCount: conversation.messageCount ?? messages.length
      },
      messages: messages.map((msg) => ({
        id: msg.id,
        conversationId: msg.conversationId,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
        model: msg.model ?? null,
        providerId: msg.providerId ?? null,
        tokens: msg.tokens ?? null,
        isError: msg.isError ?? false,
        images: msg.images ?? [],
        attachments: msg.attachments ?? [],
        metadata: msg.metadata ?? {}
      }))
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Export a conversation and its messages to plain text format.
   */
  toText(conversation: Conversation, messages: Message[]): string {
    const lines: string[] = []
    const separator = '─'.repeat(60)

    // Header
    lines.push(conversation.title.toUpperCase())
    lines.push(separator)
    lines.push('')

    // Metadata
    lines.push(`Created:      ${new Date(conversation.createdAt).toLocaleString()}`)
    lines.push(`Last updated: ${new Date(conversation.updatedAt).toLocaleString()}`)
    if (conversation.model) lines.push(`Model:        ${conversation.model}`)
    lines.push(`Messages:     ${messages.length}`)
    if (conversation.summary) {
      lines.push('')
      lines.push(`Summary: ${conversation.summary}`)
    }
    lines.push('')
    lines.push(separator)
    lines.push('')

    // Messages
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      const roleLabel = this.formatRole(msg.role)
      const timestamp = new Date(msg.createdAt).toLocaleString()

      lines.push(`[${roleLabel}] — ${timestamp}`)

      if (msg.images && msg.images.length > 0) {
        lines.push(`[${msg.images.length} image(s) attached]`)
      }

      if (msg.attachments && msg.attachments.length > 0) {
        const attNames = msg.attachments.map((a) => a.name).join(', ')
        lines.push(`[Attachments: ${attNames}]`)
      }

      lines.push('')
      lines.push(msg.content)
      lines.push('')

      if (msg.tokens) {
        lines.push(`[Tokens: ${msg.tokens}]`)
      }

      if (i < messages.length - 1) {
        lines.push(separator)
        lines.push('')
      }
    }

    return lines.join('\n')
  }

  private formatRole(role: string): string {
    switch (role) {
      case 'user':
        return 'You'
      case 'assistant':
        return 'Assistant'
      case 'system':
        return 'System'
      default:
        return role.charAt(0).toUpperCase() + role.slice(1)
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
}

export const exportService = new ExportService()
export { ExportService }
