-- Migration number: 0001 	 2024-01-01T00:00:00.000Z
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    badge_received INTEGER DEFAULT 0,
    provider TEXT NOT NULL,
    badge_status TEXT DEFAULT 'registered',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
); 