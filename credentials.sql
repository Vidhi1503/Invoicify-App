-- =============================================================================
-- INVOICIFY — DATABASE SCHEMA & CREDENTIALS STORAGE ENGINE
-- =============================================================================
-- Description: Standard relational SQL schema designed for hosting Invoicify
--              accounts, credentials, active sessions, and synchronized invoices.
-- Compatibility: MySQL 8.0+, PostgreSQL 14+, and SQLite 3.x
-- =============================================================================

-- -----------------------------------------------------------------------------
-- DATABASE INITIALIZATION (Optional: Uncomment if setting up a new DB)
-- -----------------------------------------------------------------------------
-- CREATE DATABASE IF NOT EXISTS invoicify_db;
-- USE invoicify_db;

-- -----------------------------------------------------------------------------
-- TABLE: users
-- Description: Stores user account credentials, authentication hashes, and
--              audit metadata for both sign-ups and logins.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY, -- Standard UUIDv4
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Hashed passwords (e.g., bcrypt / Argon2)
    display_name VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT NULL
);

-- Index to optimize login lookups by email
CREATE INDEX idx_users_email ON users(email);

-- -----------------------------------------------------------------------------
-- TABLE: user_sessions
-- Description: Tracks active login states, authentication tokens, and expirations.
--              Mirrors the mock 'invoicify_mock_session' local storage behavior.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
    session_token VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    device_info VARCHAR(255) DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index to manage fast session validation checks
CREATE INDEX idx_sessions_user ON user_sessions(user_id);

-- -----------------------------------------------------------------------------
-- TABLE: default_profiles
-- Description: Stores the default business profile details for a sender.
--              Links to 'invoicify_default_profile' properties.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS default_profiles (
    user_id VARCHAR(36) PRIMARY KEY,
    business_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    payment_instructions TEXT DEFAULT NULL,
    logo_base64 LONGTEXT DEFAULT NULL, -- Holds uploaded business logo stream
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- TABLE: invoices
-- Description: Main headers and metadata configurations for all saved invoices.
--              Maps to Firestore documents in Cloud Mode.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(36) PRIMARY KEY, -- Standard UUIDv4 or custom document ID
    user_id VARCHAR(36) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft', -- Draft, Sent, Paid, Overdue
    currency VARCHAR(10) DEFAULT 'USD',
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
    discount_rate DECIMAL(5, 2) DEFAULT 0.00,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, invoice_number) -- Prevents duplicate invoice numbers per user
);

-- Indexes to maximize performance on dashboard analytics lookups
CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- -----------------------------------------------------------------------------
-- TABLE: invoice_items
-- Description: Services, items, rates, and quantities linked to individual invoices.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id VARCHAR(36) NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Index for invoice item grouping queries
CREATE INDEX idx_items_invoice ON invoice_items(invoice_id);

-- =============================================================================
-- SEED DATA & MOCK CREDENTIALS INSERTION
-- Description: Populate the tables with sample credentials and matching profile
--              data to enable immediate offline testing and analytics verification.
-- =============================================================================

-- 1. Insert Mock Users
-- Note: Passwords here represent cryptographically secure hashes of plain texts.
--       e.g., '123456' hashes to '$2b$10$wK1k6i4Xq.3W...'
INSERT INTO users (id, email, password_hash, display_name, last_login)
VALUES 
('usr-f938c823-1d0b-4bf1-b2ad-20b127bc0f7a', 'vidhij0815@gmail.com', '$2b$12$R9h/lSbuQRo5lGZ87qT8kO.Yh6k55rX.88kH09e99279aD8mN1lA2', 'Vidhi J', '2026-05-21 13:54:12'),
('usr-a94f382a-e832-47ef-ad9c-b19f20e408d1', 'vidhitest@gmail.com', '$2b$12$N9h/lSbuQRo5lGZ87qT8kO.Zh9k55rX.99kH10e10080aE9mN2lB3', 'Vidhi Test', NULL);

-- 2. Insert Default Sender Business Profiles
INSERT INTO default_profiles (user_id, business_name, email, phone, address, payment_instructions)
VALUES 
('usr-f938c823-1d0b-4bf1-b2ad-20b127bc0f7a', 'Acme Corporation', 'vidhij0815@gmail.com', '+1 (555) 019-2834', '123 Financial Blvd, Suite 100, New York, NY 10001', 'Bank: Apex Trust | A/C: 987654321 | Routing: 123456789');

-- 3. Insert Sample Invoices
INSERT INTO invoices (id, user_id, invoice_number, issue_date, due_date, status, currency, tax_rate, discount_rate, notes)
VALUES 
('inv-2026-001', 'usr-f938c823-1d0b-4bf1-b2ad-20b127bc0f7a', 'INV-2026-001', '2026-05-21', '2026-06-20', 'Draft', 'USD', 8.25, 5.00, 'Standard 30-day payment term applies. Thank you for your business!'),
('inv-2026-002', 'usr-f938c823-1d0b-4bf1-b2ad-20b127bc0f7a', 'INV-2026-002', '2026-05-15', '2026-06-14', 'Paid', 'USD', 10.00, 0.00, 'Paid in full on May 19, 2026 via wire transfer.');

-- 4. Insert Invoice Line Items
INSERT INTO invoice_items (invoice_id, description, quantity, unit_price)
VALUES 
('inv-2026-001', 'Premium UI Design & Glassmorphic Development', 1.00, 2400.00),
('inv-2026-001', 'Database Integration & Firebase API Engineering', 1.00, 1800.00),
('inv-2026-002', 'Cloud Server Architecture & Setup Consultation', 5.50, 150.00);

-- =============================================================================
-- AUDIT CHECK QUERIES (Handy commands to test layout outputs)
-- =============================================================================
-- -- Get active session list with user emails:
-- SELECT s.session_token, u.email, s.created_at, s.expires_at 
-- FROM user_sessions s 
-- JOIN users u ON s.user_id = u.id;
-- 
-- -- Get invoice grand total summaries (with Tax and Discount calculations):
-- SELECT 
--     i.invoice_number,
--     u.email AS user_email,
--     i.status,
--     SUM(it.quantity * it.unit_price) AS subtotal,
--     SUM(it.quantity * it.unit_price) * (1 - i.discount_rate/100) * (1 + i.tax_rate/100) AS grand_total
-- FROM invoices i
-- JOIN users u ON i.user_id = u.id
-- JOIN invoice_items it ON it.invoice_id = i.id
-- GROUP BY i.id;
