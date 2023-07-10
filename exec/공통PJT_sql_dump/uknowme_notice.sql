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
-- Table structure for table `notice`
--

DROP TABLE IF EXISTS `notice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notice` (
  `notice_seq` int NOT NULL,
  `create_date` datetime(6) NOT NULL,
  `create_member` varchar(255) DEFAULT NULL,
  `delete_yn` varchar(255) DEFAULT NULL,
  `update_date` datetime(6) DEFAULT NULL,
  `update_member` varchar(255) DEFAULT NULL,
  `content` varchar(255) DEFAULT NULL,
  `hit` int NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `member_seq` int DEFAULT NULL,
  PRIMARY KEY (`notice_seq`),
  KEY `FKt4ro08xxf1edjpbph20qi7msb` (`member_seq`),
  CONSTRAINT `FKt4ro08xxf1edjpbph20qi7msb` FOREIGN KEY (`member_seq`) REFERENCES `member` (`member_seq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notice`
--

LOCK TABLES `notice` WRITE;
/*!40000 ALTER TABLE `notice` DISABLE KEYS */;
INSERT INTO `notice` VALUES (348,'2022-08-14 16:37:24.122000','manager','N','2022-08-14 16:54:29.145000','manager','안녕하세요 회원 여러분.\n드디어 저희 서비스 \'너, 나 알아?\' 가 개시되었습니다. \n와오아아아아!!\n다들 매너 장착하시고 즐거운 시간 보내시길 바랍니다!\n감사합니다.',0,'8/15(월) 서비스 개시 안내',1),(349,'2022-08-14 16:42:44.268000','manager','N','2022-08-14 16:55:25.874000','manager','안녕하세요. 회원 여러분.\n매주 화요일은 \'너, 나 알아?\' 정기점검으로 8월 11일(목) \n오전 5시부터 오전 6시까지 서비스가 원활하지 않습니다.\n회원 여러분들의 너그러운 양해 부탁드리며 이용에 불편 \n없으시길 바랍니다.\n감사합니다.',0,'8/16(화) \'너, 나 알아?\' 정기점검 안내',1);
/*!40000 ALTER TABLE `notice` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2022-08-19  1:28:02
