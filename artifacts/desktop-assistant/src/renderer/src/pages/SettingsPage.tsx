import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings, Palette, Cpu, Keyboard, Scan, Info,
  Plus, Trash2, Edit2, Check, X, TestTube2, Eye, EyeOff,
  Sun, Moon, Monitor, ExternalLink, RefreshCw, Copy, Download, Upload, Activity
} from 'lucide-react'
import { useSettingsStore } from '../stores/settings-store'
import { useProviderStore } from '../stores/provider-store'
import { useTheme } from '../hooks/useTheme'
import { useUIStore } from '../stores/ui-store'
import { cn } from '../utils/cn'
import type { ModelInfo, ProviderConfig, ProviderType, FontSize, Theme, WindowMode } from '@shared/types'
import { v4 as uuidv4 } from 'uuid'

type Tab = 'general' | 'providers' | 'shortcuts' | 'ocr' | 'about'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Settings size={14} /> },
  { id: 'providers', label: 'Providers', icon: <Cpu size={14} /> },
  { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard size={14} /> },
  { id: 'ocr', label: 'OCR', icon: <Scan size={14} /> },
  { id: 'about', label: 'About', icon: <Info size={14} /> },
]

const PROVIDER_TYPES: { value: ProviderType; label: string; needsKey: boolean; needsUrl: boolean }[] = [
  { value: 'openai', label: 'OpenAI', needsKey: true, needsUrl: false },
  { value: 'anthropic', label: 'Anthropic', needsKey: true, needsUrl: false },
  { value: 'gemini', label: 'Google Gemini', needsKey: true, needsUrl: false },
  { value: 'xai', label: 'xAI', needsKey: true, needsUrl: false },
  { value: 'openrouter', label: 'OpenRouter', needsKey: true, needsUrl: false },
  { value: 'groq', label: 'Groq', needsKey: true, needsUrl: false },
  { value: 'deepseek', label: 'DeepSeek', needsKey: true, needsUrl: false },
  { value: 'together', label: 'Together', needsKey: true, needsUrl: false },
  { value: 'fireworks', label: 'Fireworks', needsKey: true, needsUrl: false },
  { value: 'ollama', label: 'Ollama (Local)', needsKey: false, needsUrl: true },
  { value: 'lmstudio', label: 'LM Studio', needsKey: false, needsUrl: true },
  { value: 'azure-openai', label: 'Azure OpenAI', needsKey: true, needsUrl: true },
  { value: 'bedrock', label: 'AWS Bedrock', needsKey: true, needsUrl: true },
  { value: 'vertex-ai', label: 'Vertex AI', needsKey: true, needsUrl: true },
  { value: 'custom', label: 'Custom / OpenAI-compatible', needsKey: true, needsUrl: true },
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">{children}</h3>
  )
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="flex-1 min-w-0 mr-4">
        <div className="text-sm text-gray-200">{label}</div>
        {description && <div className="text-xs text-gray-600 mt-0.5">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-9 h-5 rounded-full transition-colors',
        checked ? 'bg-indigo-500' : 'bg-white/15'
      )}
    >
      <div
        className={cn(
          'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
          checked && 'translate-x-4'
        )}
      />
    </button>
  )
}

/* ── Provider Form ───────────────────────────────────────────── */

interface ProviderFormProps {
  provider?: ProviderConfig | null
  onSave: (p: ProviderConfig) => void
  onCancel: () => void
}

function ProviderForm({ provider, onSave, onCancel }: ProviderFormProps) {
  const [type, setType] = useState<ProviderType>(provider?.type ?? 'openai')
  const [name, setName] = useState(provider?.name ?? '')
  const [apiKey, setApiKey] = useState(provider?.apiKey ?? '')
  const [baseUrl, setBaseUrl] = useState(provider?.baseUrl ?? '')
  const [defaultModel, setDefaultModel] = useState(provider?.defaultModel ?? '')
  const [fallbackModel, setFallbackModel] = useState(provider?.fallbackModel ?? '')
  const [manualModel, setManualModel] = useState(false)
  const [modelQuery, setModelQuery] = useState('')
  const [models, setModels] = useState<ModelInfo[]>(provider?.availableModels ?? [])
  const [refreshing, setRefreshing] = useState(false)
  const [temperature, setTemperature] = useState(provider?.temperature?.toString() ?? '')
  const [maxTokens, setMaxTokens] = useState(provider?.maxTokens?.toString() ?? '')
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const testProvider = useProviderStore((s) => s.testProvider)
  const refreshModels = useProviderStore((s) => s.refreshModels)
  const discoverModels = useProviderStore((s) => s.discoverModels)
  const addNotification = useUIStore((s) => s.addNotification)

  const typeInfo = PROVIDER_TYPES.find((t) => t.value === type)!
  const filteredModels = models.filter((model) =>
    `${model.name} ${model.id}`.toLowerCase().includes(modelQuery.toLowerCase())
  )
  const capabilities = provider?.capabilities
  const health = provider?.health

  const buildConfig = (): ProviderConfig => ({
    id: provider?.id ?? `__temp_provider__${Date.now()}`,
    type,
    name: name.trim() || typeInfo.label || type,
    apiKey: apiKey.trim() || undefined,
    baseUrl: baseUrl.trim() || undefined,
    defaultModel: defaultModel.trim() || undefined,
    fallbackModel: fallbackModel.trim() || undefined,
    availableModels: models,
    lastModelRefresh: provider?.lastModelRefresh,
    capabilities: provider?.capabilities,
    health: provider?.health,
    temperature: temperature.trim() ? Number(temperature) : undefined,
    maxTokens: maxTokens.trim() ? Number(maxTokens) : undefined,
    enabled: provider?.enabled ?? true,
  })

  const handleRefreshModels = async () => {
    setRefreshing(true)
    try {
      const discovered = provider
        ? await refreshModels(provider.id)
        : await discoverModels(buildConfig())
      setModels(discovered)
      if (!defaultModel && discovered[0]) setDefaultModel(discovered[0].id)
      addNotification({ type: 'success', title: 'Models refreshed', message: `${discovered.length} models available` })
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Model refresh failed',
        message: err instanceof Error ? err.message : String(err)
      })
    } finally {
      setRefreshing(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const ok = await testProvider(provider?.id ?? buildConfig())
      setTestResult(ok)
      addNotification({ type: ok ? 'success' : 'error', title: ok ? 'Connection successful' : 'Connection failed' })
    } finally {
      setTesting(false)
    }
  }

 const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()

  const providerLabel =
    PROVIDER_TYPES.find((t) => t.value === type)?.label

  const resolvedName =
    name.trim() || providerLabel || type

  onSave({
    id: provider?.id ?? uuidv4(),
    type,
    name: resolvedName,
    apiKey: apiKey.trim() || undefined,
    baseUrl: baseUrl.trim() || undefined,
    defaultModel: defaultModel.trim() || undefined,
    fallbackModel: fallbackModel.trim() || undefined,
    availableModels: models,
    lastModelRefresh: models.length ? Date.now() : provider?.lastModelRefresh,
    capabilities: provider?.capabilities,
    health: provider?.health,
    temperature: temperature.trim() ? Number(temperature) : undefined,
    maxTokens: maxTokens.trim() ? Number(maxTokens) : undefined,
    enabled: provider?.enabled ?? true,
  })
}
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Provider Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ProviderType)}
          className="input-base cursor-pointer"
          aria-label="Provider type"
        >
          {PROVIDER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Display Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={typeInfo.label}
          className="input-base"
          aria-label="Provider name"
        />
      </div>

      {typeInfo.needsKey && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="input-base pr-10"
              aria-label="API key"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      )}

      {typeInfo.needsUrl && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Base URL {type === 'ollama' ? '(required)' : '(optional)'}
          </label>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={type === 'ollama' ? 'http://localhost:11434' : 'https://api.example.com/v1'}
            className="input-base"
            aria-label="Base URL"
          />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-medium text-gray-400">Default Model</label>
          <button
            type="button"
            onClick={() => setManualModel((v) => !v)}
            className="text-[11px] text-gray-500 hover:text-gray-300"
          >
            {manualModel ? 'Use discovered list' : 'Manual entry'}
          </button>
        </div>
        {manualModel ? (
          <input
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            placeholder="Enter model ID"
            className="input-base"
            aria-label="Default model"
          />
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={modelQuery}
                onChange={(e) => setModelQuery(e.target.value)}
                placeholder="Search discovered models"
                className="input-base flex-1"
                aria-label="Search models"
              />
              <button
                type="button"
                onClick={handleRefreshModels}
                disabled={refreshing}
                className="px-3 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-50"
                aria-label="Refresh models"
              >
                <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} />
              </button>
            </div>
            <select
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              className="input-base cursor-pointer"
              aria-label="Default model"
            >
              <option value="">Select a discovered model</option>
              {filteredModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name || model.id}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Fallback Model</label>
        <select
          value={fallbackModel}
          onChange={(e) => setFallbackModel(e.target.value)}
          className="input-base cursor-pointer"
          aria-label="Fallback model"
        >
          <option value="">Automatic</option>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name || model.id}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Temperature</label>
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            placeholder="Provider default"
            className="input-base"
            aria-label="Temperature"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Max Output</label>
          <input
            type="number"
            min={1}
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
            placeholder="Provider default"
            className="input-base"
            aria-label="Max output tokens"
          />
        </div>
      </div>

      {(capabilities || health) && (
        <div className="rounded-xl border border-white/8 bg-white/3 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Activity size={13} />
            <span>{health?.status ?? 'Diagnostics'}</span>
            {health?.latencyMs != null && <span>{health.latencyMs} ms</span>}
            {models.length > 0 && <span>{models.length} models</span>}
          </div>
          {capabilities && (
            <div className="flex flex-wrap gap-1.5">
              {[
                ['Streaming', capabilities.supportsStreaming],
                ['Vision', capabilities.supportsVision],
                ['Reasoning', capabilities.supportsReasoning],
                ['Tools', capabilities.supportsTools],
                ['Embeddings', capabilities.supportsEmbeddings],
                ['JSON', capabilities.supportsJson],
              ].filter(([, enabled]) => enabled).map(([label]) => (
                <span key={String(label)} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors',
            testResult === true ? 'bg-emerald-500/15 text-emerald-400' :
            testResult === false ? 'bg-red-500/15 text-red-400' :
            'bg-white/5 text-gray-400 hover:bg-white/10'
          )}
        >
          {testing ? (
            <RefreshCw size={13} className="animate-spin" />
          ) : testResult === true ? (
            <Check size={13} />
          ) : (
            <TestTube2 size={13} />
          )}
          Test
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 rounded-xl text-sm text-gray-400 bg-white/5 hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 py-2 rounded-xl text-sm text-white bg-indigo-500 hover:bg-indigo-400 transition-colors"
        >
          {provider ? 'Update' : 'Add Provider'}
        </button>
      </div>
    </form>
  )
}

/* ── Tabs ─────────────────────────────────────────────────────── */

function GeneralTab() {
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const { setTheme } = useTheme()

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'dark', label: 'Dark', icon: <Moon size={13} /> },
    { value: 'light', label: 'Light', icon: <Sun size={13} /> },
    { value: 'system', label: 'System', icon: <Monitor size={13} /> },
  ]

  const fontSizes: { value: FontSize; label: string }[] = [
    { value: 'sm', label: 'Small' },
    { value: 'md', label: 'Medium' },
    { value: 'lg', label: 'Large' },
    { value: 'xl', label: 'Extra Large' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Appearance</SectionTitle>
        <div className="rounded-xl bg-white/3 border border-white/6 px-4 divide-y divide-white/5">
          <SettingRow label="Theme" description="Choose your preferred color scheme">
            <div className="flex gap-1">
              {themes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all',
                    settings.theme === t.value
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-gray-500 hover:bg-white/8 hover:text-gray-300'
                  )}
                  aria-label={`${t.label} theme`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow label="Font Size" description="Adjust the text size throughout the app">
            <div className="flex gap-1">
              {fontSizes.map((fs) => (
                <button
                  key={fs.value}
                  onClick={() => updateSettings({ fontSize: fs.value })}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs transition-all',
                    settings.fontSize === fs.value
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-gray-500 hover:bg-white/8 hover:text-gray-300'
                  )}
                  aria-label={`${fs.label} font size`}
                >
                  {fs.label}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow label="Window Opacity" description="Adjust window transparency">
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.05}
              value={settings.windowOpacity}
              onChange={(e) => updateSettings({ windowOpacity: parseFloat(e.target.value) })}
              className="w-24 accent-indigo-500"
              aria-label="Window opacity"
            />
          </SettingRow>
        </div>
      </div>

      <div>
        <SectionTitle>Chat</SectionTitle>
        <div className="rounded-xl bg-white/3 border border-white/6 px-4 divide-y divide-white/5">
          <SettingRow label="Send with Enter" description="Press Enter to send (Shift+Enter for newline)">
            <Toggle
              checked={settings.sendWithEnter}
              onChange={(v) => updateSettings({ sendWithEnter: v })}
              label="Send with Enter"
            />
          </SettingRow>
          <SettingRow label="Streaming Responses" description="Show AI responses as they're generated">
            <Toggle
              checked={settings.streamingEnabled}
              onChange={(v) => updateSettings({ streamingEnabled: v })}
              label="Streaming responses"
            />
          </SettingRow>
          <SettingRow label="Markdown Rendering" description="Render markdown in assistant messages">
            <Toggle
              checked={settings.markdownEnabled}
              onChange={(v) => updateSettings({ markdownEnabled: v })}
              label="Markdown rendering"
            />
          </SettingRow>
          <SettingRow label="Code Highlighting" description="Syntax highlighting in code blocks">
            <Toggle
              checked={settings.codeHighlightEnabled}
              onChange={(v) => updateSettings({ codeHighlightEnabled: v })}
              label="Code highlighting"
            />
          </SettingRow>
          <SettingRow label="Show Token Count" description="Display token counts on messages">
            <Toggle
              checked={settings.showTokenCount}
              onChange={(v) => updateSettings({ showTokenCount: v })}
              label="Show token count"
            />
          </SettingRow>
          <SettingRow label="Max Context Messages" description="Number of messages sent to AI">
            <input
              type="number"
              min={4}
              max={100}
              value={settings.maxContextMessages}
              onChange={(e) => updateSettings({ maxContextMessages: parseInt(e.target.value) || 20 })}
              className="w-16 text-center input-base py-1"
              aria-label="Max context messages"
            />
          </SettingRow>
        </div>
      </div>

      <div>
        <SectionTitle>System</SectionTitle>
        <div className="rounded-xl bg-white/3 border border-white/6 px-4 divide-y divide-white/5">
          <SettingRow label="Auto Start" description="Launch app when system starts">
            <Toggle
              checked={settings.autoStart}
              onChange={(v) => updateSettings({ autoStart: v })}
              label="Auto start"
            />
          </SettingRow>
          <SettingRow label="Minimize to Tray" description="Keep app running in system tray when closed">
            <Toggle
              checked={settings.minimizeToTray}
              onChange={(v) => updateSettings({ minimizeToTray: v })}
              label="Minimize to tray"
            />
          </SettingRow>
          <SettingRow label="Notifications" description="Show desktop notifications">
            <Toggle
              checked={settings.notificationsEnabled}
              onChange={(v) => updateSettings({ notificationsEnabled: v })}
              label="Notifications"
            />
          </SettingRow>
        </div>
      </div>
    </div>
  )
}

function ProvidersTab() {
  const providers = useProviderStore((s) => s.providers)
  const loadProviders = useProviderStore((s) => s.loadProviders)
  const saveProvider = useProviderStore((s) => s.saveProvider)
  const deleteProvider = useProviderStore((s) => s.deleteProvider)
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const addNotification = useUIStore((s) => s.addNotification)

  const [showForm, setShowForm] = useState(false)
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null)

  useEffect(() => {
    loadProviders()
  }, [loadProviders])

  const handleSave = async (config: ProviderConfig) => {
    await saveProvider(config)

    if (!settings.defaultProviderId || !providers.some((p) => p.id === settings.defaultProviderId)) {
      updateSettings({ defaultProviderId: config.id, defaultModel: config.defaultModel || '' })
    }

    setShowForm(false)
    setEditingProvider(null)
    addNotification({ type: 'success', title: editingProvider ? 'Provider updated' : 'Provider added' })
  }

  const handleDelete = async (id: string) => {
    await deleteProvider(id)
    addNotification({ type: 'success', title: 'Provider removed' })
  }

  const handleSetDefault = (id: string, model?: string) => {
    updateSettings({ defaultProviderId: id, defaultModel: model || '' })
    addNotification({ type: 'success', title: 'Default provider set' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>AI Providers</SectionTitle>
        <button
          onClick={() => { setEditingProvider(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 text-indigo-400 text-xs hover:bg-indigo-500/25 transition-colors"
          aria-label="Add provider"
        >
          <Plus size={12} />
          Add Provider
        </button>
      </div>

      <AnimatePresence>
        {(showForm || editingProvider) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-white/3 border border-white/10 mb-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-4">
                {editingProvider ? 'Edit Provider' : 'Add New Provider'}
              </h3>
              <ProviderForm
                provider={editingProvider}
                onSave={handleSave}
                onCancel={() => { setShowForm(false); setEditingProvider(null) }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center border-2 border-dashed border-white/8 rounded-2xl">
          <Cpu size={24} className="text-gray-600" />
          <div>
            <p className="text-sm text-gray-500">No providers configured</p>
            <p className="text-xs text-gray-700 mt-1">Add an AI provider to start chatting</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {providers.map((provider) => {
            const isDefault = settings.defaultProviderId === provider.id
            const typeInfo = PROVIDER_TYPES.find((t) => t.value === provider.type)
            return (
              <div
                key={provider.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border transition-all',
                  isDefault
                    ? 'bg-indigo-500/8 border-indigo-500/20'
                    : 'bg-white/3 border-white/6 hover:border-white/10'
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center shrink-0">
                  <Cpu size={14} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-200">{provider.name}</span>
                    {isDefault && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-400 font-medium">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    {typeInfo?.label}
                    {provider.defaultModel && ` · ${provider.defaultModel}`}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!isDefault && (
                    <button
                      onClick={() => handleSetDefault(provider.id, provider.defaultModel)}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors text-xs"
                      title="Set as default"
                      aria-label="Set as default provider"
                    >
                      <Check size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => { setEditingProvider(provider); setShowForm(false) }}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-white/8 transition-colors"
                    aria-label="Edit provider"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(provider.id)}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    aria-label="Delete provider"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ShortcutsTab() {
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)

  const shortcuts = [
    { key: 'toggleWindow', label: 'Toggle Window', description: 'Show/hide the main window' },
    { key: 'captureScreen', label: 'Capture Screen', description: 'Capture full screen for OCR' },
    { key: 'captureRegion', label: 'Capture Region', description: 'Select a region to capture' },
    { key: 'newConversation', label: 'New Conversation', description: 'Start a new chat' },
    { key: 'commandPalette', label: 'Command Palette', description: 'Open the command palette' },
    { key: 'sendMessage', label: 'Send Message', description: 'Send the current message' },
    { key: 'focusInput', label: 'Focus Input', description: 'Focus the message input' },
  ] as const

  const handleChange = (key: keyof typeof settings.shortcuts, value: string) => {
    updateSettings({
      shortcuts: { ...settings.shortcuts, [key]: value },
    })
  }

  return (
    <div>
      <SectionTitle>Keyboard Shortcuts</SectionTitle>
      <div className="rounded-xl bg-white/3 border border-white/6 px-4 divide-y divide-white/5">
        {shortcuts.map((shortcut) => (
          <SettingRow key={shortcut.key} label={shortcut.label} description={shortcut.description}>
            <input
              value={settings.shortcuts[shortcut.key]}
              onChange={(e) => handleChange(shortcut.key, e.target.value)}
              className="w-48 input-base py-1 text-xs font-mono text-center"
              aria-label={`Shortcut for ${shortcut.label}`}
              placeholder="e.g. CommandOrControl+K"
            />
          </SettingRow>
        ))}
      </div>
      <p className="text-xs text-gray-600 mt-3">
        Use modifiers: <code className="font-mono">CommandOrControl</code>, <code className="font-mono">Shift</code>, <code className="font-mono">Alt</code>, <code className="font-mono">Meta</code>
      </p>
    </div>
  )
}

function OCRTab() {
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)

  const languages = [
    { code: 'eng', label: 'English' },
    { code: 'fra', label: 'French' },
    { code: 'deu', label: 'German' },
    { code: 'spa', label: 'Spanish' },
    { code: 'ita', label: 'Italian' },
    { code: 'por', label: 'Portuguese' },
    { code: 'rus', label: 'Russian' },
    { code: 'jpn', label: 'Japanese' },
    { code: 'kor', label: 'Korean' },
    { code: 'chi_sim', label: 'Chinese (Simplified)' },
    { code: 'chi_tra', label: 'Chinese (Traditional)' },
    { code: 'ara', label: 'Arabic' },
  ]

  return (
    <div>
      <SectionTitle>OCR Settings</SectionTitle>
      <div className="rounded-xl bg-white/3 border border-white/6 px-4 divide-y divide-white/5">
        <SettingRow label="OCR Language" description="Primary language for text recognition">
          <select
            value={settings.ocrLanguage}
            onChange={(e) => updateSettings({ ocrLanguage: e.target.value })}
            className="input-base w-48 cursor-pointer py-1.5"
            aria-label="OCR language"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </SettingRow>
      </div>
    </div>
  )
}

function AboutTab() {
  const openExternal = (url: string) => {
    const apiAny = window.api as any
    if (typeof apiAny['system:openExternal'] === 'function') {
      apiAny['system:openExternal'](url)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
          <Settings size={28} className="text-indigo-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-100">AI Assistant</h2>
          <p className="text-sm text-gray-500 mt-1">Desktop AI productivity tool</p>
          <p className="text-xs text-gray-600 mt-1">Version 1.0.0</p>
        </div>
      </div>

      <div className="rounded-xl bg-white/3 border border-white/6 px-4 divide-y divide-white/5">
        <SettingRow label="Repository" description="View source code and contribute">
          <button
            onClick={() => openExternal('https://github.com')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10 text-xs transition-colors"
          >
            <ExternalLink size={12} />
            GitHub
          </button>
        </SettingRow>
        <SettingRow label="License" description="MIT License">
          <span className="text-xs text-gray-500">MIT</span>
        </SettingRow>
        <SettingRow label="Built with" description="Technologies used">
          <div className="flex gap-1 flex-wrap justify-end">
            {['Electron', 'React', 'TypeScript', 'Tailwind'].map((tech) => (
              <span
                key={tech}
                className="px-2 py-0.5 rounded text-[10px] bg-white/8 text-gray-400"
              >
                {tech}
              </span>
            ))}
          </div>
        </SettingRow>
      </div>
    </div>
  )
}

/* ── Main Settings Page ──────────────────────────────────────── */

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('general')

  const tabContent: Record<Tab, React.ReactNode> = {
    general: <GeneralTab />,
    providers: <ProvidersTab />,
    shortcuts: <ShortcutsTab />,
    ocr: <OCRTab />,
    about: <AboutTab />,
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/8 shrink-0">
        <h1 className="text-lg font-semibold text-gray-100">Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">Configure your AI assistant</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Tab sidebar */}
        <div className="w-40 shrink-0 border-r border-white/8 py-3 px-2 space-y-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all',
                activeTab === tab.id
                  ? 'bg-indigo-500/15 text-indigo-300'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/8'
              )}
              aria-label={tab.label}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span className={cn('shrink-0', activeTab === tab.id ? 'text-indigo-400' : 'text-gray-600')}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15 }}
            >
              {tabContent[activeTab]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
