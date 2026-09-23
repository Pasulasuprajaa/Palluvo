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

## 🔑 Demo Credentials

- **Customer Demo Account**:
  - Email: `priya@example.com`
  - Password: `password123`
- **Admin Management Console**:
  - Email: `admin@palluvo.com`
  - Password: `admin123`
  - Route: `/admin`

---

## 📄 License
MIT License © 2026 PALLUVO. All rights reserved.
