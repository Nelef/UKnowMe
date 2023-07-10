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
-- Table structure for table `keyword`
--

DROP TABLE IF EXISTS `keyword`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `keyword` (
  `keyword_seq` int NOT NULL,
  `create_date` datetime(6) NOT NULL,
  `create_member` varchar(255) DEFAULT NULL,
  `delete_yn` varchar(255) DEFAULT NULL,
  `update_date` datetime(6) DEFAULT NULL,
  `update_member` varchar(255) DEFAULT NULL,
  `keyword` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`keyword_seq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `keyword`
--

LOCK TABLES `keyword` WRITE;
/*!40000 ALTER TABLE `keyword` DISABLE KEYS */;
INSERT INTO `keyword` VALUES (567,'2022-08-17 01:28:53.750000','manager','N','2022-08-17 01:28:53.750000','manager','여행'),(568,'2022-08-17 01:29:01.791000','manager','N','2022-08-17 01:29:01.791000','manager','주량'),(569,'2022-08-17 01:30:34.715000','manager','N','2022-08-17 01:30:34.715000','manager','mbti'),(570,'2022-08-17 01:30:52.008000','manager','N','2022-08-17 01:30:52.008000','manager','취미'),(571,'2022-08-17 01:31:03.221000','manager','N','2022-08-17 01:31:03.221000','manager','좋아하는 음식'),(572,'2022-08-17 01:31:12.840000','manager','N','2022-08-17 01:31:12.840000','manager','맛집'),(573,'2022-08-17 01:31:23.387000','manager','N','2022-08-17 01:31:23.387000','manager','이상형');
/*!40000 ALTER TABLE `keyword` ENABLE KEYS */;
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
