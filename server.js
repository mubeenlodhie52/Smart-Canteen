import express from "express";
import { sql } from "./config/db.js"; // Use tagged template
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import session from "express-session";
import { createAllTables } from "./sqlScript.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MIDDLEWARE
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.use(
  session({
    secret: process.env.SESSION_SECRET || "mysecretkey",
    resave: false,
    saveUninitialized: false,
  })
);


createAllTables();

// VALIDATION
function isValidPakistaniNumber(number) {
  return /^03[0-9]{9}$/.test(number);
}

// ADMIN AUTH
function adminAuth(req, res, next) {
  if (!req.session.adminId) return res.redirect("/admin/login");
  next();
}



// Home page
app.get("/", async (req, res) => {
  try {
    const menu = await sql`SELECT * FROM MenuItems`;
    return res.render("index", { menu, error: null });
  } catch (err) {
    console.error(err);
    return res.render("index", { menu: [], error: "Error loading home page" });
  }
});

// Menu page
app.get("/menu", async (req, res) => {
  try {
    const categories = await sql`SELECT * FROM Categories`;
    const items = await sql`SELECT * FROM MenuItems`;
    return res.render("menu", { categories, items, error: null });
  } catch (err) {
    console.error(err);
    res.render("menu", { categories: [], items: [], error: "Error loading menu" });
  }
});

// Order page
app.post("/order", async (req, res) => {
  try {
    const { item_id } = req.body;
    const itemResult = await sql`SELECT * FROM MenuItems WHERE item_id=${item_id}`;
    const item = itemResult[0];
    return res.render("order", { item, error: null });
  } catch (err) {
    console.error(err);
    return res.render("order", { item: null, error: "Error loading order page" });
  }
});

// Submit order
app.post("/order/submit", async (req, res) => {
  try {
    const { name, phone_number, item_id, quantity } = req.body;

    if (!isValidPakistaniNumber(phone_number)) {
      return res.render("order", { item: { item_id }, error: "Invalid Pakistani phone number" });
    }

    let userResult = await sql`SELECT * FROM Users WHERE phone_number=${phone_number}`;
    let users = userResult;
    let user_id;

    if (users.length > 0) {
      user_id = users[0].user_id;
    } else {
      const insertUserResult = await sql`
        INSERT INTO Users(name, phone_number)
        VALUES(${name}, ${phone_number})
        RETURNING user_id
      `;
      user_id = insertUserResult[0].user_id;
    }

    const priceResult = await sql`SELECT price FROM MenuItems WHERE item_id=${item_id}`;
    const price = priceResult[0]?.price || 0;
    const total = price * Number(quantity);

    const orderResult = await sql`
      INSERT INTO Orders(user_id, total_amount)
      VALUES(${user_id}, ${total})
      RETURNING order_id
    `;
    const order_id = orderResult[0].order_id;

    await sql`
      INSERT INTO OrderItems(order_id, item_id, quantity, price)
      VALUES(${order_id}, ${item_id}, ${Number(quantity)}, ${price})
    `;

    return res.redirect("/success");
  } catch (err) {
    console.error(err);
    return res.render("order", { item: { item_id: req.body.item_id }, error: "Error submitting order" });
  }
});

// Success page
app.get("/success", (req, res) => res.render("success", { error: null }));



app.get("/admin/login", (req, res) => res.render("admin/login", { error: null }));

app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await sql`SELECT * FROM admins WHERE username=${username}`;
    if (result.length === 0) {
      return res.render("admin/login", { error: "User not found!" });
    }

    const admin = result[0];
    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.render("admin/login", { error: "Invalid username or password" });
    }

    req.session.adminId = admin.admin_id;
    return res.redirect("/admin/orders");
  } catch (err) {
    console.error(err);
    return res.render("admin/login", { error: "Login error" });
  }
});

app.get("/admin/logout", (req, res) => req.session.destroy(() => res.redirect("/admin/login")));

// ==========================
// ADMIN PAGES (Protected)
// ==========================
app.use("/admin", adminAuth);

// Add Item Page
app.get("/admin/addItem", async (req, res) => {
  try {
    const categories = await sql`SELECT * FROM Categories`;
    const items = await sql`SELECT * FROM MenuItems`;

    if(items.length === 0){
      return res.render("admin/addItem", { categories, items:[], error: "No items found!" });
    }

    return res.render("admin/addItem", { categories, items, error: null });
  } catch (err) {
    console.error(err);
    return res.render("admin/addItem", { categories: [], items: [], error: "Error loading add item page" });
  }
});

// Add Item
app.post("/admin/addItem", async (req, res) => {
  try {
    const { item_name, price, description, image_url, category_id } = req.body;
    await sql`
      INSERT INTO MenuItems(item_name, price, description, image_url, category_id)
      VALUES(${item_name}, ${price}, ${description}, ${image_url}, ${category_id})
    `;
    return res.redirect("/admin/addItem");
  } catch (err) {
    console.error(err);
    return res.render("admin/addItem", { categories: [], items: [], error: "Error adding menu item" });
  }
});


// Delete Item
app.post("/admin/deleteItem", async (req, res) => {
  try {
    const { item_id } = req.body;
    const orderItem = await sql`SELECT * FROM OrderItems WHERE item_id=${item_id}`;
    if(orderItem.length > 0){
      return res.render("admin/addItem", { categories: [], items: [], error: "Cannot delete item linked to orders" });
    }
    await sql`DELETE FROM MenuItems WHERE item_id=${item_id}`;
    return res.redirect("/menu");
  } catch (err) {
    console.error(err);
    return res.render("admin/addItem", { categories: [], items: [], error: "Error deleting item" });
  }
});

// Categories Page
app.get("/admin/categories", async (req, res) => {
  try {
    const categories = await sql`SELECT * FROM Categories`;
    if(categories.length === 0){
      return res.render("admin/categories", {categories:[] ,error: "No categories found!" });
    }
    return res.render("admin/categories", { categories, error: null });
  } catch (err) {
    console.error(err);
    return res.render("admin/categories", { categories: [], error: "Error loading categories" });
  }
});

// Add Category
app.post("/admin/addCategory", async (req, res) => {
  try {
    const { category_name } = req.body;
    await sql`INSERT INTO Categories(category_name) VALUES(${category_name})`;
    res.redirect("/admin/categories");
  } catch (err) {
    console.error(err);
    res.render("admin/categories", { categories: [], error: "Error adding category" });
  }
});

// Delete Category
app.post("/admin/deleteCategory", async (req, res) => {
  try {
    const { category_id } = req.body;
    await sql`DELETE FROM Categories WHERE category_id=${category_id}`;
    res.redirect("/admin/categories");
  } catch (err) {
    console.error(err);
    res.render("admin/categories", { categories: [], error: "Error deleting category" });
  }
});

// Admin Orders
app.get("/admin/orders", async (req, res) => {
  try {
    const ordersResult = await sql`
      SELECT o.order_id, o.order_date, o.total_amount,
             u.name, u.phone_number,
             json_agg(json_build_object('item_name', m.item_name, 'quantity', oi.quantity)) AS items
      FROM Orders o
      JOIN Users u ON o.user_id = u.user_id
      JOIN OrderItems oi ON o.order_id = oi.order_id
      JOIN MenuItems m ON oi.item_id = m.item_id
      GROUP BY o.order_id, u.name, u.phone_number
      ORDER BY o.order_date DESC
    `;
    const orders = ordersResult;
    return res.render("admin/orders", { orders, error: null });
  } catch (err) {
    console.error(err);
    return res.render("admin/orders", { orders: [], error: "Error loading orders" });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`)
});