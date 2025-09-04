-- Initial database schema for Insight Weaver

-- RSS Feeds table
CREATE TABLE IF NOT EXISTS rss_feeds (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'Uncategorized',
    is_active INTEGER NOT NULL DEFAULT 1,
    last_fetched TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    feed_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    snippet TEXT NOT NULL,
    author TEXT,
    published_at TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    is_read INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    category TEXT,
    summary TEXT,
    analysis TEXT,
    FOREIGN KEY (feed_id) REFERENCES rss_feeds (id) ON DELETE CASCADE
);

-- Workspace items table
CREATE TABLE IF NOT EXISTS workspace_items (
    id TEXT PRIMARY KEY,
    article_id TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    custom_content TEXT,
    custom_analysis TEXT,
    is_edited INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Report items junction table
CREATE TABLE IF NOT EXISTS report_items (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL,
    workspace_item_id TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_item_id) REFERENCES workspace_items (id) ON DELETE CASCADE,
    UNIQUE (report_id, workspace_item_id)
);

-- Settings table for app configuration
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Article embeddings table for semantic search
CREATE TABLE IF NOT EXISTS article_embeddings (
    article_id TEXT PRIMARY KEY,
    embedding BLOB NOT NULL,
    model TEXT NOT NULL DEFAULT '@cf/baai/bge-large-en-v1.5',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles (feed_id);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles (category);
CREATE INDEX IF NOT EXISTS idx_articles_is_read ON articles (is_read);
CREATE INDEX IF NOT EXISTS idx_articles_is_archived ON articles (is_archived);
CREATE INDEX IF NOT EXISTS idx_workspace_items_order ON workspace_items (order_index);
CREATE INDEX IF NOT EXISTS idx_report_items_report_id ON report_items (report_id, order_index);

-- Triggers to update updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_rss_feeds_updated_at 
    AFTER UPDATE ON rss_feeds
    BEGIN
        UPDATE rss_feeds SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_articles_updated_at 
    AFTER UPDATE ON articles
    BEGIN
        UPDATE articles SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_workspace_items_updated_at 
    AFTER UPDATE ON workspace_items
    BEGIN
        UPDATE workspace_items SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_reports_updated_at 
    AFTER UPDATE ON reports
    BEGIN
        UPDATE reports SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_settings_updated_at 
    AFTER UPDATE ON settings
    BEGIN
        UPDATE settings SET updated_at = datetime('now') WHERE key = NEW.key;
    END;

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value) VALUES 
    ('ai_provider', 'cloudflare'),
    ('ai_system_prompt', 'You are a factual, neutral geopolitical analyst. Your task is to summarize the following article. Extract only the key facts, policy statements, and strategic arguments. Avoid speculative language and journalistic flair. Present the summary as a series of bullet points. The summary must be concise and no more than 150 words.'),
    ('ai_max_tokens', '150'),
    ('ai_temperature', '0.3'),
    ('refresh_interval', '30'),
    ('max_articles_per_feed', '50');

-- Insert sample RSS feeds for development
INSERT OR IGNORE INTO rss_feeds (id, name, url, category) VALUES 
    ('feed_cfr', 'Council on Foreign Relations', 'https://www.cfr.org/rss/feeds/analysis', 'Think Tanks'),
    ('feed_state', 'US State Department', 'https://www.state.gov/rss/', 'Official Statements'),
    ('feed_brookings', 'Brookings Institution', 'https://www.brookings.edu/feed/', 'Think Tanks');