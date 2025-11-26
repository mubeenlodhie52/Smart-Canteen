CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(200)
);

CREATE TABLE Categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL
);

CREATE TABLE MenuItems (
    item_id SERIAL PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    price NUMERIC(10,2),
    description TEXT,
    image_url TEXT,
    category_id INT REFERENCES Categories(category_id)
);

CREATE TABLE Orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES Users(user_id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount NUMERIC(10,2)
);

CREATE TABLE OrderItems (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT REFERENCES Orders(order_id),
    item_id INT REFERENCES MenuItems(item_id),
    quantity INT,
    price NUMERIC(10,2)
);

-- Sample Data
INSERT INTO Categories(category_name) VALUES 
('Breakfast'), ('Burgers'), ('Drinks'), ('Snacks');

INSERT INTO MenuItems(item_name, price, description, image_url, category_id) VALUES
('Egg Roll', 120, 'Egg roll with veggies', 'https://via.placeholder.com/260x160', 1),
('Chicken Burger', 250, 'Grilled chicken burger', 'https://via.placeholder.com/260x160', 2),
('French Fries', 80, 'Medium fries', 'https://via.placeholder.com/260x160', 4),
('Coffee', 60, 'Hot coffee', 'https://via.placeholder.com/260x160', 3),
('Veg Sandwich', 150, 'Veg sandwich', 'https://via.placeholder.com/260x160', 1);
