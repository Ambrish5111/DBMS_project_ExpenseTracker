-- Drop existing objects if needed
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    total_balance NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categories Table
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- Pre-populate standard categories
INSERT INTO categories (name) VALUES 
('Food & Dining'), 
('Transportation'), 
('Utilities & Bills'), 
('Entertainment'), 
('Stationery & College'), 
('Healthcare');

-- 3. Expenses Table (Foreign Keys & Constraints)
CREATE TABLE expenses (
    expense_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
    title VARCHAR(150) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. DBMS Trigger: Deduct from user's balance on expense insert
CREATE OR REPLACE FUNCTION update_user_balance_on_expense()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET total_balance = total_balance - NEW.amount
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger first to prevent conflicts, then create cleanly
DROP TRIGGER IF EXISTS trg_after_expense_insert ON expenses;

CREATE TRIGGER trg_after_expense_insert
AFTER INSERT ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_user_balance_on_expense();

-- Seed an initial test user with balance
INSERT INTO users (full_name, email, total_balance)
VALUES ('Aryan Mankare', 'aryan@example.com', 50000.00);