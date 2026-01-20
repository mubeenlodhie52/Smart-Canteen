import { sql } from "./config/db.js";
import bcrypt from "bcrypt";

// Create Admins Table
export async function createAdminTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS admins (
        admin_id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      )
    `;
    // const hashedPassword = await bcrypt.hash("admin123", 10);
    // await sql` INSERT INTO admins(username, password) VALUES('admin', ${hashedPassword})`
    // console.log("New Admin User")
    // console.log("Admins table created");
  } catch (err) {
    console.error("Error creating admins table:", err);
  }
}

// Create Categories Table
export async function createCategoriesTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS Categories (
        category_id SERIAL PRIMARY KEY,
        category_name VARCHAR(100) UNIQUE NOT NULL
      )
    `;
    console.log("Categories table created");
  } catch (err) {
    console.error("Error creating categories table:", err);
  }
}

// Create Users Table
export async function createUsersTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS Users (
        user_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone_number VARCHAR(15) UNIQUE NOT NULL
      )
    `;
    console.log("Users table created");
  } catch (err) {
    console.error("Error creating users table:", err);
  }
}

// Create MenuItems Table
export async function createMenuItemsTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS MenuItems (
        item_id SERIAL PRIMARY KEY,
        item_name VARCHAR(100) NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        description TEXT,
        image_url TEXT,
        category_id INT REFERENCES Categories(category_id) ON DELETE SET NULL
      )
    `;
    console.log("MenuItems table created");
  } catch (err) {
    console.error("Error creating MenuItems table:", err);
  }
}

// Create Orders Table
export async function createOrdersTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS Orders (
        order_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES Users(user_id) ON DELETE CASCADE,
        total_amount NUMERIC(10,2) NOT NULL,
        order_date TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log("Orders table created");
  } catch (err) {
    console.error("Error creating Orders table:", err);
  }
}

// Create OrderItems Table
export async function createOrderItemsTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS OrderItems (
        order_item_id SERIAL PRIMARY KEY,
        order_id INT REFERENCES Orders(order_id) ON DELETE RESTRICT,
        item_id INT REFERENCES MenuItems(item_id) ON DELETE RESTRICT,
        quantity INT NOT NULL,
        price NUMERIC(10,2) NOT NULL
      )
    `;
    console.log("OrderItems table created");
  } catch (err) {
    console.error("Error creating OrderItems table:", err);
  }
}

// Create all tables in order
export async function createAllTables() {
  await createAdminTable();
  await createCategoriesTable();
  await createUsersTable();
  await createMenuItemsTable();
  await createOrdersTable();
  await createOrderItemsTable();
  console.log("All tables created successfully!");
}


createAllTables();