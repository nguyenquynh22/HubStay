ALTER TABLE `verification_requests`
  ADD COLUMN `selfie_image_url` VARCHAR(255) DEFAULT NULL AFTER `back_card_url`;
