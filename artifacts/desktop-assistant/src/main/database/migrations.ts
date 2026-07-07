import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

export function runMigrations(db: Database.Database): void {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      run_at INTEGER NOT NULL
    )
  `)

  const migrations: { name: string; up: () => void }[] = [
    {
      name: '001_initial_schema',
      up: () => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS conversation_folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT,
            order_index INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL
          );

          CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            folder_id TEXT REFERENCES conversation_folders(id) ON DELETE SET NULL,
            summary TEXT,
            model TEXT,
            provider_id TEXT,
            pinned INTEGER DEFAULT 0,
            archived INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          );

          CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
            content TEXT NOT NULL,
            images TEXT,
            attachments TEXT,
            tokens INTEGER,
            model TEXT,
            provider_id TEXT,
            is_error INTEGER DEFAULT 0,
            metadata TEXT,
            created_at INTEGER NOT NULL
          );

          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS ocr_history (
            id TEXT PRIMARY KEY,
            text TEXT NOT NULL,
            confidence REAL,
            image_data TEXT,
            source TEXT,
            language TEXT,
            created_at INTEGER NOT NULL
          );

          CREATE TABLE IF NOT EXISTS prompt_templates (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            content TEXT NOT NULL,
            category TEXT NOT NULL,
            tags TEXT,
            is_favorite INTEGER DEFAULT 0,
            usage_count INTEGER DEFAULT 0,
            is_builtin INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          );

          CREATE TABLE IF NOT EXISTS providers (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            api_key TEXT,
            base_url TEXT,
            default_model TEXT,
            enabled INTEGER DEFAULT 1,
            proxy_url TEXT,
            custom_headers TEXT,
            available_models TEXT,
            last_model_refresh INTEGER,
            capabilities TEXT,
            health TEXT,
            fallback_model TEXT,
            temperature REAL,
            max_tokens INTEGER,
            top_p REAL,
            presence_penalty REAL,
            frequency_penalty REAL,
            system_prompt TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          );

          CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
          CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
          CREATE INDEX IF NOT EXISTS idx_conversations_folder_id ON conversations(folder_id);
          CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
        `)
      }
    },
    {
      name: '002_seed_default_settings',
      up: () => {
        const now = Date.now()
        const defaultSettings: Record<string, unknown> = {
          theme: 'dark',
          fontSize: 'md',
          defaultProviderId: '',
          defaultModel: '',
          streamingEnabled: true,
          markdownEnabled: true,
          codeHighlightEnabled: true,
          ocrLanguage: 'eng',
          windowMode: 'normal',
          windowOpacity: 1,
          autoStart: false,
          minimizeToTray: true,
          notificationsEnabled: true,
          sendWithEnter: true,
          showTokenCount: true,
          autoSummarize: false,
          maxContextMessages: 50,
          shortcuts: JSON.stringify({
            toggleWindow: 'CommandOrControl+Shift+A',
            captureScreen: 'CommandOrControl+Shift+S',
            captureRegion: 'CommandOrControl+Shift+R',
            captureWindow: 'CommandOrControl+Shift+W',
            newConversation: 'CommandOrControl+N',
            commandPalette: 'CommandOrControl+K',
            sendMessage: 'Enter',
            focusInput: 'Escape'
          })
        }

        const insert = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`)
        const insertMany = db.transaction((entries: [string, unknown][]) => {
          for (const [key, value] of entries) {
            insert.run(key, JSON.stringify(value))
          }
        })

        insertMany(Object.entries(defaultSettings))

        // Seed default OpenAI provider
        db.prepare(`
          INSERT OR IGNORE INTO providers
            (id, type, name, api_key, base_url, default_model, enabled, proxy_url, custom_headers, created_at, updated_at)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'openai',
          'openai',
          'OpenAI',
          '',
          'https://api.openai.com/v1',
          null,
          1,
          null,
          JSON.stringify({}),
          now,
          now
        )

        // Seed builtin prompt templates
        const promptInsert = db.prepare(`
          INSERT OR IGNORE INTO prompt_templates
            (id, title, description, content, category, tags, is_favorite, usage_count, is_builtin, created_at, updated_at)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        const builtinPrompts = [
          {
            id: 'builtin-summarize',
            title: 'Summarize Text',
            description: 'Condense long text into a concise summary',
            content: 'Please summarize the following text concisely, capturing the key points and main ideas:\n\n{{text}}',
            category: 'summarization',
            tags: ['summarize', 'condense', 'tldr']
          },
          {
            id: 'builtin-code-review',
            title: 'Code Review',
            description: 'Review code for quality, bugs, and improvements',
            content: 'Please review the following code. Look for:\n- Bugs or potential errors\n- Performance issues\n- Security vulnerabilities\n- Code style and readability\n- Suggestions for improvement\n\n```\n{{code}}\n```',
            category: 'coding',
            tags: ['code', 'review', 'quality']
          },
          {
            id: 'builtin-debug',
            title: 'Debug Code',
            description: 'Help identify and fix bugs in code',
            content: 'I have the following code that is not working as expected:\n\n```\n{{code}}\n```\n\nThe error/issue is: {{error}}\n\nPlease help me identify the bug and provide a fix.',
            category: 'debugging',
            tags: ['debug', 'fix', 'error']
          },
          {
            id: 'builtin-translate',
            title: 'Translate Text',
            description: 'Translate text to a target language',
            content: 'Please translate the following text to {{language}}. Preserve the original tone and meaning as closely as possible:\n\n{{text}}',
            category: 'translation',
            tags: ['translate', 'language', 'localization']
          },
          {
            id: 'builtin-improve-writing',
            title: 'Improve Writing',
            description: 'Enhance clarity, style, and grammar of text',
            content: 'Please improve the following text. Focus on:\n- Clarity and readability\n- Grammar and punctuation\n- Flow and structure\n- Word choice\n\nKeep the original meaning intact.\n\n{{text}}',
            category: 'writing',
            tags: ['writing', 'grammar', 'style', 'editing']
          },
          {
            id: 'builtin-email',
            title: 'Write Professional Email',
            description: 'Compose a professional email',
            content: 'Write a professional email with the following details:\n\nTo: {{recipient}}\nSubject: {{subject}}\nPurpose: {{purpose}}\nTone: {{tone}}\n\nMake it concise, polite, and clear.',
            category: 'email',
            tags: ['email', 'professional', 'communication']
          },
          {
            id: 'builtin-explain',
            title: 'Explain Concept',
            description: 'Explain a complex concept in simple terms',
            content: 'Please explain the following concept in simple, easy-to-understand terms. Use analogies or examples where helpful:\n\n{{concept}}\n\nTarget audience: {{audience}}',
            category: 'explanation',
            tags: ['explain', 'simplify', 'teach']
          },
          {
            id: 'builtin-research',
            title: 'Research Summary',
            description: 'Summarize research on a topic',
            content: 'Please provide a comprehensive research summary on the following topic:\n\n{{topic}}\n\nInclude:\n- Key concepts and definitions\n- Current state of knowledge\n- Important findings or debates\n- Practical implications\n- Suggested further reading',
            category: 'research',
            tags: ['research', 'summary', 'analysis']
          },
          {
            id: 'builtin-brainstorm',
            title: 'Brainstorm Ideas',
            description: 'Generate creative ideas on a topic',
            content: 'Please brainstorm creative and diverse ideas for the following:\n\n{{topic}}\n\nGenerate at least 10 ideas, ranging from conventional to innovative. For each idea, provide a brief explanation of its potential.',
            category: 'brainstorming',
            tags: ['brainstorm', 'ideas', 'creative', 'ideation']
          }
        ]

        const insertPrompts = db.transaction(() => {
          for (const p of builtinPrompts) {
            promptInsert.run(
              p.id,
              p.title,
              p.description,
              p.content,
              p.category,
              JSON.stringify(p.tags),
              0,
              0,
              1,
              now,
              now
            )
          }
        })
        insertPrompts()
      }
    },
    {
      name: '003_provider_metadata',
      up: () => {
        const columns = db.prepare(`PRAGMA table_info(providers)`).all() as Array<{ name: string }>
        const existing = new Set(columns.map((column) => column.name))
        const addColumn = (name: string, definition: string) => {
          if (!existing.has(name)) {
            db.exec(`ALTER TABLE providers ADD COLUMN ${name} ${definition}`)
          }
        }

        addColumn('available_models', 'TEXT')
        addColumn('last_model_refresh', 'INTEGER')
        addColumn('capabilities', 'TEXT')
        addColumn('health', 'TEXT')
        addColumn('fallback_model', 'TEXT')
        addColumn('temperature', 'REAL')
        addColumn('max_tokens', 'INTEGER')
        addColumn('top_p', 'REAL')
        addColumn('presence_penalty', 'REAL')
        addColumn('frequency_penalty', 'REAL')
        addColumn('system_prompt', 'TEXT')
      }
    }
  ]

  const hasMigration = db.prepare(`SELECT id FROM migrations WHERE name = ?`)

  for (const migration of migrations) {
    const exists = hasMigration.get(migration.name)
    if (!exists) {
      migration.up()
      db.prepare(`INSERT INTO migrations (name, run_at) VALUES (?, ?)`).run(
        migration.name,
        Date.now()
      )
    }
  }
}
