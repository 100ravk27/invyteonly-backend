-- Create wishlist_master table for user's personal wishlist items
USE invyteonly;

CREATE TABLE IF NOT EXISTS wishlist_master (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  item_name VARCHAR(300) NOT NULL,
  item_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_wishlist_master_user (user_id),
  INDEX idx_wishlist_master_name (item_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

