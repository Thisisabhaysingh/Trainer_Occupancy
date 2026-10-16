CREATE TABLE IF NOT EXISTS `trainer_leaderboard` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` VARCHAR(255) NOT NULL,
  `periodKey` VARCHAR(7) NOT NULL,
  `instituteSessions` INT NOT NULL DEFAULT 0,
  `schoolSessions` INT NOT NULL DEFAULT 0,
  `score` INT NOT NULL DEFAULT 0,
  `rank` INT NOT NULL,
  `previousRank` INT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `trainer_leaderboard_user_period` (`userId`, `periodKey`),
  KEY `trainer_leaderboard_period_rank` (`periodKey`, `rank`)
);

ALTER TABLE `trainer_leaderboard`
  ADD CONSTRAINT `trainer_leaderboard_user_fk`
  FOREIGN KEY (`userId`) REFERENCES `users` (`employeeCode`)
  ON DELETE CASCADE ON UPDATE CASCADE;
