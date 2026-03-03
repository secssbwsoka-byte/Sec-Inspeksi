import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("inspections.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'inspector'
  );

  CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    location TEXT NOT NULL,
    last_inspection_date TEXT,
    status TEXT DEFAULT 'Good',
    image TEXT
  );

  CREATE TABLE IF NOT EXISTS inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER,
    inspector_name TEXT NOT NULL,
    inspection_date TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    image TEXT,
    guard_post_location TEXT,
    duty_officer_name TEXT,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id)
  );
`);

// Seed initial data if empty
const equipmentCount = db.prepare("SELECT count(*) as count FROM equipment").get() as { count: number };

// Cleanup: Remove the old items requested by user
const itemsToDelete = ["APAR Lobby Utama", "CCTV Koridor A", "Smoke Detector Ruang Server"];
const deleteStmt = db.prepare("DELETE FROM equipment WHERE name = ?");
itemsToDelete.forEach(name => deleteStmt.run(name));

if (equipmentCount.count <= 10) { // Adjusted threshold
  const insert = db.prepare("INSERT INTO equipment (name, type, location, status) VALUES (?, ?, ?, ?)");
  
  const newItems = [
    ["Motor Trail Kawasaki KLX", "Vehicle", "Parkir Timur", "Good"],
    ["Flash Light Maglite", "Lighting", "Pos Jaga 1", "Good"],
    ["Garrett Metal Detector", "Security Tool", "Pintu Masuk Utama", "Good"],
    ["Rompi Tactical Bodyvest", "Apparel", "Gudang Logistik", "Good"],
    ["Lampu Lalu Lintas Portable", "Traffic Control", "Gerbang Depan", "Good"],
    ["Helm + Kacamata Tactical", "Safety Gear", "Gudang Logistik", "Good"],
    ["CCTV Surveillance PTZ", "Surveillance", "Area Perimeter", "Good"],
    ["UAV Rotary Wing (Drone)", "Surveillance", "Ruang Kontrol", "Good"],
    ["Hand Phone Android (Patrol)", "Communication", "Pos Jaga 2", "Good"],
    ["Baton Stick Besi", "Security Tool", "Pos Jaga 1", "Good"]
  ];

  newItems.forEach(item => {
    // Check if already exists to avoid duplicates if re-running
    const exists = db.prepare("SELECT id FROM equipment WHERE name = ?").get(item[0]);
    if (!exists) {
      insert.run(item[0], item[1], item[2], item[3]);
    }
  });
}

// Seed admin user
const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", "admin123", "admin");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Route
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    
    if (user) {
      res.json({ success: true, user: { username: user.username, role: user.role } });
    } else {
      res.status(401).json({ success: false, message: "Username atau password salah" });
    }
  });

  // API Routes
  app.get("/api/equipment", (req, res) => {
    const items = db.prepare("SELECT * FROM equipment").all();
    res.json(items);
  });

  app.post("/api/equipment", (req, res) => {
    const { name, type, location } = req.body;
    const info = db.prepare("INSERT INTO equipment (name, type, location) VALUES (?, ?, ?)").run(name, type, location);
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/equipment/:id/image", (req, res) => {
    const { id } = req.params;
    const { image } = req.body;
    db.prepare("UPDATE equipment SET image = ? WHERE id = ?").run(image, id);
    res.json({ success: true });
  });

  app.get("/api/inspections", (req, res) => {
    const items = db.prepare(`
      SELECT i.*, e.name as equipment_name 
      FROM inspections i 
      JOIN equipment e ON i.equipment_id = e.id 
      ORDER BY i.inspection_date DESC
    `).all();
    res.json(items);
  });

  app.post("/api/inspections", (req, res) => {
    const { equipment_id, inspector_name, status, notes, image, guard_post_location, duty_officer_name } = req.body;
    const date = new Date().toISOString();
    
    const transaction = db.transaction(() => {
      db.prepare("INSERT INTO inspections (equipment_id, inspector_name, inspection_date, status, notes, image, guard_post_location, duty_officer_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(equipment_id, inspector_name, date, status, notes, image, guard_post_location, duty_officer_name);
      
      db.prepare("UPDATE equipment SET last_inspection_date = ?, status = ? WHERE id = ?")
        .run(date, status, equipment_id);
    });

    transaction();
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
