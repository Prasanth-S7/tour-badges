CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    badge_received INTEGER DEFAULT 0,
    badgr_username TEXT,
    encrypted_bearer_token TEXT,  
    token_expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);