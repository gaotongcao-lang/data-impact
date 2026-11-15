-- Data^Impact likes and comments (Cloudflare D1)
CREATE TABLE IF NOT EXISTS likes (
  page TEXT NOT NULL,
  visitor TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (page, visitor)
);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page TEXT NOT NULL,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_hash TEXT,
  hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS comments_page ON comments (page, hidden, id);
CREATE INDEX IF NOT EXISTS comments_ip ON comments (ip_hash, created_at);
