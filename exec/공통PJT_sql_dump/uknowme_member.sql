-- MySQL dump 10.13  Distrib 8.0.28, for Win64 (x86_64)
--
-- Host: uknowme.mooo.com    Database: uknowme
-- ------------------------------------------------------
-- Server version	8.0.28

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `member`
--

DROP TABLE IF EXISTS `member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `member` (
  `member_seq` int NOT NULL,
  `create_date` datetime(6) NOT NULL,
  `create_member` varchar(255) DEFAULT NULL,
  `delete_yn` varchar(255) DEFAULT NULL,
  `update_date` datetime(6) DEFAULT NULL,
  `update_member` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `birth` varchar(255) DEFAULT NULL,
  `gender` varchar(255) DEFAULT NULL,
  `id` varchar(255) NOT NULL,
  `kakao_id` varchar(255) DEFAULT NULL,
  `match_count` int NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `naver_id` varchar(255) DEFAULT NULL,
  `nickname` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `report_last_date` datetime(6) DEFAULT NULL,
  `report_state` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `smoke` varchar(255) DEFAULT NULL,
  `tel` varchar(255) DEFAULT NULL,
  `avatar_seq` int DEFAULT NULL,
  PRIMARY KEY (`member_seq`),
  UNIQUE KEY `UK_jp8ds32yg1soswx2rkiagm768` (`id`),
  KEY `FKhyvv66vjddsxobalilxsve6du` (`avatar_seq`),
  CONSTRAINT `FKhyvv66vjddsxobalilxsve6du` FOREIGN KEY (`avatar_seq`) REFERENCES `avatar` (`avatar_seq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `member`
--

LOCK TABLES `member` WRITE;
/*!40000 ALTER TABLE `member` DISABLE KEYS */;
INSERT INTO `member` VALUES (1,'2022-08-09 16:01:36.074000','anonymousUser','N','2022-08-16 07:59:28.772000','manager','우리집','960513','M','manager',NULL,0,'매니저',NULL,'매니저','{bcrypt}$2a$10$1XU5/n0k3bVqVb1UYm8YieLKoRiPpKT4cWZg9q.W0PnVrGo6rLyHq',NULL,NULL,'ROLE_MANAGER','Y','01045689094',15);
/*!40000 ALTER TABLE `member` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2022-08-19  1:28:00
