-- MySQL dump 10.13  Distrib 5.7.12, for linux-glibc2.5 (x86_64)
--
-- Host: localhost    Database: bank
-- ------------------------------------------------------
-- Server version	5.7.13-0ubuntu0.16.04.2

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `client`
--

DROP TABLE IF EXISTS `client`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `client` (
  `idclient` bigint(20) NOT NULL AUTO_INCREMENT,
  `surname` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  `patronymic` varchar(100) NOT NULL,
  `birthdate` date NOT NULL,
  `passport_series` varchar(10) NOT NULL,
  `passport_no` varchar(45) NOT NULL,
  `passport_issuer` varchar(500) NOT NULL,
  `passport_issue_date` date NOT NULL,
  `passport_id` varchar(45) NOT NULL,
  `birthplace` varchar(500) NOT NULL,
  `address` varchar(100) NOT NULL,
  `home_phonenumber` varchar(45) DEFAULT NULL,
  `mobile_phonenumber` varchar(45) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `residence` varchar(500) DEFAULT NULL,
  `monthly_income` decimal(15,2) DEFAULT NULL,
  `pensioner` tinyint(1) NOT NULL,
  `disability` bigint(20) NOT NULL,
  `citizenship` bigint(20) NOT NULL,
  `city` bigint(20) NOT NULL,
  `martial_status` bigint(20) NOT NULL,
  `sex` enum('Муж.','Жен.') NOT NULL,
  PRIMARY KEY (`idclient`),
  UNIQUE KEY `idclient_UNIQUE` (`idclient`),
  UNIQUE KEY `unique_pair` (`passport_series`,`passport_no`),
  UNIQUE KEY `passport_id_UNIQUE` (`passport_id`),
  UNIQUE KEY `unique_index` (`surname`,`name`,`patronymic`),
  KEY `fk_client_disability1_idx` (`disability`),
  KEY `fk_client_citizenship1_idx` (`citizenship`),
  KEY `fk_client_martial_status1_idx` (`martial_status`),
  KEY `fk_client_city1_idx` (`city`),
  KEY `fk_full_name` (`name`,`surname`,`patronymic`),
  CONSTRAINT `fk_client_citizenship1` FOREIGN KEY (`citizenship`) REFERENCES `citizenship` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_client_city1` FOREIGN KEY (`city`) REFERENCES `city` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_client_disability1` FOREIGN KEY (`disability`) REFERENCES `disability` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_client_martial_status1` FOREIGN KEY (`martial_status`) REFERENCES `martial_status` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client`
--

LOCK TABLES `client` WRITE;
/*!40000 ALTER TABLE `client` DISABLE KEYS */;
INSERT INTO `client` VALUES (34,'Костюкова','Анастасия','Петровна','1993-03-03','MP','3121532','Московским','2012-02-22','1255231221','Минск','Сухаревская,','5447678841','5447678841',NULL,'Минск',9900.00,0,2,1,1,1,'Жен.'),(38,'dvsdvs','vsdvsdv','dvsv','1313-03-13','MP','352332','aewvgerbv','1212-12-12','12312323232','Минск','fverver',NULL,NULL,NULL,'Минск',NULL,0,5,1,1,1,'Жен.'),(40,'Тесейко','Мария','Валерьевна','1991-11-11','MP','56565656','Московским РУВД','2012-12-31','666666555','Минск','qdqdqd','321321','123123','ddd@ffff','Минск',NULL,0,1,5,1,4,'Жен.'),(42,'Иванов','Иван','Иванович','1991-11-11','MP','78945123','Московским РУВД','2012-12-31','111111111111','Минск','qdqdqd','321321','123123','ddd@ffff','Минск',NULL,0,1,4,1,4,'Муж.'),(43,'Петькин','Петя','Петровч','1991-11-11','MP','987654321','Московским РУВД','2012-12-31','333333333333','Минск','qdqdqd','321321','123123','ddd@ffff','Минск',NULL,0,1,4,1,4,'Жен.');
/*!40000 ALTER TABLE `client` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2016-12-11 23:37:07
