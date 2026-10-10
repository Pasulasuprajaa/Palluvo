# 🪷 PALLUVO — Luxury Indian Sarees & Fashion

> *“Every drape, a little magic.”*

PALLUVO is a modern, high-fashion Indian luxury saree e-commerce platform combining traditional Indian weaving heritage with a contemporary, high-conversion shopping experience.

---

## ✨ Features

- **Luxury Boutique Design**: Wine/Burgundy (`#5B1425`), Warm Ivory (`#FAF7F2`), and Muted Gold (`#C5A059`) aesthetic with bespoke typography (*Cinzel*, *Playfair Display*, *Plus Jakarta Sans*).
- **Curated Category & Occasion Collections**: Banarasi, Kanjivaram, Mulberry Silk, Organza, Cotton & Handloom, Designer Party Wear, and Bridal Trousseau edits.
- **Product Filtering & Sorting**: Multi-facet filtering by Category, Price Range, Occasion, Color, and Fabric with real-time sorting.
- **Interactive Shopping Funnel**:
  - Quick-view modal and rich product detail pages with fabric zoom, specification tables, and customer reviews.
  - Slide-over mini cart drawer & dedicated cart page with promo code redemption (`WELCOME10`, `FESTIVE20`, `MAGIC15`, `BRIDAL500`).
  - Interactive PIN code delivery estimation with expected delivery dates.
  - Multi-step checkout with delivery address selection/creation and order summary.
- **Payment Gateway Integration**:
  - Razorpay checkout integration with secure server-side HMAC SHA-256 signature verification.
  - Seamless fallback simulation mode for testing UPI, Cards, and NetBanking.
  - Cash on Delivery (COD) with verification.
- **Live Milestone Order Tracking**: Real-time progress bar from Order Placed → Confirmed → Handcrafted & Quality Check → Dispatched → In Transit → Delivered.
- **Customer Account Dashboard**: Order history, saved delivery addresses, wishlist management, and profile settings.
- **Admin Management Console**: Key sales metrics (GMV, AOV, order volume), product catalog manager, and shipment status updater.

---

## 🛠 Tech Stack

- **Frontend**: React 19, Tailwind CSS v4, Lucide Icons, Canvas Confetti, Vite.
- **Backend**: Node.js, Express.js, Better-SQLite3, CORS, Morgan, Dotenv, Crypto.
- **Payment**: Razorpay Node SDK with HMAC-SHA256 signature verification.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- npm

### 2. Installation

Clone the repository:
```bash
git clone https://github.com/weblazetech/Palluvo.git
cd Palluvo
```

Install root, backend, and frontend dependencies:
```bash
npm run install-all
```
*(Or install individually in `./server` and `./client`)*

### 3. Seed Database
Initialize SQLite database with authentic sarees, categories, reviews, and test accounts:
```bash
cd server
npm run seed
```

### 4. Running the Application

To run both backend and frontend concurrently:
```bash
npm run dev
```

Or run separately:
- **Backend** (Port 5000):
  ```bash
  cd server
  npm start
  ```
- **Frontend** (Port 3000):
  ```bash
  cd client
  npm run dev
  ```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Local Development Demo Credentials
*(Strictly confined to local development environments; disabled in production deployments)*

- **Customer Demo Account**:
  - Email: `priya@example.com`
  - Password: `Pal_User_Dev_2026!`
- **Admin Demo Console**:
  - Email: `admin@palluvo.com`
  - Password: `Pal_Admin_Dev_2026!`
  - Route: `/admin`

---

## 🛡️ Production Security & Administration Provisioning

In production (`NODE_ENV=production`), default demo accounts are not seeded, and a strong `JWT_SECRET` (minimum 32 characters) is required. Quick 1-click demo login buttons in the frontend auth dialog are automatically disabled and hidden in production builds (`import.meta.env.DEV === false`).

### Provisioning Production Administrators:
Production administrator accounts are provisioned out-of-band using the secure CLI tool without passing passwords on the command line:

```bash
# Interactive secure prompt (password is prompted securely without echo)
npm run create-admin admin@palluvo.com ["Admin Name"]

# Or using environment variables in automated CI/CD deployments:
ADMIN_EMAIL="admin@palluvo.com" ADMIN_PASSWORD="<strong_password>" npm run create-admin
```

---

## 💾 Production Storage & Database Architecture

For reliable e-commerce transactions across auto-scaling servers and serverless environments:

### Supported Storage Environment Variables:
- **`DATABASE_URL`**: SQLite database connection URL or path (e.g., `sqlite:///var/data/palluvo.db`, `file:/var/data/palluvo.db`, or `/var/data/palluvo.db`). Note: Network database protocols (such as `postgres://` or `mysql://`) require dedicated network driver adapters and are rejected with a descriptive error rather than parsed as filesystem paths.
- **`DATABASE_PATH`** / **`SQLITE_DB_PATH`**: Explicit file path to the SQLite database on a persistent mounted volume.
- **`DATABASE_DIR`** / **`DATA_DIR`**: Directory path where `palluvo.db` will be located.

### Environment Behaviors:
- **Local Development**: Stores data locally at `server/data/palluvo.db` with full read/write support and WAL journaling mode enabled.
- **Persistent Containers / VMs** *(Fly.io volumes, Railway persistent storage, Render disks, AWS ECS / EC2)*: Point `DATABASE_URL` or `DATABASE_PATH` to the mounted persistent volume. Local SQLite files on persistent disk volumes provide durable read/write storage.
- **Serverless Deployments** *(Vercel, AWS Lambda)*: Serverless function execution containers and filesystems (including `/tmp` and local scratch disks) are ephemeral and isolated per instance. To prevent signups, carts, inventory, orders, and payment states from disappearing or diverging across function instances:
  - Public catalog browsing, product search, filters, offers, and health checks operate smoothly in read-only mode.
  - Mutating commerce operations (user registration, bag/cart mutations, wishlist, order creation, payment capture, customer reviews, admin catalog edits) are automatically guarded by `requireDurableStorage` and default-denied (HTTP 503 `EPHEMERAL_STORAGE_RESTRICTED`) in serverless environments.

---

## 📄 License
MIT License © 2026 PALLUVO. All rights reserved.
