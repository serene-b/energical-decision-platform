-- ============================================
-- Table: customers
-- ============================================
CREATE TABLE customers (
    customer_id_stage       VARCHAR(50) PRIMARY KEY,
    customer_type_inferred  VARCHAR(20),
    wilaya                  VARCHAR(100),
    first_order_date        DATE,
    last_order_date         DATE,
    orders_count             INTEGER,
    total_amount             NUMERIC(12,2),
    average_basket           NUMERIC(12,2)
);

-- ============================================
-- Table: catalogue (products)
-- ============================================
CREATE TABLE catalogue (
    sku              VARCHAR(50) PRIMARY KEY,
    product_name     VARCHAR(255),
    category         VARCHAR(100),
    subcategory      VARCHAR(100),
    unit_price       NUMERIC(12,2),
    stock_status     VARCHAR(50),
    short_desc       TEXT
);

-- ============================================
-- Table: orders
-- ============================================
CREATE TABLE orders (
    order_id_stage          VARCHAR(50) PRIMARY KEY,
    customer_id_stage       VARCHAR(50) REFERENCES customers(customer_id_stage),
    order_date               TIMESTAMP,
    wilaya_raw               VARCHAR(100),
    wilaya_normalized        VARCHAR(100),
    customer_type_inferred  VARCHAR(20),
    order_status             VARCHAR(50),
    payment_method_group     VARCHAR(50),
    sales_channel             VARCHAR(50),
    order_total_amount       NUMERIC(12,2),
    total_quantity            INTEGER,
    n_lines                   INTEGER
);

-- ============================================
-- Table: transactions
-- ============================================
CREATE TABLE transactions (
    transaction_id           SERIAL PRIMARY KEY,  -- ID تلقائي (ماكانش موجود فالـ CSV الأصلي)
    order_id_stage           VARCHAR(50) REFERENCES orders(order_id_stage),
    customer_id_stage        VARCHAR(50) REFERENCES customers(customer_id_stage),
    order_date                TIMESTAMP,
    wilaya_raw                VARCHAR(100),
    wilaya_normalized         VARCHAR(100),
    geo_quality_flag          VARCHAR(20),
    customer_type_inferred   VARCHAR(20),
    sku                       VARCHAR(50) REFERENCES catalogue(sku),
    product_name              VARCHAR(255),
    sku_quality                VARCHAR(20),
    category                   VARCHAR(100),
    subcategory                VARCHAR(100),
    quantity                    INTEGER,
    unit_price                  NUMERIC(12,2),
    line_total                  NUMERIC(12,2),
    order_status                 VARCHAR(50),
    payment_method_group         VARCHAR(50),
    sales_channel                 VARCHAR(50)
);