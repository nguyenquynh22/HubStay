CREATE DATABASE IF NOT EXISTS `hubstay_db`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `hubstay_db`;

-- =================================================================
-- 1. BẢNG USERS (Quản lý người dùng)
-- =================================================================
CREATE TABLE `users` (
  `user_id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(15) UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('STUDENT', 'WORKER', 'LANDLORD', 'ADMIN') NOT NULL DEFAULT 'STUDENT',
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `is_verified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0: Chưa xác thực, 1: Đã xác thực tích xanh',
  `is_vip` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0: Thường, 1: VIP',
  `vip_expires_at` DATETIME DEFAULT NULL COMMENT 'Thời gian hết hạn gói VIP',
  `wallet_balance` DECIMAL(12, 2) NOT NULL DEFAULT 0 COMMENT 'Số dư ví nội bộ (VNĐ)',
  `status` ENUM('ACTIVE', 'WARNING', 'BANNED') NOT NULL DEFAULT 'ACTIVE',
  `banned_until` DATETIME DEFAULT NULL,
  `ban_reason` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_users_role_status` (`role`, `status`),
  INDEX `idx_users_vip` (`is_vip`, `vip_expires_at`)
) ENGINE=InnoDB;

-- =================================================================
-- 2. BẢNG VERIFICATION_REQUESTS (Xác thực tài khoản CCCD/Thẻ SV)
-- =================================================================
CREATE TABLE `verification_requests` (
  `request_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `account_type` ENUM('STUDENT', 'WORKER', 'LANDLORD') NOT NULL,
  `front_card_url` VARCHAR(255) NOT NULL,
  `back_card_url` VARCHAR(255) DEFAULT NULL,
  `selfie_image_url` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `rejection_reason` TEXT DEFAULT NULL,
  `reviewed_by` INT DEFAULT NULL,
  `reviewed_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL,
  INDEX `idx_verification_status` (`status`)
) ENGINE=InnoDB;

-- =================================================================
-- 3. BẢNG LANDMARKS (Địa điểm nổi tiếng)
-- =================================================================
CREATE TABLE `landmarks` (
  `landmark_id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `category` ENUM('UNIVERSITY', 'PARK', 'MUSEUM', 'HOSPITAL', 'SHOPPING', 'OTHER') NOT NULL DEFAULT 'OTHER',
  `address` VARCHAR(255) NOT NULL,
  `province_code` INT DEFAULT NULL,
  `district_code` INT DEFAULT NULL,
  `ward_code` INT DEFAULT NULL,
  `latitude` DECIMAL(10, 8) NOT NULL,
  `longitude` DECIMAL(11, 8) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX `idx_landmark_coords` (`latitude`, `longitude`),
  INDEX `idx_landmark_area` (`province_code`, `district_code`, `ward_code`),
  INDEX `idx_landmark_category` (`category`)
) ENGINE=InnoDB;

-- =================================================================
-- 4. BẢNG POSTS (Bài đăng phòng trọ / tìm trọ)
-- =================================================================
CREATE TABLE `posts` (
  `post_id` INT AUTO_INCREMENT PRIMARY KEY,
  `author_id` INT NOT NULL,
  `landmark_id` INT DEFAULT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `post_type` ENUM('RENTAL', 'SHARE', 'PASS', 'FIND') NOT NULL DEFAULT 'RENTAL',
  `price` DECIMAL(12, 2) NOT NULL,
  `area` DECIMAL(6, 2) DEFAULT NULL,
  `address_detail` VARCHAR(255) NOT NULL,
  `province_code` INT DEFAULT NULL,
  `district_code` INT DEFAULT NULL,
  `ward_code` INT DEFAULT NULL,
  `post_lat` DECIMAL(10, 8) NOT NULL,
  `post_lng` DECIMAL(11, 8) NOT NULL,
  `enable_booking` TINYINT(1) NOT NULL DEFAULT 1,
  `status` ENUM('AVAILABLE', 'RENTED', 'HIDDEN') NOT NULL DEFAULT 'AVAILABLE',
  `is_approved` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`author_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`landmark_id`) REFERENCES `landmarks`(`landmark_id`) ON DELETE SET NULL,
  INDEX `idx_post_coords` (`post_lat`, `post_lng`),
  INDEX `idx_post_area` (`province_code`, `district_code`, `ward_code`),
  INDEX `idx_post_type_status` (`post_type`, `status`, `is_approved`)
) ENGINE=InnoDB;

-- =================================================================
-- 5. BẢNG POST_IMAGES (Hình ảnh bài đăng)
-- =================================================================
CREATE TABLE `post_images` (
  `image_id` INT AUTO_INCREMENT PRIMARY KEY,
  `post_id` INT NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `is_cover` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`post_id`) REFERENCES `posts`(`post_id`) ON DELETE CASCADE,
  INDEX `idx_post_images_cover` (`post_id`, `is_cover`)
) ENGINE=InnoDB;

-- =================================================================
-- 6. BẢNG SAVED_POSTS (Bài đăng đã lưu)
-- =================================================================
CREATE TABLE `saved_posts` (
  `user_id` INT NOT NULL,
  `post_id` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`user_id`, `post_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`post_id`) REFERENCES `posts`(`post_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =================================================================
-- 7. BẢNG POST_REACTIONS (Thích / Không thích)
-- =================================================================
CREATE TABLE `post_reactions` (
  `user_id` INT NOT NULL,
  `post_id` INT NOT NULL,
  `reaction_type` ENUM('LIKE', 'DISLIKE') NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`user_id`, `post_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`post_id`) REFERENCES `posts`(`post_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =================================================================
-- 8. BẢNG LANDLORD_AVAILABILITY (Lịch rảnh của chủ trọ)
-- =================================================================
CREATE TABLE `landlord_availability` (
  `availability_id` INT AUTO_INCREMENT PRIMARY KEY,
  `post_id` INT NOT NULL,
  `day_of_week` TINYINT DEFAULT NULL COMMENT '1: CN, 2: T2... 7: T7',
  `specific_date` DATE DEFAULT NULL,
  `from_time` TIME NOT NULL,
  `to_time` TIME NOT NULL,
  
  FOREIGN KEY (`post_id`) REFERENCES `posts`(`post_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =================================================================
-- 9. BẢNG APPOINTMENTS (Đặt lịch xem phòng)
-- =================================================================
CREATE TABLE `appointments` (
  `appointment_id` INT AUTO_INCREMENT PRIMARY KEY,
  `post_id` INT NOT NULL,
  `tenant_id` INT DEFAULT NULL,
  `source` ENUM('IN_APP', 'EXTERNAL') NOT NULL DEFAULT 'IN_APP',
  `guest_name` VARCHAR(100) DEFAULT NULL,
  `guest_phone` VARCHAR(20) DEFAULT NULL,
  `appointment_date` DATE NOT NULL,
  `appointment_time` TIME NOT NULL,
  `note` TEXT DEFAULT NULL,
  `status` ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `is_read_by_landlord` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`post_id`) REFERENCES `posts`(`post_id`) ON DELETE CASCADE,
  FOREIGN KEY (`tenant_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  INDEX `idx_appointments_landlord_read` (`post_id`, `status`, `is_read_by_landlord`),
  INDEX `idx_appointments_tenant_created` (`tenant_id`, `created_at`)
) ENGINE=InnoDB;

-- =================================================================
-- 10. BẢNG POST_REPORTS (Báo cáo bài đăng)
-- =================================================================
CREATE TABLE `post_reports` (
  `report_id` INT AUTO_INCREMENT PRIMARY KEY,
  `post_id` INT NOT NULL,
  `reporter_id` INT NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `evidence_image_url` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('PENDING', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`post_id`) REFERENCES `posts`(`post_id`) ON DELETE CASCADE,
  FOREIGN KEY (`reporter_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  INDEX `idx_reports_status` (`status`)
) ENGINE=InnoDB;

-- =================================================================
-- KYC / VIP SUPPORT
-- =================================================================
ALTER TABLE `users`
  ADD COLUMN `verified_at` DATETIME DEFAULT NULL,
  ADD COLUMN `kyc_status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING' AFTER `is_verified`;

ALTER TABLE `verification_requests`
  ADD COLUMN `reviewer_note` TEXT DEFAULT NULL AFTER `rejection_reason`,
  ADD COLUMN `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- =================================================================
-- 11. TẠO BẢNG rental_requests
-- =================================================================
CREATE TABLE IF NOT EXISTS `rental_requests` (
  `request_id` INT AUTO_INCREMENT PRIMARY KEY,
  `post_id` INT NOT NULL,
  `tenant_id` INT DEFAULT NULL COMMENT 'NULL nếu chủ trọ tự đánh dấu cho khách ngoài',
  `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `note` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`post_id`) REFERENCES `posts`(`post_id`) ON DELETE CASCADE,
  FOREIGN KEY (`tenant_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL,
  INDEX `idx_rental_post_status` (`post_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =================================================================
-- 12. BẢNG transactions (Lịch sử nạp tiền)
-- =================================================================
CREATE TABLE IF NOT EXISTS `transactions` (
  `transaction_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `transaction_type` ENUM('TOP_UP', 'VIP_PURCHASE') NOT NULL DEFAULT 'TOP_UP',
  `amount` DECIMAL(12, 2) NOT NULL COMMENT 'Số tiền nạp (VNĐ)',
  `payment_method` ENUM('BANK_TRANSFER', 'VIETQR', 'ADMIN_MANUAL', 'WALLET') NOT NULL DEFAULT 'VIETQR',
  `transaction_code` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Mã giao dịch / Mã chuyển khoản',
  `status` ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  INDEX `idx_trans_user_status` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =================================================================
-- 13. BẢNG subscriptions (Lịch sử đăng ký VIP)
-- =================================================================
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `subscription_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `transaction_id` INT DEFAULT NULL,
  `package_name` VARCHAR(100) NOT NULL COMMENT 'VD: VIP_1_MONTH, VIP_1_YEAR',
  `price` DECIMAL(12, 2) NOT NULL,
  `start_date` DATETIME NOT NULL,
  `end_date` DATETIME NOT NULL,
  `status` ENUM('ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`transaction_id`) ON DELETE SET NULL,
  INDEX `idx_sub_user_status` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =================================================================
-- 14. BẢNG notifications (Thông báo hệ thống)
-- =================================================================
CREATE TABLE IF NOT EXISTS `notifications` (
  `notification_id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `body` VARCHAR(500) NOT NULL,
  `data` JSON DEFAULT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  INDEX `idx_notifications_user_read_created` (`user_id`, `is_read`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT * FROM users;
