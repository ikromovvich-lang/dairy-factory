-- ═══════════════════════════════════════════════════════════════
-- 🥛 DAIRY FACTORY MANAGEMENT SYSTEM — PostgreSQL Schema
-- Версия: 2.0 | Молочный завод — Sut Zavodi
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ───────────────────────────────────────────────────────────────
-- ПОЛЬЗОВАТЕЛИ | FOYDALANUVCHILAR
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'worker' CHECK (role IN ('admin','manager','worker')),
    factory_id VARCHAR(50) DEFAULT 'FACTORY_001',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────
-- ФЕРМЕРЫ | FERMERLAR
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS farmers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    location VARCHAR(200) NOT NULL,
    district VARCHAR(100),
    bank_account VARCHAR(50),
    price_per_liter DECIMAL(10,2) DEFAULT 3500.00,
    quality_multiplier DECIMAL(4,3) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT true,
    total_delivered DECIMAL(12,3) DEFAULT 0,
    total_paid DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────
-- ПРИЁМ МОЛОКА | SUT QABULI
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS milk_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_number VARCHAR(30) UNIQUE NOT NULL,
    farmer_id UUID REFERENCES farmers(id) ON DELETE RESTRICT,
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_time TIME DEFAULT CURRENT_TIME,
    liters DECIMAL(10,3) NOT NULL CHECK (liters > 0),
    fat_percent DECIMAL(4,2) NOT NULL CHECK (fat_percent BETWEEN 2.5 AND 8.0),
    protein_percent DECIMAL(4,2) DEFAULT 3.2,
    acidity DECIMAL(5,2),
    temperature DECIMAL(4,1),
    quality_grade VARCHAR(10) NOT NULL DEFAULT 'B' CHECK (quality_grade IN ('Premium','A','B','C','Reject')),
    price_per_liter DECIMAL(10,2) NOT NULL,
    quality_bonus DECIMAL(10,2) DEFAULT 0,
    total_payment DECIMAL(15,2),
    is_paid BOOLEAN DEFAULT false,
    payment_date DATE,
    notes TEXT,
    received_by UUID REFERENCES users(id),
    tank_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────
-- ПРОИЗВОДСТВЕННЫЕ ПАРТИИ | ISHLAB CHIQARISH PARTIYALARI
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS production_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number VARCHAR(30) UNIQUE NOT NULL,
    product_type VARCHAR(30) NOT NULL CHECK (product_type IN ('milk','yogurt','tvorog','smetana','butter','kefir')),
    product_name_ru VARCHAR(100) NOT NULL,
    product_name_uz VARCHAR(100) NOT NULL,
    production_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    shift VARCHAR(20) DEFAULT 'morning' CHECK (shift IN ('morning','afternoon','night')),
    milk_used_liters DECIMAL(12,3) NOT NULL,
    quantity_produced DECIMAL(12,3) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'kg',
    yield_percent DECIMAL(5,2),
    fat_content DECIMAL(4,2),
    status VARCHAR(20) DEFAULT 'in_production' CHECK (status IN ('in_production','completed','quality_check','approved','rejected')),
    qr_code_url TEXT,
    qr_code_data TEXT,
    responsible_worker UUID REFERENCES users(id),
    quality_approved_by UUID REFERENCES users(id),
    quality_notes TEXT,
    cost_per_unit DECIMAL(12,4),
    batch_metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────
-- ИНВЕНТАРЬ | INVENTAR
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_type VARCHAR(30) NOT NULL UNIQUE,
    product_name_ru VARCHAR(100) NOT NULL,
    product_name_uz VARCHAR(100) NOT NULL,
    current_stock DECIMAL(12,3) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'kg',
    min_stock_alert DECIMAL(10,3) DEFAULT 50,
    max_capacity DECIMAL(12,3) DEFAULT 5000,
    price_per_unit DECIMAL(12,2) NOT NULL,
    storage_temp_min DECIMAL(4,1),
    storage_temp_max DECIMAL(4,1),
    shelf_life_days INTEGER DEFAULT 7,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────
-- ДВИЖЕНИЯ ИНВЕНТАРЯ | INVENTAR HARAKATLARI
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_type VARCHAR(30) NOT NULL,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('production','sale','adjustment','waste','return')),
    quantity DECIMAL(12,3) NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(30),
    balance_before DECIMAL(12,3),
    balance_after DECIMAL(12,3),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────
-- КЛИЕНТЫ | MIJOZLAR
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(30) DEFAULT 'shop' CHECK (type IN ('shop','distributor','restaurant','individual','wholesale')),
    contact_name VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    address VARCHAR(250),
    district VARCHAR(100),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    current_debt DECIMAL(15,2) DEFAULT 0,
    discount_percent DECIMAL(4,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    total_purchases DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────
-- ПРОДАЖИ | SOTUVLAR
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(30) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sale_time TIME DEFAULT CURRENT_TIME,
    items JSONB NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(30) DEFAULT 'cash' CHECK (payment_method IN ('cash','bank_transfer','credit','card')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('paid','pending','partial','overdue')),
    paid_amount DECIMAL(15,2) DEFAULT 0,
    due_date DATE,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────
-- УВЕДОМЛЕНИЯ | BILDIRISHNOMALAR
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    title_ru VARCHAR(200) NOT NULL,
    title_uz VARCHAR(200) NOT NULL,
    message_ru TEXT NOT NULL,
    message_uz TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info','warning','critical','success')),
    is_read BOOLEAN DEFAULT false,
    target_roles VARCHAR(100)[],
    reference_id UUID,
    reference_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────
-- AI ПРОГНОЗЫ | AI BASHORATLAR
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    forecast_type VARCHAR(50) NOT NULL,
    product_type VARCHAR(30),
    forecast_date DATE NOT NULL,
    predicted_value DECIMAL(15,3) NOT NULL,
    confidence_low DECIMAL(15,3),
    confidence_high DECIMAL(15,3),
    actual_value DECIMAL(15,3),
    accuracy_percent DECIMAL(5,2),
    model_version VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────
-- ПЕРВОНАЧАЛЬНЫЕ ДАННЫЕ | BOSHLANG'ICH MA'LUMOTLAR
-- ───────────────────────────────────────────────────────────────

-- Инвентарь по умолчанию
INSERT INTO inventory (product_type, product_name_ru, product_name_uz, current_stock, unit, price_per_unit, min_stock_alert, max_capacity, storage_temp_min, storage_temp_max, shelf_life_days) VALUES
  ('milk',    'Молоко пастеризованное', 'Pasterizatsiyalangan sut',   0, 'л',   8500,  200, 10000, 2, 6,  5),
  ('yogurt',  'Йогурт натуральный',     'Tabiiy yogurt',              0, 'кг',  12000, 100, 5000,  2, 6, 14),
  ('tvorog',  'Творог домашний',        'Uy tvorogi',                 0, 'кг',  25000,  50, 2000,  2, 6,  7),
  ('smetana', 'Сметана 20%',            'Smetana 20%',                0, 'кг',  22000,  80, 3000,  2, 6, 14),
  ('butter',  'Масло сливочное',        'Sariyog',                    0, 'кг',  45000,  30, 1000,  0, 4, 30),
  ('kefir',   'Кефир 2.5%',             'Kefir 2.5%',                 0, 'л',   9000,  100, 5000,  2, 6,  7)
ON CONFLICT (product_type) DO NOTHING;

-- Администратор по умолчанию (пароль: Admin2024!)
INSERT INTO users (name, email, phone, password_hash, role, factory_id) VALUES
  ('Администратор', 'admin@sut-zavod.uz', '+998901234567', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TsuQjwP0E5Hs5a6VqHe1K5TkNwMy', 'admin', 'FACTORY_001')
ON CONFLICT (email) DO NOTHING;

-- ───────────────────────────────────────────────────────────────
-- ИНДЕКСЫ | INDEKSLAR
-- ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_milk_deliveries_date ON milk_deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_milk_deliveries_farmer ON milk_deliveries(farmer_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_date ON production_batches(production_date);
CREATE INDEX IF NOT EXISTS idx_production_batches_type ON production_batches(product_type);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_farmers_active ON farmers(is_active);

-- ───────────────────────────────────────────────────────────────
-- ТРИГГЕРЫ | TRIGGERLAR
-- ───────────────────────────────────────────────────────────────

-- Авто-обновление updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_farmers_updated_at BEFORE UPDATE ON farmers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON production_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at();
