-- Add gift_option and wishlist_id columns to event_guests table
USE invyteonly;

ALTER TABLE event_guests 
ADD COLUMN gift_option ENUM('BYOG', 'no gift', 'gift card', 'gift') NULL AFTER rsvp_status,
ADD COLUMN wishlist_id CHAR(36) NULL AFTER gift_option,
ADD INDEX idx_event_guests_wishlist (wishlist_id),
ADD FOREIGN KEY (wishlist_id) REFERENCES wishlist(wishlist_id) ON DELETE SET NULL;

