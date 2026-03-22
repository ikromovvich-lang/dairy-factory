-- =============================================
-- DAIRY FACTORY MANAGEMENT SYSTEM - DATABASE
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'worker');
CREATE TYPE quality_grade AS ENUM ('premium', 'first', 'second', 'rejected');
CREATE TYPE product_type AS ENUM ('milk', 'yogurt', 'tvorog', 'smetana');
CREATE TYPE batch_status AS ENUM ('planned', 'in_progress', 'completed', 'rejected');
CREATE TYPE sale_status AS ENUM ('pending', 'delivered', 'cancelled');

-- USERS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'worker',
  factory_id UUID,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FACTORIES (multi-factory support)
CREATE TABLE factories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  region VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(150),
  capacity_liters_per_day DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ADD CONSTRAINT fk_user_factory 
  FOREIGN KEY (factory_id) REFERENCES factories(id);

-- FARMERS
CREATE TABLE farmers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID REFERENCES factories(id),
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  location TEXT,
  region VARCHAR(100),
  bank_account VARCHAR(50),
  price_per_liter DECIMAL(8,2) NOT NULL DEFAULT 3500,
  is_active BOOLEAN DEFAULT true,
  total_deliveries INT DEFAULT 0,
  total_liters DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MILK DELIVERIES
CREATE TABLE milk_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID REFERENCES factories(id),
  farmer_id UUID REFERENCES farmers(id) NOT NULL,
  delivery_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  liters DECIMAL(10,2) NOT NULL,
  fat_percent DECIMAL(4,2) NOT NULL,
  protein_percent DECIMAL(4,2),
  temperature DECIMAL(4,1),
  quality_grade quality_grade NOT NULL DEFAULT 'first',
  price_per_liter DECIMAL(8,2) NOT NULL,
  total_payment DECIMAL(12,2) NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCTION BATCHES
CREATE TABLE production_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_number VARCHAR(50) UNIQUE NOT NULL,
  factory_id UUID REFERENCES factories(id),
  product_type product_type NOT NULL,
  status batch_status DEFAULT 'planned',
  milk_used_liters DECIMAL(10,2) NOT NULL,
  quantity_produced DECIMAL(10,2),
  unit VARCHAR(20) DEFAULT 'kg',
  yield_percent DECIMAL(5,2),
  production_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiration_date TIMESTAMPTZ NOT NULL,
  qr_code TEXT,
  fat_content DECIMAL(4,2),
  notes TEXT,
  started_by UUID REFERENCES users(id),
  completed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BATCH INGREDIENTS (which milk deliveries used)
CREATE TABLE batch_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES production_batches(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES milk_deliveries(id),
  liters_used DECIMAL(10,2) NOT NULL
);

-- INVENTORY
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID REFERENCES factories(id),
  product_type product_type NOT NULL,
  batch_id UUID REFERENCES production_batches(id),
  quantity_available DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity_reserved DECIMAL(10,2) DEFAULT 0,
  unit VARCHAR(20) DEFAULT 'kg',
  low_stock_threshold DECIMAL(10,2) DEFAULT 50,
  location VARCHAR(100),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(factory_id, product_type, batch_id)
);

-- CUSTOMERS
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID REFERENCES factories(id),
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) DEFAULT 'shop',
  phone VARCHAR(20),
  email VARCHAR(150),
  address TEXT,
  city VARCHAR(100),
  discount_percent DECIMAL(4,2) DEFAULT 0,
  credit_limit DECIMAL(12,2) DEFAULT 0,
  outstanding_balance DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SALES
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  factory_id UUID REFERENCES factories(id),
  customer_id UUID REFERENCES customers(id) NOT NULL,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  final_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status sale_status DEFAULT 'pending',
  payment_method VARCHAR(50),
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SALE ITEMS
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_type product_type NOT NULL,
  batch_id UUID REFERENCES production_batches(id),
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) DEFAULT 'kg',
  price_per_unit DECIMAL(8,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID REFERENCES factories(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  read_by UUID REFERENCES users(id),
  read_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI FORECASTS (store predictions)
CREATE TABLE ai_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID REFERENCES factories(id),
  forecast_type VARCHAR(50) NOT NULL,
  forecast_date DATE NOT NULL,
  product_type product_type,
  predicted_value DECIMAL(12,2),
  confidence_lower DECIMAL(12,2),
  confidence_upper DECIMAL(12,2),
  actual_value DECIMAL(12,2),
  accuracy_percent DECIMAL(5,2),
  model_version VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRICE SETTINGS
CREATE TABLE price_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factory_id UUID REFERENCES factories(id),
  product_type product_type NOT NULL,
  price_per_unit DECIMAL(8,2) NOT NULL,
  unit VARCHAR(20) DEFAULT 'kg',
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(factory_id, product_type)
);

-- INDEXES
CREATE INDEX idx_deliveries_date ON milk_deliveries(delivery_date);
CREATE INDEX idx_deliveries_farmer ON milk_deliveries(farmer_id);
CREATE INDEX idx_batches_date ON production_batches(production_date);
CREATE INDEX idx_batches_type ON production_batches(product_type);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_inventory_type ON inventory(product_type);
CREATE INDEX idx_notifications_factory ON notifications(factory_id, is_read);

-- DEFAULT DATA
INSERT INTO factories (id, name, address, city, region, capacity_liters_per_day) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Sut Kombinati №1', 'Mustaqillik ko''chasi 45', 'Toshkent', 'Toshkent viloyati', 50000);

INSERT INTO users (name, email, password_hash, role, factory_id) VALUES
  ('Administrator', 'admin@dairy.uz', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGqRZ2r1Q6dSoZTZQ.kM1AoGKDi', 'admin', '00000000-0000-0000-0000-000000000001');
-- Default password: Admin2024!

INSERT INTO price_settings (factory_id, product_type, price_per_unit) VALUES
  ('00000000-0000-0000-0000-000000000001', 'milk', 5500),
  ('00000000-0000-0000-0000-000000000001', 'yogurt', 12000),
  ('00000000-0000-0000-0000-000000000001', 'tvorog', 18000),
  ('00000000-0000-0000-0000-000000000001', 'smetana', 15000);

-- VIEWS
CREATE VIEW daily_milk_summary AS
SELECT 
  DATE(delivery_date) as day,
  factory_id,
  COUNT(*) as delivery_count,
  SUM(liters) as total_liters,
  AVG(fat_percent) as avg_fat,
  SUM(total_payment) as total_payment,
  COUNT(CASE WHEN quality_grade = 'premium' THEN 1 END) as premium_count,
  COUNT(CASE WHEN quality_grade = 'rejected' THEN 1 END) as rejected_count
FROM milk_deliveries
GROUP BY DATE(delivery_date), factory_id;

CREATE VIEW daily_sales_summary AS
SELECT
  DATE(sale_date) as day,
  factory_id,
  COUNT(*) as sale_count,
  SUM(final_amount) as revenue,
  SUM(CASE WHEN is_paid THEN final_amount ELSE 0 END) as collected
FROM sales
GROUP BY DATE(sale_date), factory_id;

CREATE VIEW current_inventory AS
SELECT
  i.factory_id,
  i.product_type,
  SUM(i.quantity_available) as total_available,
  SUM(i.quantity_reserved) as total_reserved,
  MIN(p.expiration_date) as earliest_expiry,
  i.low_stock_threshold,
  CASE WHEN SUM(i.quantity_available) < i.low_stock_threshold THEN true ELSE false END as is_low_stock
FROM inventory i
LEFT JOIN production_batches p ON i.batch_id = p.id
GROUP BY i.factory_id, i.product_type, i.low_stock_threshold;

