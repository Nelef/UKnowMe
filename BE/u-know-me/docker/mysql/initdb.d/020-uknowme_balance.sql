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
-- Table structure for table `balance`
--

DROP TABLE IF EXISTS `balance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `balance` (
  `balance_seq` int NOT NULL,
  `create_date` datetime(6) NOT NULL,
  `create_member` varchar(255) DEFAULT NULL,
  `delete_yn` varchar(255) DEFAULT NULL,
  `update_date` datetime(6) DEFAULT NULL,
  `update_member` varchar(255) DEFAULT NULL,
  `answer1` varchar(255) DEFAULT NULL,
  `answer2` varchar(255) DEFAULT NULL,
  `question` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`balance_seq`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `balance`
--

LOCK TABLES `balance` WRITE;
/*!40000 ALTER TABLE `balance` DISABLE KEYS */;
INSERT INTO `balance` VALUES (554,'2022-08-17 01:22:10.265000','manager','N','2022-08-17 01:22:10.265000','manager','산','바다','산 vs 바다'),(558,'2022-08-17 01:26:15.679000','manager','N','2022-08-17 01:26:15.679000','manager','맨날 더치페이 하자는 애인','맨날 한쪽이 전부 사야 한다는 애인','더치페이'),(559,'2022-08-17 01:26:36.246000','manager','N','2022-08-17 01:26:36.246000','manager','연락 잘 되지만 장거리','가까이 사는데 연락두절','거리'),(560,'2022-08-17 01:26:56.571000','manager','N','2022-08-17 01:26:56.571000','manager','맨날 우는 애인','맨날 화내는 애인','애인'),(561,'2022-08-17 01:27:22.810000','manager','N','2022-08-17 01:27:22.810000','manager','주위에 여사친 or 남사친 많은 애인','친구가 1도 없는 애인(하루라도 안 놀아주면 큰일 남)','애인'),(562,'2022-08-17 01:27:42.750000','manager','N','2022-08-17 01:27:42.750000','manager','데이트 코스 1분 1초 단위로 계획하는 애인','아무 생각 없이 나오는 애인','애인'),(564,'2022-08-17 01:27:58.466000','manager','N','2022-08-17 01:27:58.466000','manager','환승 이별','카톡 이별','이별'),(565,'2022-08-17 01:28:24.013000','manager','N','2022-08-17 01:28:24.013000','manager','내가 싫어하지만 날 좋아하는 사람에게 고백받기','내가 좋아하지만 날 좋아하지 않는 사람과 연애','연애'),(566,'2022-08-17 01:28:43.184000','manager','N','2022-08-17 01:28:43.184000','manager','99명 앞에서 공개 고백했다가 차이기','10만 명 앞에서 공개고백받기','고백');
/*!40000 ALTER TABLE `balance` ENABLE KEYS */;
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
