-- Create consolidated wishlist table (replaces event_wishlist_items, gift_claims, wishlist_master)
USE invyteonly;

CREATE TABLE IF NOT EXISTS wishlist (
  wishlist_id CHAR(36) PRIMARY KEY,
  event_id CHAR(36) NULL, -- NULL for personal wishlist items, NOT NULL for event items
  host_id CHAR(36) NOT NULL,
  gift_name VARCHAR(300) NOT NULL,
  gift_url TEXT,
  gift_image_url TEXT,
  claimed_by CHAR(36) NULL,
  is_claimed TINYINT DEFAULT 0,
  claim_status ENUM('pending', 'confirmed', 'cancelled', 'auto_released') DEFAULT 'pending',
  claimed_at DATETIME NULL,
  confirmed_at TIMESTAMP NULL,
  released_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (claimed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_wishlist_event (event_id),
  INDEX idx_wishlist_host (host_id),
  INDEX idx_wishlist_claimed_by (claimed_by),
  INDEX idx_wishlist_status (claim_status),
  INDEX idx_wishlist_is_claimed (is_claimed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

