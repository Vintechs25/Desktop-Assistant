// ============================================================
// Shared types used across main, preload, and renderer
// ============================================================

// ─── AI Provider ──────────────────────────────────────────────

export type ProviderType =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'xai'
  | 'openrouter'
  | 'groq'
  | 'deepseek'
  | 'together'
  | 'fireworks'
  | 'ollama'
  | 'lmstudio'
  | 'azure-openai'
  | 'bedrock'
  | 'vertex-ai'
  | 'custom'

export interface ProviderConfig {
  id: string
  type: ProviderType
  name: string
  apiKey?: string
  baseUrl?: string
  defaultModel?: string
  enabled: boolean
  proxyUrl?: string
  customHeaders?: Record<string, string>
  availableModels?: ModelInfo[]
  lastModelRefresh?: number
  capabilities?: ProviderCapabilities
  health?: ProviderHealth
  fallbackModel?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  presencePenalty?: number
  frequencyPenalty?: number
  systemPrompt?: string
}

export interface ModelInfo {
  id: string
  name: string
  providerId: string
  contextLength?: number
  maxOutputTokens?: number
  supportsVision?: boolean
  supportsStreaming?: boolean
  supportsEmbeddings?: boolean
  supportsImageGeneration?: boolean
  supportsTools?: boolean
  supportsJson?: boolean
  supportsReasoning?: boolean
  supportsAudio?: boolean
  description?: string
}

export interface ProviderHealth {
  status: 'connected' | 'disconnected' | 'ok' | 'warning' | 'error'
  lastChecked: number
  details?: string
  latencyMs?: number
  lastSuccessfulCall?: number
  apiReachable?: boolean
  rateLimit?: string
  quota?: string
}

export interface ProviderCapabilities {
  supportsChat: boolean
  supportsStreaming: boolean
  supportsVision: boolean
  supportsEmbeddings: boolean
  supportsTextToSpeech: boolean
  supportsSpeechToText: boolean
  supportsTools: boolean
  supportsReasoning: boolean
  supportsJson: boolean
  supportsImageGeneration: boolean
  supportsAudio: boolean
}

export interface ProviderDiagnostics {
  providerId: string
  connected: boolean
  apiReachable: boolean
  lastSuccessfulCall?: number
  latencyMs?: number
  availableModels: number
  capabilities: ProviderCapabilities
  health: ProviderHealth
  sdkVersion?: string
  apiVersion?: string
  rateLimit?: string
  quota?: string
}

export interface ProviderPricing {
  currency: string
  modelPricing: Array<{ model: string; pricePerUnit: number; unit: string }>
}

export interface ProviderLimits {
  maxContextLength?: number
  maxOutputTokens?: number
  rateLimitPerMinute?: number
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentPart[]
}

export interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string; detail?: 'auto' | 'low' | 'high' }
}

export interface ChatConfig {
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  stream?: boolean
  topP?: number
  presencePenalty?: number
  frequencyPenalty?: number
}

export interface StreamChunk {
  content: string
  done: boolean
  error?: string
}

// ─── Conversation & Messages ──────────────────────────────────

export interface Conversation {
  id: string
  title: string
  folderId?: string | null
  createdAt: number
  updatedAt: number
  summary?: string | null
  model?: string | null
  providerId?: string | null
  pinned: boolean
  archived: boolean
  messageCount?: number
  lastMessage?: string | null
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: string[]
  attachments?: Attachment[]
  createdAt: number
  tokens?: number
  model?: string | null
  providerId?: string | null
  isError?: boolean
  metadata?: Record<string, unknown>
}

export interface Attachment {
  id: string
  name: string
  type: string
  size: number
  data?: string
  url?: string
}

export interface ConversationFolder {
  id: string
  name: string
  color?: string
  createdAt: number
  order: number
}

// ─── OCR ──────────────────────────────────────────────────────

export interface OCRResult {
  id: string
  text: string
  confidence: number
  imageData?: string
  source: 'screen' | 'region' | 'window' | 'file'
  createdAt: number
  language?: string
}

export interface ScreenRegion {
  x: number
  y: number
  width: number
  height: number
}

// ─── Settings ─────────────────────────────────────────────────

export type Theme = 'dark' | 'light' | 'system'
export type FontSize = 'sm' | 'md' | 'lg' | 'xl'
export type WindowMode = 'floating' | 'sidebar' | 'normal'

export interface ShortcutConfig {
  toggleWindow: string
  captureScreen: string
  captureRegion: string
  captureWindow: string
  newConversation: string
  commandPalette: string
  sendMessage: string
  focusInput: string
}

export interface Settings {
  theme: Theme
  fontSize: FontSize
  defaultProviderId: string
  defaultModel: string
  streamingEnabled: boolean
  markdownEnabled: boolean
  codeHighlightEnabled: boolean
  ocrLanguage: string
  shortcuts: ShortcutConfig
  windowMode: WindowMode
  windowOpacity: number
  autoStart: boolean
  minimizeToTray: boolean
  notificationsEnabled: boolean
  proxyUrl?: string
  providerConfigs?: ProviderConfig[]
  sendWithEnter: boolean
  showTokenCount: boolean
  autoSummarize: boolean
  maxContextMessages: number
}

// ─── Prompt Library ───────────────────────────────────────────

export interface PromptTemplate {
  id: string
  title: string
  description?: string
  content: string
  category: PromptCategory
  tags: string[]
  isFavorite: boolean
  usageCount: number
  createdAt: number
  updatedAt: number
  isBuiltin?: boolean
}

export type PromptCategory =
  | 'writing'
  | 'coding'
  | 'analysis'
  | 'summarization'
  | 'translation'
  | 'research'
  | 'email'
  | 'brainstorming'
  | 'debugging'
  | 'explanation'
  | 'custom'

// ─── IPC Channels ─────────────────────────────────────────────

export interface IPCChannels {
  // Window
  'window:minimize': () => void
  'window:maximize': () => void
  'window:close': () => void
  'window:setOpacity': (opacity: number) => void
  'window:setMode': (mode: WindowMode) => void
  'window:toggleFloat': () => void
  'window:setContentProtection': (enabled: boolean) => void

  // Screenshot & OCR
  'capture:screen': () => Promise<string>
  'capture:region': (region?: ScreenRegion) => Promise<string>
  'capture:selectRegion': () => Promise<ScreenRegion>
  'ocr:extract': (imageData: string, language?: string) => Promise<OCRResult>
  'ocr:extractFromScreen': () => Promise<OCRResult>
  'ocr:extractFromRegion': () => Promise<OCRResult>

  // Database
  'db:getConversations': () => Promise<Conversation[]>
  'db:getConversation': (id: string) => Promise<Conversation | null>
  'db:createConversation': (data: Partial<Conversation>) => Promise<Conversation>
  'db:updateConversation': (id: string, data: Partial<Conversation>) => Promise<void>
  'db:deleteConversation': (id: string) => Promise<void>
  'db:getMessages': (conversationId: string) => Promise<Message[]>
  'db:createMessage': (data: Partial<Message>) => Promise<Message>
  'db:updateMessage': (id: string, data: Partial<Message>) => Promise<void>
  'db:deleteMessage': (id: string) => Promise<void>
  'db:getSettings': () => Promise<Settings>
  'db:updateSettings': (data: Partial<Settings>) => Promise<void>
  'db:getPrompts': () => Promise<PromptTemplate[]>
  'db:savePrompt': (data: Partial<PromptTemplate>) => Promise<PromptTemplate>
  'db:deletePrompt': (id: string) => Promise<void>
  'db:getOCRHistory': () => Promise<OCRResult[]>
  'db:saveOCRResult': (data: OCRResult) => Promise<void>
  'db:clearOCRHistory': () => Promise<void>
  'db:getFolders': () => Promise<ConversationFolder[]>
  'db:createFolder': (data: Partial<ConversationFolder>) => Promise<ConversationFolder>
  'db:updateFolder': (id: string, data: Partial<ConversationFolder>) => Promise<void>
  'db:deleteFolder': (id: string) => Promise<void>
  'db:searchConversations': (query: string) => Promise<Conversation[]>
  'db:exportConversation': (id: string, format: 'json' | 'md' | 'txt') => Promise<string>

  // System
  'system:openExternal': (url: string) => void
  'system:getPath': (name: string) => string
  'system:showSaveDialog': (options: object) => Promise<string | null>
  'system:showOpenDialog': (options: object) => Promise<string[] | null>
  'system:saveFile': (attachment: Attachment) => Promise<string | null>
  'system:readFile': (path: string) => Promise<string>
  'system:writeFile': (path: string, content: string) => Promise<void>
  'system:copyToClipboard': (text: string) => void
  'system:readClipboard': () => Promise<string>
  'system:getVersion': () => string
  'system:checkUpdate': () => Promise<{ available: boolean; version?: string }>
}

// ─── Notification ─────────────────────────────────────────────

export interface AppNotification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// ─── Plugin ───────────────────────────────────────────────────

export interface Plugin {
  id: string
  name: string
  version: string
  description: string
  author: string
  enabled: boolean
  icon?: string
  commands?: PluginCommand[]
}

export interface PluginCommand {
  id: string
  label: string
  description?: string
  shortcut?: string
  handler: (context: PluginContext) => Promise<void>
}

export interface PluginContext {
  conversation?: Conversation
  messages?: Message[]
  selectedText?: string
  clipboard?: string
}
