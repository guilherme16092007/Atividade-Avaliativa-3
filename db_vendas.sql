-- =====================================================================
-- Script de criação do banco db_vendas (MySQL 8.0.16+)
-- Execute:  mysql -u root -p < db_vendas.sql
-- =====================================================================
CREATE DATABASE IF NOT EXISTS db_vendas
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE db_vendas;

DROP TABLE IF EXISTS vendas;
DROP TABLE IF EXISTS vendedores;
DROP TABLE IF EXISTS regioes;

-- ---------------------------------------------------------------------
-- Tabela vendedores
-- ---------------------------------------------------------------------
CREATE TABLE vendedores (
  id_vendedor      INT AUTO_INCREMENT PRIMARY KEY,
  nome             VARCHAR(100)  NOT NULL,
  meta_mensal      DECIMAL(12,2) NOT NULL,
  percentual_base  DECIMAL(5,2)  NOT NULL,
  ativo            BOOLEAN       NOT NULL DEFAULT TRUE,
  CONSTRAINT ck_vendedor_meta  CHECK (meta_mensal >= 0),
  CONSTRAINT ck_vendedor_base  CHECK (percentual_base >= 0 AND percentual_base <= 100)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabela regioes
-- ---------------------------------------------------------------------
CREATE TABLE regioes (
  id_regiao         INT AUTO_INCREMENT PRIMARY KEY,
  nome_regiao       VARCHAR(50)  NOT NULL UNIQUE,
  percentual_bonus  DECIMAL(5,2) NOT NULL DEFAULT 0,
  CONSTRAINT ck_regiao_nome  CHECK (nome_regiao IN ('Norte','Nordeste','Sudeste','Sul')),
  CONSTRAINT ck_regiao_bonus CHECK (percentual_bonus >= 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabela vendas
-- ---------------------------------------------------------------------
CREATE TABLE vendas (
  id_venda        INT AUTO_INCREMENT PRIMARY KEY,
  id_vendedor     INT           NOT NULL,
  id_regiao       INT           NOT NULL,
  data_venda      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valor_venda     DECIMAL(12,2) NOT NULL,
  tipo_cliente    ENUM('PF','PJ') NOT NULL,
  valor_comissao  DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_venda_vendedor FOREIGN KEY (id_vendedor) REFERENCES vendedores(id_vendedor)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_venda_regiao   FOREIGN KEY (id_regiao)   REFERENCES regioes(id_regiao)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT ck_venda_valor    CHECK (valor_venda > 0),
  INDEX idx_vendas_data (data_venda),
  INDEX idx_vendas_vendedor (id_vendedor),
  INDEX idx_vendas_regiao (id_regiao)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Dados de teste
-- ---------------------------------------------------------------------
INSERT INTO regioes (id_regiao, nome_regiao, percentual_bonus) VALUES
  (1, 'Norte',    1.00),
  (2, 'Nordeste', 1.00),
  (3, 'Sudeste',  0.00),
  (4, 'Sul',      0.50);

INSERT INTO vendedores (id_vendedor, nome, meta_mensal, percentual_base, ativo) VALUES
  (1, 'Ana Souza',   20000.00, 5.00, TRUE),
  (2, 'Bruno Lima',  15000.00, 4.00, TRUE),
  (3, 'Carla Mendes',25000.00, 6.00, TRUE),
  (4, 'Diego Alves', 10000.00, 3.50, TRUE),
  (5, 'Elisa Rocha', 18000.00, 5.50, TRUE);

-- 15 vendas em outubro/2026, nas 4 regiões, com PF e PJ
-- (valor_comissao é preenchido pelo UPDATE logo abaixo; pela API é calculado por calcularComissao())
INSERT INTO vendas (id_venda, id_vendedor, id_regiao, data_venda, valor_venda, tipo_cliente) VALUES
  ( 1, 1, 1, '2026-10-02 10:15:00',  2000.00, 'PJ'),  -- exemplo do enunciado: 9% = 180,00
  ( 2, 1, 3, '2026-10-05 14:30:00',  9500.00, 'PF'),
  ( 3, 1, 4, '2026-10-12 09:45:00', 12000.00, 'PJ'),
  ( 4, 2, 2, '2026-10-03 11:00:00',  6000.00, 'PF'),
  ( 5, 2, 2, '2026-10-09 16:20:00',  4500.00, 'PJ'),
  ( 6, 2, 1, '2026-10-15 13:10:00',  3000.00, 'PF'),
  ( 7, 3, 3, '2026-10-04 08:50:00', 15000.00, 'PJ'),
  ( 8, 3, 4, '2026-10-10 15:05:00',  8000.00, 'PF'),
  ( 9, 3, 1, '2026-10-18 10:40:00',  4000.00, 'PJ'),
  (10, 4, 4, '2026-10-06 17:00:00',  5000.00, 'PF'),
  (11, 4, 3, '2026-10-14 12:25:00',  7000.00, 'PJ'),
  (12, 4, 2, '2026-10-20 09:00:00',  1500.00, 'PF'),
  (13, 5, 1, '2026-10-07 14:00:00',  6500.00, 'PJ'),
  (14, 5, 3, '2026-10-16 11:35:00',  3500.00, 'PF'),
  (15, 5, 2, '2026-10-22 16:50:00',  2500.00, 'PJ');

UPDATE vendas v
  JOIN vendedores ve ON ve.id_vendedor = v.id_vendedor
  JOIN regioes r     ON r.id_regiao    = v.id_regiao
SET v.valor_comissao = ROUND(
      v.valor_venda * (ve.percentual_base + IF(v.tipo_cliente = 'PJ', 3, 2) + r.percentual_bonus) / 100, 2)
WHERE v.id_venda > 0;
