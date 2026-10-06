SET @has_verified_at = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'verified_at'
);
SET @sql = IF(
  @has_verified_at = 0,
  'ALTER TABLE `users` ADD COLUMN `verified_at` DATETIME DEFAULT NULL',
  'SELECT 1'
);
PREPARE migration FROM @sql;
EXECUTE migration;
DEALLOCATE PREPARE migration;

SET @has_kyc_status = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'kyc_status'
);
SET @sql = IF(
  @has_kyc_status = 0,
  'ALTER TABLE `users` ADD COLUMN `kyc_status` ENUM(''PENDING'', ''APPROVED'', ''REJECTED'') NOT NULL DEFAULT ''PENDING'' AFTER `is_verified`',
  'SELECT 1'
);
PREPARE migration FROM @sql;
EXECUTE migration;
DEALLOCATE PREPARE migration;
