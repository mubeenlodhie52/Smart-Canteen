import express from "express";
import { db } from "./config/db.js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import session from "express-session";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================
// MIDDLEWARE
// ======================
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.use(session({
  secret: process.env.SESSION_SECRET || "mysecretkey",
  resave: false,
  saveUninitialized: false,
}));

// ======================
// VALIDATION
// ======================
function isValidPakistaniNumber(number) {
  const regex = /^03[0-9]{9}$/;
  return regex.test(number);
}

// ======================
// ADMIN AUTH MIDDLEWARE
// ======================
function adminAuth(req, res, next) {
  if (!req.session.adminId) return res.redirect("/admin/login");
  next();
}

// ======================
// MAIN PAGES
// ======================

// Home page
app.get("/", async (req, res) => {
  try {
    const menu = await db.query("SELECT * FROM MenuItems");
    res.render("index", { menu: menu.rows, error: null });
  } catch (err) {
    console.error(err);
    res.render("index", { menu: [], error: "Error loading home page" });
  }
});

// Menu page
app.get("/menu", async (req, res) => {
  try {
    const categories = await db.query("SELECT * FROM Categories");
    const items = await db.query("SELECT * FROM MenuItems");
    res.render("menu", { categories: categories.rows, items: items.rows, error: null });
  } catch (err) {
    console.error(err);
    res.render("menu", { categories: [], items: [], error: "Error loading menu" });
  }
});

// Order page
app.post("/order", async (req, res) => {
  try {
    const { item_id } = req.body;
    const item = await db.query("SELECT * FROM MenuItems WHERE item_id=$1", [item_id]);
    res.render("order", { item: item.rows[0], error: null });
  } catch (err) {
    console.error(err);
    res.render("order", { item: null, error: "Error loading order page" });
  }
});

// Submit order
app.post("/order/submit", async (req, res) => {
  try {
    const { name, phone_number, item_id, quantity } = req.body;

    if (!isValidPakistaniNumber(phone_number)) {
      return res.render("order", { item: { item_id }, error: "Invalid Pakistani phone number" });
    }

    let user = await db.query("SELECT * FROM Users WHERE phone_number=$1", [phone_number]);
    let user_id;
    if (user.rows.length > 0) {
      user_id = user.rows[0].user_id;
    } else {
      const insertUser = await db.query(
        "INSERT INTO Users(name, phone_number) VALUES($1,$2) RETURNING user_id",
        [name, phone_number]
      );
      user_id = insertUser.rows[0].user_id;
    }

    const priceData = await db.query("SELECT price FROM MenuItems WHERE item_id=$1", [item_id]);
    const price = priceData.rows[0].price;
    const total = price * quantity;

    const order = await db.query(
      "INSERT INTO Orders(user_id,total_amount) VALUES($1,$2) RETURNING order_id",
      [user_id, total]
    );
    const order_id = order.rows[0].order_id;

    await db.query(
      "INSERT INTO OrderItems(order_id,item_id,quantity,price) VALUES($1,$2,$3,$4)",
      [order_id, item_id, quantity, price]
    );

    res.redirect("/success");
  } catch (err) {
    console.error(err);
    res.render("order", { item: { item_id: req.body.item_id }, error: "Error submitting order" });
  }
});

// Success page
app.get("/success", (req, res) => {
  res.render("success", { error: null });
});

// ======================
// ADMIN LOGIN / LOGOUT
// ======================

app.get("/admin/login", (req, res) => {
  res.render("admin/login", { error: null });
});

app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.query("SELECT * FROM admins WHERE username=$1", [username]);
    if (result.rows.length === 0) {
      return res.render("admin/login", { error: "Invalid username or password" });
    }
    const admin = result.rows[0];
    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.render("admin/login", { error: "Invalid username or password" });
    }
    req.session.adminId = admin.admin_id;
    res.redirect("/admin/orders");
  } catch (err) {
    console.error(err);
    res.render("admin/login", { error: "Login error" });
  }
});

app.get("/admin/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

// ======================
// ADMIN PAGES (Protected)
// ======================
app.use("/admin", adminAuth);

// Add Item Page
app.get("/admin/addItem", async (req, res) => {
  try {
    const categories = await db.query("SELECT * FROM Categories");
    const items = await db.query("SELECT * FROM MenuItems");
    res.render("admin/addItem", { categories: categories.rows, items: items.rows, error: null });
  } catch (err) {
    console.error(err);
    res.render("admin/addItem", { categories: [], items: [], error: "Error loading add item page" });
  }
});

// Delete Item
app.post("/admin/deleteItem", async (req, res) => {
  try {
    const { item_id } = req.body;
    await db.query("DELETE FROM MenuItems WHERE item_id=$1", [item_id]);
    res.redirect("/menu");
  } catch (err) {
    console.error(err);
    res.render("admin/addItem", { categories: [], items: [], error: "Error deleting item" });
  }
});

// Add Item
app.post("/admin/addItem", async (req, res) => {
  try {
    const { item_name, price, description, image_url, category_id } = req.body;
    await db.query(
      "INSERT INTO MenuItems(item_name, price, description, image_url, category_id) VALUES($1,$2,$3,$4,$5)",
      [item_name, price, description, image_url, category_id]
    );
    res.redirect("/admin/addItem");
  } catch (err) {
    console.error(err);
    res.render("admin/addItem", { categories: [], items: [], error: "Error adding menu item" });
  }
});

// Categories Page
app.get("/admin/categories", async (req, res) => {
  try {
    const categories = await db.query("SELECT * FROM Categories");
    res.render("admin/categories", { categories: categories.rows, error: null });
  } catch (err) {
    console.error(err);
    res.render("admin/categories", { categories: [], error: "Error loading categories" });
  }
});

// Add Category
app.post("/admin/addCategory", async (req, res) => {
  try {
    const { category_name } = req.body;
    await db.query("INSERT INTO Categories(category_name) VALUES($1)", [category_name]);
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
    await db.query("DELETE FROM Categories WHERE category_id=$1", [category_id]);
    res.redirect("/admin/categories");
  } catch (err) {
    console.error(err);
    res.render("admin/categories", { categories: [], error: "Error deleting category" });
  }
});

// Admin Orders
app.get("/admin/orders", async (req, res) => {
  try {
    const orders = await db.query(
      `SELECT o.order_id, o.order_date, o.total_amount,
       u.name, u.phone_number,
       json_agg(json_build_object('item_name', m.item_name, 'quantity', oi.quantity)) AS items
       FROM Orders o
       JOIN Users u ON o.user_id = u.user_id
       JOIN OrderItems oi ON o.order_id = oi.order_id
       JOIN MenuItems m ON oi.item_id = m.item_id
       GROUP BY o.order_id, u.name, u.phone_number
       ORDER BY o.order_date DESC`
    );
    res.render("admin/orders", { orders: orders.rows, error: null });
  } catch (err) {
    console.error(err);
    res.render("admin/orders", { orders: [], error: "Error loading orders" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));
