# Wishlist Table Consolidation Migration Guide

## Overview
This migration consolidates three separate tables (`event_wishlist_items`, `gift_claims`, `wishlist_master`) into a single `wishlist` table.

## New Table Structure

### `wishlist` Table
- **Primary Key**: `wishlist_id` (CHAR(36))
- **Fields**:
  - `event_id` (CHAR(36), NULL) - NULL for personal wishlist items, NOT NULL for event items
  - `host_id` (CHAR(36), NOT NULL) - Event host or user who owns the personal wishlist item
  - `gift_name` (VARCHAR(300), NOT NULL) - Name of the gift/item
  - `gift_url` (TEXT, NULL) - URL for the gift
  - `gift_image_url` (TEXT, NULL) - Image URL for the gift
  - `claimed_by` (CHAR(36), NULL) - User who claimed the item
  - `is_claimed` (TINYINT(1), DEFAULT 0) - Boolean flag
  - `claim_status` (ENUM: 'pending', 'confirmed', 'cancelled', 'auto_released', DEFAULT 'pending')
  - `claimed_at` (DATETIME, NULL)
  - `confirmed_at` (TIMESTAMP, NULL)
  - `released_at` (TIMESTAMP, NULL)
  - `notes` (TEXT, NULL)
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)

## Migration Steps

1. **Create the new table**:
   ```bash
   mysql -u your_user -p your_database < migrations/create_wishlist_table.sql
   ```

2. **Migrate existing data**:
   ```bash
   mysql -u your_user -p your_database < migrations/migrate_to_wishlist_table.sql
   ```

3. **Verify data migration**:
   - Check that all event wishlist items were migrated
   - Check that all personal wishlist items were migrated
   - Check that claim information was preserved

4. **After verification, drop old tables** (optional):
   ```sql
   DROP TABLE IF EXISTS gift_claims;
   DROP TABLE IF EXISTS event_wishlist_items;
   DROP TABLE IF EXISTS wishlist_master;
   ```

## Code Changes

### Model Functions Updated
- `addItemsToEventDirectly()` - Now uses `wishlist` table
- `updateEventWishlist()` - Now uses `wishlist` table
- `claimWishlistItem()` - Now updates `wishlist` table directly
- `getUserWishlist()` - Queries `wishlist` where `event_id IS NULL`
- `addToUserWishlist()` - Inserts into `wishlist` with `event_id = NULL`
- `updateUserWishlistItem()` - Updates `wishlist` table
- `deleteUserWishlistItem()` - Deletes from `wishlist` table
- `getWishlistItemsByEventId()` - Queries `wishlist` where `event_id = eventId`

### Backward Compatibility
The code maintains backward compatibility by:
- Accepting both `gift_name`/`item_name` in requests
- Accepting both `gift_url`/`item_url` in requests
- Returning both field names in responses
- Using `id` as alias for `wishlist_id` in responses

## API Behavior

### Personal Wishlist (event_id = NULL)
- Items belong to a user (host_id = user_id)
- Can be shared to events
- Tracks if items have been claimed in any event

### Event Wishlist (event_id = event_id)
- Items belong to a specific event
- Can be claimed by guests
- Tracks claim status and who claimed it

## Testing Checklist

- [ ] Create personal wishlist items
- [ ] Update personal wishlist items
- [ ] Delete personal wishlist items
- [ ] Create event with wishlist items
- [ ] Share personal wishlist items to event
- [ ] Claim wishlist items in event
- [ ] Get event with wishlist items (check is_claimed status)
- [ ] Get user's personal wishlist (check claimed status)
- [ ] Update event wishlist
- [ ] Get RSVP status with gift claims

