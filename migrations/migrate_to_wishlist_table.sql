-- Migration script to consolidate event_wishlist_items, gift_claims, and wishlist_master into single 'wishlist' table
-- Run this after creating the wishlist table

USE invyteonly;

-- Step 1: Create the new consolidated wishlist table
CREATE TABLE IF NOT EXISTS wishlist (
  wishlist_id CHAR(36) PRIMARY KEY,
  event_id CHAR(36) NULL, -- NULL for personal wishlist items
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

-- Step 2: Migrate data from event_wishlist_items to wishlist
-- For items with event_id, get host_id from events table
INSERT INTO wishlist (
  wishlist_id,
  event_id,
  host_id,
  gift_name,
  gift_url,
  gift_image_url,
  is_claimed,
  claim_status,
  created_at,
  updated_at
)
SELECT 
  ewi.id as wishlist_id,
  ewi.event_id,
  e.host_id,
  ewi.item_name as gift_name,
  ewi.item_url as gift_url,
  ewi.item_image_url as gift_image_url,
  COALESCE(ewi.is_claimed, 0) as is_claimed,
  CASE 
    WHEN ewi.status = 'claimed' THEN 'pending'
    WHEN ewi.status = 'deleted' THEN 'cancelled'
    ELSE 'pending'
  END as claim_status,
  ewi.created_at,
  ewi.updated_at
FROM event_wishlist_items ewi
JOIN events e ON ewi.event_id = e.id
WHERE NOT EXISTS (
  SELECT 1 FROM wishlist w WHERE w.wishlist_id = ewi.id
);

-- Step 3: Update claimed_by from gift_claims
UPDATE wishlist w
INNER JOIN gift_claims gc ON w.wishlist_id = gc.event_wishlist_item_id
SET 
  w.claimed_by = gc.claimed_by,
  w.claim_status = gc.claim_status,
  w.claimed_at = gc.claimed_at,
  w.confirmed_at = gc.confirmed_at,
  w.released_at = gc.released_at,
  w.notes = gc.notes,
  w.is_claimed = 1
WHERE w.event_id IS NOT NULL;

-- Step 4: Migrate personal wishlist items from wishlist_master
-- Personal items have event_id = NULL and host_id = user_id
INSERT INTO wishlist (
  wishlist_id,
  event_id,
  host_id,
  gift_name,
  gift_url,
  created_at,
  updated_at
)
SELECT 
  wm.id as wishlist_id,
  NULL as event_id, -- Personal wishlist items have no event
  wm.user_id as host_id,
  wm.item_name as gift_name,
  wm.item_url as gift_url,
  wm.created_at,
  wm.updated_at
FROM wishlist_master wm
WHERE NOT EXISTS (
  SELECT 1 FROM wishlist w WHERE w.wishlist_id = wm.id
);

-- Note: After migration is complete and verified, you can drop the old tables:
-- DROP TABLE IF EXISTS gift_claims;
-- DROP TABLE IF EXISTS event_wishlist_items;
-- DROP TABLE IF EXISTS wishlist_master;

