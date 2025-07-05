-- +goose Up
-- +goose StatementBegin
CREATE TABLE load_tests (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    config JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    results JSONB
);

-- Create indexes for better query performance
CREATE INDEX idx_load_tests_user_id ON load_tests(user_id);
CREATE INDEX idx_load_tests_status ON load_tests(status);
CREATE INDEX idx_load_tests_created_at ON load_tests(created_at DESC);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS load_tests;
-- +goose StatementEnd