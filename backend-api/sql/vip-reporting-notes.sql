-- The pasted schema has an unfinished rental_requests declaration after post_reactions.
-- Remove that orphaned fragment, then use this valid table definition.
CREATE TABLE IF NOT EXISTS rental_requests (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  tenant_id INT DEFAULT NULL,
  status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  note VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_rental_post_status (post_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- These indexes keep the admin revenue charts fast as the data grows.
CREATE INDEX idx_subscriptions_created_status ON subscriptions (created_at, status);
CREATE INDEX idx_transactions_created_status ON transactions (created_at, status);
