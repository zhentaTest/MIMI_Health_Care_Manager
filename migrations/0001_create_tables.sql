-- 미미 식단 관리 데이터베이스 스키마
-- Cloudflare D1 (SQLite 호환)

-- 기록 테이블
CREATE TABLE IF NOT EXISTS mimi_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
    water TEXT CHECK(water IN ('자급', '지급') OR water IS NULL),
    food_amount INTEGER CHECK(food_amount >= 10 AND food_amount <= 60 OR food_amount IS NULL),
    snack_partymix INTEGER CHECK(snack_partymix >= 1 AND snack_partymix <= 20 OR snack_partymix IS NULL),
    snack_jogong INTEGER CHECK(snack_jogong >= 1 AND snack_jogong <= 20 OR snack_jogong IS NULL),
    snack_churu INTEGER DEFAULT 0,
    poop_count INTEGER CHECK(poop_count >= 1 AND poop_count <= 20 OR poop_count IS NULL),
    urine_size TEXT CHECK(urine_size IN ('대', '중', '소') OR urine_size IS NULL),
    memo TEXT
);

-- 날짜 범위 쿼리 최적화를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_recorded_at ON mimi_records(recorded_at);

-- Rate limiting을 위한 테이블 (KV 대신 D1 사용 시)
CREATE TABLE IF NOT EXISTS login_attempts (
    ip_address TEXT PRIMARY KEY,
    attempt_count INTEGER DEFAULT 0,
    last_attempt TEXT,
    locked_until TEXT
);
