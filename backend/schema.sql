CREATE DATABASE IF NOT EXISTS bubblebee_laundry CHARACTER SET utf8mb4;
USE bubblebee_laundry;

CREATE TABLE IF NOT EXISTS users(
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(160) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  auth_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS years(
  id INT AUTO_INCREMENT PRIMARY KEY,
  year SMALLINT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS months(
  id INT AUTO_INCREMENT PRIMARY KEY,
  year_id INT NOT NULL,
  month_number TINYINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_year_month(year_id, month_number),
  FOREIGN KEY(year_id) REFERENCES years(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions(
  id INT AUTO_INCREMENT PRIMARY KEY,
  month_id INT NOT NULL,
  customer_name VARCHAR(160) NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_time TIME NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  amount_paid DECIMAL(12,2) NOT NULL,
  remaining_balance DECIMAL(12,2) NOT NULL,
  status ENUM('PAID','UNPAID','PARTIALLY PAID') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(month_id) REFERENCES months(id),
  INDEX idx_transaction_date(transaction_date),
  INDEX idx_transaction_month(month_id)
);

INSERT INTO users(username, email, password_hash)
VALUES(
  'admin',
  'admin',
  'pbkdf2:sha256:1000000$3G75DCVZ3dfDVG0L$3453adefb10bc224a202c05fd9dd23c095d1ef2223acd9c55de1416fb6dba163'
)
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);
