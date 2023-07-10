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
-- Table structure for table `avatar`
--

DROP TABLE IF EXISTS `avatar`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `avatar` (
  `avatar_seq` int NOT NULL,
  `create_date` datetime(6) NOT NULL,
  `create_member` varchar(255) DEFAULT NULL,
  `delete_yn` varchar(255) DEFAULT NULL,
  `update_date` datetime(6) DEFAULT NULL,
  `update_member` varchar(255) DEFAULT NULL,
  `frequency` int NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `vrm` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`avatar_seq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `avatar`
--

LOCK TABLES `avatar` WRITE;
/*!40000 ALTER TABLE `avatar` DISABLE KEYS */;
INSERT INTO `avatar` VALUES (1,'2022-08-11 14:09:38.000000','6',NULL,'2022-08-11 14:09:38.000000','6',0,NULL,'미',NULL),(2,'2022-08-11 14:09:39.000000','6',NULL,'2022-08-11 14:09:39.000000','6',0,NULL,'마땡이',NULL),(3,'2022-08-11 14:09:40.000000','6',NULL,'2022-08-11 14:09:40.000000','6',0,NULL,'도레미',NULL),(4,'2022-08-11 14:09:40.000000','6',NULL,'2022-08-11 14:09:40.000000','6',0,NULL,'유노',NULL),(5,'2022-08-11 14:09:41.000000','6',NULL,'2022-08-11 14:09:41.000000','6',0,NULL,'보디다르마',NULL),(6,'2022-08-11 14:09:44.000000','6',NULL,'2022-08-11 14:09:44.000000','6',0,NULL,'금태양',NULL),(7,'2022-08-11 14:09:43.000000','6',NULL,'2022-08-11 14:09:43.000000','6',0,NULL,'클라디우스',NULL),(8,'2022-08-11 14:09:46.000000','6',NULL,'2022-08-11 14:09:46.000000','6',0,NULL,'키츠네',NULL),(11,'2022-08-14 04:17:15.000000','6',NULL,'2022-08-14 04:17:15.000000','6',0,NULL,'유노',NULL),(12,'2022-08-14 04:17:15.000000','6',NULL,'2022-08-14 04:17:15.000000','6',0,NULL,'보디다르마',NULL),(13,'2022-08-14 04:17:15.000000','6',NULL,'2022-08-14 04:17:15.000000','6',0,NULL,'금태양',NULL),(14,'2022-08-14 04:17:16.000000','6',NULL,'2022-08-14 04:17:16.000000','6',0,NULL,'클라디우스',NULL),(15,'2022-08-14 04:17:16.000000','6',NULL,'2022-08-14 04:17:16.000000','6',0,NULL,'키츠네',NULL),(16,'2022-08-14 04:17:16.000000','6',NULL,'2022-08-14 04:17:16.000000','6',0,NULL,'블랙',NULL),(21,'2022-08-14 04:17:17.000000','6',NULL,'2022-08-14 04:17:17.000000','6',0,NULL,'미',NULL),(22,'2022-08-14 04:17:19.000000','6',NULL,'2022-08-14 04:17:19.000000','6',0,NULL,'마땡이',NULL),(23,'2022-08-14 04:17:19.000000','6',NULL,'2022-08-14 04:17:19.000000','6',0,NULL,'유미',NULL),(24,'2022-08-14 04:17:19.000000','6',NULL,'2022-08-14 04:17:19.000000','6',0,NULL,'도레미',NULL);
/*!40000 ALTER TABLE `avatar` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2022-08-19  1:27:58
