import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("inspections.db");

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize database inside startServer
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user'
      );

      CREATE TABLE IF NOT EXISTS equipment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        location TEXT NOT NULL,
        last_inspection_date TEXT,
        status TEXT DEFAULT 'Good'
      );

      CREATE TABLE IF NOT EXISTS inspections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_id INTEGER,
        inspector_name TEXT NOT NULL,
        inspection_date TEXT NOT NULL,
        guard_post TEXT,
        image TEXT,
        officer_name TEXT,
        status TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (equipment_id) REFERENCES equipment(id)
      );
    `);

    // Ensure columns exist (migration for existing databases)
    const columns = db.prepare("PRAGMA table_info(inspections)").all() as any[];
    const columnNames = columns.map(c => c.name);

    if (!columnNames.includes('guard_post')) {
      db.exec("ALTER TABLE inspections ADD COLUMN guard_post TEXT");
    }
    if (!columnNames.includes('image')) {
      db.exec("ALTER TABLE inspections ADD COLUMN image TEXT");
    }
    if (!columnNames.includes('officer_name')) {
      db.exec("ALTER TABLE inspections ADD COLUMN officer_name TEXT");
    }
    if (!columnNames.includes('equipment_id')) {
      db.exec("ALTER TABLE inspections ADD COLUMN equipment_id INTEGER");
    }

    // Migration for users table
    const userColumns = db.prepare("PRAGMA table_info(users)").all() as any[];
    const userColumnNames = userColumns.map(c => c.name);
    if (!userColumnNames.includes('role')) {
      db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
    }

    // Seed initial equipment
    const equipmentCount = db.prepare("SELECT count(*) as count FROM equipment").get() as { count: number };
    if (equipmentCount.count === 0) {
      const insert = db.prepare("INSERT INTO equipment (name, type, location, status) VALUES (?, ?, ?, ?)");
      const initialItems = [
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
      initialItems.forEach(item => insert.run(item[0], item[1], item[2], item[3]));
    }

    // Seed or Update admin user
    const adminUser = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
    if (!adminUser) {
      db.prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)")
        .run('admin', 'admin@soka.ags', 'Security.Soka', 'admin');
      console.log("Admin user seeded.");
    } else {
      db.prepare("UPDATE users SET password = ?, role = ? WHERE username = 'admin'")
        .run('Security.Soka', 'admin');
      console.log("Admin user updated.");
    }
  } catch (err) {
    console.error("Database initialization error:", err);
  }

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Auth Routes
  app.post("/api/register", (req, res) => {
    const { username, email, password } = req.body;
    try {
      const exists = db.prepare("SELECT id FROM users WHERE username = ? OR email = ?").get(username, email);
      if (exists) {
        return res.status(400).json({ success: false, message: "Username atau Email sudah terdaftar" });
      }
      db.prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)").run(username, email, password, 'user');
      res.json({ success: true, message: "Registrasi berhasil" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Gagal melakukan registrasi" });
    }
  });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (user) {
      res.json({ success: true, user: { username: user.username, email: user.email, role: user.role } });
    } else {
      res.status(401).json({ success: false, message: "Username atau password salah" });
    }
  });

  // Equipment Routes
  app.get("/api/equipment", (req, res) => {
    const items = db.prepare("SELECT * FROM equipment").all();
    res.json(items);
  });

  app.post("/api/equipment", (req, res) => {
    const { name, type, location } = req.body;
    const info = db.prepare("INSERT INTO equipment (name, type, location) VALUES (?, ?, ?)").run(name, type, location);
    res.json({ id: info.lastInsertRowid });
  });

  // Inspection Routes
  app.get("/api/inspections", (req, res) => {
    const items = db.prepare(`
      SELECT i.*, e.name as equipment_name 
      FROM inspections i 
      LEFT JOIN equipment e ON i.equipment_id = e.id 
      ORDER BY i.inspection_date DESC
    `).all();
    res.json(items);
  });

  app.post("/api/inspections", (req, res) => {
    const { equipment_id, inspector_name, status, notes, guard_post, image, inspection_date, officer_name } = req.body;
    const date = inspection_date || new Date().toISOString();
    
    try {
      const transaction = db.transaction(() => {
        console.log("Adding inspection for equipment:", equipment_id);
        db.prepare("INSERT INTO inspections (equipment_id, inspector_name, inspection_date, status, notes, guard_post, image, officer_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
          .run(equipment_id, inspector_name, date, status, notes, guard_post, image, officer_name);
        
        db.prepare("UPDATE equipment SET last_inspection_date = ?, status = ? WHERE id = ?")
          .run(date, status, equipment_id);
      });

      transaction();
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving inspection:", error);
      res.status(500).json({ success: false, message: "Gagal menyimpan data inspeksi" });
    }
  });

  app.delete("/api/inspections/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM inspections WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting inspection:", error);
      res.status(500).json({ success: false, message: "Gagal menghapus data inspeksi" });
    }
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
