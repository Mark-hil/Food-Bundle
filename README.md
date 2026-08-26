# Food Bundle - Student Food Delivery System

Food Bundle is a comprehensive, modern web application designed to provide students with convenient, subscription-based, or one-off food bundle deliveries directly to their campus.

## 🚀 Features

### For Students
- **Browse & Order:** View available food bundles with a unified experience for guests and authenticated users.
- **Subscriptions:** Subscribe to weekly or monthly meal plans.
- **Order Tracking:** Real-time delivery tracking for active orders.
- **Loyalty & Referrals:** Earn points and refer friends for discounts.
- **Support System:** Built-in ticketing system for customer support.
- **Guest Checkout:** Quick ordering without creating an account.
- **PWA Ready:** Install the app directly on your mobile device or desktop.

### For Administrators
- **Dashboard Overview:** Monitor key metrics (orders, revenue, active students).
- **Inventory Management:** Manage individual product items and automate bundle pricing based on selected inventory.
- **Bundle & Package Management:** Create, edit, and manage food bundles using Quick Add inventory selection.
- **Order Management:** View order details and update delivery statuses.
- **Student Directory:** Manage registered users and their subscriptions.
- **Delivery Scheduling:** Configure and manage delivery time slots.
- **Promo Codes:** Generate and manage discount codes.

### For Drivers
- **Driver Dashboard:** A mobile-optimized interface to claim, manage, and complete assigned deliveries efficiently.

## 🏗 Architecture

Food Bundle is built on a modern **Serverless (Backend-as-a-Service)** architecture, eliminating the need for a traditional continuous backend server (like Node.js or Django).

- **Frontend:** A smart React application that handles UI, routing, and direct secure communication with the database.
- **Database & Security:** Supabase PostgreSQL acts as both the data layer and the security layer. Using **Row Level Security (RLS)**, the database itself verifies user sessions (Supabase Auth) and enforces data access rules (e.g., preventing students from seeing admin data).
- **Backend Logic:** For tasks that cannot be done securely on the frontend (like processing Paystack webhooks or sending Resend emails), the system uses **Supabase Edge Functions**. These serverless functions spin up instantly, execute the required backend code securely, and shut down, ensuring infinite scalability and low costs.

## 🛠 Tech Stack

- **Frontend Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS & PostCSS
- **Icons:** Lucide React
- **Backend & Database:** Supabase (PostgreSQL, Auth, Storage)
- **PWA Support:** `vite-plugin-pwa` & Workbox
- **Analytics:** Vercel Analytics
- **SEO & Meta Tags:** React Helmet Async

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn
- A [Supabase](https://supabase.com) account

### Installation

1. **Clone the repository (if applicable) or navigate to the project directory:**
   ```bash
   cd "food bundle"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root of your project based on the required environment variables (check `.env.example` if available, or ask your administrator). You will typically need:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup:**
   Push the database schema to your Supabase project:
   ```bash
   npm run db:push
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## ⚡ Supabase Edge Functions

The project utilizes several Supabase Edge Functions (e.g., `paystack-payment`, `send-contact-email`, `send-push`, `send-sms`).

### Local Development
To run the edge functions locally during development:
```bash
npx supabase functions serve
```

### Deployment
To deploy all edge functions to your Supabase project:
```bash
npx supabase functions deploy
```
Alternatively, deploy a specific function:
```bash
npx supabase functions deploy function-name
```

**Note:** Ensure you have configured any required environment variables for your edge functions in your Supabase project settings.

## 📂 Project Structure

```
src/
├── components/   # Reusable UI components (Navbar, Footer, Layouts, etc.)
├── contexts/     # React Context providers (AuthContext)
├── lib/          # Utility functions, Supabase client, and custom routing
├── pages/        # Application pages grouped by role/feature
│   ├── account/  # User profile management pages
│   ├── admin/    # Administrator dashboard and management pages
│   ├── auth/     # Authentication pages (Login, Register, Password Reset)
│   ├── dashboard/# Student dashboard (Overview, Tracking, Subscriptions)
│   ├── driver/   # Delivery driver interface
│   ├── payment/  # Checkout and payment processing pages
│   ├── public/   # Public-facing informational pages (Home, About, FAQ)
│   └── support/  # Help center and ticketing system
├── App.tsx       # Main application routing and configuration
├── main.tsx      # Application entry point
└── index.css     # Global CSS and Tailwind directives
```

## 📜 Scripts

- `npm run dev`: Starts the local development server.
- `npm run build`: Builds the app for production.
- `npm run preview`: Locally previews the production build.
- `npm run lint`: Runs ESLint to check for code quality issues.
- `npm run typecheck`: Runs TypeScript type checking.
- `npm run db:push`: Pushes local Supabase database migrations to the remote database.

## 📱 Progressive Web App (PWA)

This project is configured as a PWA, allowing users to install it on their home screens for a native-like experience. The configuration can be found in `vite.config.ts`, and the service worker is generated automatically during the build process.

## 🤝 Contributing

When contributing to this project, please ensure you follow the existing code style, utilize Tailwind CSS for styling, and ensure any new interactive elements are fully responsive.


1. The Frontend (React/Vite)
Your React application acts as the face of the platform. Because of modern tools, your frontend is smart enough to talk directly and securely to your database without needing a traditional middleman server.

2. The Database & Security (Supabase PostgreSQL)
Supabase provides your database, but it also acts as a security guard. Instead of a backend server verifying permissions, you use Row Level Security (RLS). This means the database itself knows who is logged in (via Supabase Auth) and automatically blocks students from seeing admin data, or drivers from seeing other drivers' orders.

3. The Backend (Supabase Edge Functions)
You don't have a traditional server running 24/7, but you do have backend code! This is what your supabase/functions/ directory is. These are called Edge Functions. Whenever your app needs to do something that cannot be done securely on the frontend (like processing a Paystack Webhook, sending an email via Resend, or sending an SMS), an Edge Function spins up instantly on Supabase's servers, runs your backend code, and shuts down.

Why is this better?
Cost: You aren't paying for a backend server to sit idle at 3:00 AM when no one is ordering food. You only pay for the exact milliseconds your Edge Functions run.
Speed: Supabase deploys your Edge Functions globally, so they run incredibly fast.
Maintenance: You don't have to worry about a backend server crashing or needing software updates.
So, while it might feel like just a "frontend with a DB", Supabase is actually doing all the heavy lifting of a powerful backend behind the scenes!