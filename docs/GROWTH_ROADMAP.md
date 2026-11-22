# Food Bundle — Founder's Execution, Growth & Hiring Roadmap

**From Solo Founder in Kumasi (<GH₵5,000 Capital) to a Multi-Campus Ghanaian Employer**

| | |
|---|---|
| **Company** | Food Bundle |
| **Starting Profile** | Solo founder · Based in Kumasi · Under GH₵5,000 initial capital · Platform built |
| **Launch Beachhead** | KNUST & Kumasi Hostels (Main Campus, Ayeduase, Gaza, Brunei, Kotei, Bomso) |
| **Companion Document** | `docs/BUSINESS_PLAN.md` (Investor Business Plan) |
| **Date** | November 2026 |

> *This is an operational field manual. It shows you exactly what to do week by week, how to launch without buying dead inventory, when to hire every single role so wages never sink the business, and how to build Food Bundle into an institution that employs dozens and eventually hundreds of people.*

---

## 1. The Golden Rule of Starting With Under GH₵5,000

Most first-time founders think they need GH₵50,000+ to rent a shop, buy 100 bags of rice, and hire full-time riders before taking their first order. **If you do that with under GH₵5,000, you will run out of money in week one.**

You already have a massive advantage: **your software platform is built**, and it enforces **scheduled next-day/selected-day delivery** and **upfront digital payment via Paystack**. That allows you to run a **Cash-Before-Stock (Negative Working Capital) Loop**:

| Step | What Happens | Cash Position |
|---|---|---|
| **1. Lock in prices, not stock** | You visit 2–3 major wholesalers at Kejetia / Central Market / Asafo. You write down their wholesale prices and put those prices into your Admin Inventory. You buy **zero** food upfront. | GH₵0 spent on food |
| **2. Customer pays upfront** | A student or parent orders a BETA bundle (GH₵450 + GH₵10 delivery = GH₵460) on Tuesday for Thursday delivery, paying upfront via Mobile Money on Paystack. | +GH₵460 collected on Paystack |
| **3. Paystack settles T+1** | Paystack settles the GH₵460 into your bank or Mobile Money account the next morning (Wednesday). | +GH₵460 in your account |
| **4. Buy exact quantities** | On Wednesday afternoon or Thursday morning, you send your combined shopping list on WhatsApp to your wholesaler, pay ~GH₵351 at wholesale, and pick up the exact items ordered. | GH₵109 remaining |
| **5. Pack & deliver** | You pack the box at home (GH₵5 packaging), hand it to an on-call campus rider who delivers it using the Driver Dashboard & Delivery PIN (GH₵8–10 payout). | **~GH₵96 net cash profit kept** |

### How to allocate your initial <GH₵5,000
Never lock your first GH₵3,000–5,000 in slow-moving groceries. Allocate it like this:

| Budget Item | Cost (GH₵) | Purpose |
|---|---:|---|
| **1-Day Order Float** | 2,500 – 3,500 | Allows you to fulfil 7–10 urgent next-day orders before Paystack's T+1 payout hits your account. Revolves back to you every 24 hours. |
| **Packaging Starter Batch** | 350 | 50 clean, sturdy corrugated boxes or heavy-duty branded carrier bags + 100 large full-colour "Food Bundle" stickers with your website QR code & WhatsApp number. |
| **2 Demo Boxes (Content & Proof)** | 700 | Pack 1 ALPHA and 1 GAMMA box. Film 20 short TikTok/Reels/WhatsApp videos showing every item inside, the neat packaging, and a real hostel delivery. (You can still sell the items in these 2 boxes!) |
| **Flyers & Hall Stickers** | 250 | 200 high-quality A5 flyers for hostel porters' lodges, JCR noticeboards, and freshers' registration queues. |
| **Data, Calls & Market Trotro/Pragia** | 200 | Calling wholesalers, riders, and campus ambassadors during Month 1. |
| **Total Required to Launch** | **4,000 – 5,000** | **100% lean, zero dead stock.** |

---

## 2. The 6 Stages of Building Food Bundle Into a Major Employer

| Stage | Timeline | Order Volume | Team Size | Where You Operate | Primary Focus |
|---|---|---|---|---|---|
| **Stage 1** | Weeks 1–2 | 0 (Setup) | **1** (You) | Your room in Kumasi | Fix tech, lock in Kejetia wholesalers, recruit 3 on-call riders |
| **Stage 2** | Months 1–2 | 10–60 / month | **1 + 10 commission ambassadors + 3 on-call riders** | KNUST & Ayeduase / Gaza / Brunei | First 50 orders, social proof, parent WhatsApp channel |
| **Stage 3** | Months 3–6 | 80–200 / month | **3–5** (2 part-time packers, 1 lead rider, 1 part-time support) | Full Kumasi student belt | First paid employees, small store/packing room, ORC registration |
| **Stage 4** | Months 6–12 | 250–500 / month | **8–12** (Ops Coordinator, packers, riders, support) | Kumasi + VIP/STC nationwide parcels | Raise GH₵350k pre-seed with real traction; 7-day supplier credit |
| **Stage 5** | Year 2 | 500–1,000 / month | **25–40** across 3 cities | Kumasi + Accra (Legon/UPSA/ATU) + Sunyani (UENR) | City Managers, dedicated hubs, direct FMCG distributor accounts |
| **Stage 6** | Year 3+ | 1,500–3,000+ / month | **80–150+ employees** | 5+ university cities nationwide | Institutional contracts, private-label staples, career ladder |

---

## 3. Stage 1 — Weeks 1 to 2: Launch Preparation in Kumasi

Do not skip a single step here. You can complete all of Stage 1 in **14 days**.

### Step 1.1 — Switch your platform to production (Days 1–3)
1. **Paystack Live Mode:** Register/verify your Paystack Merchant account using your Ghana Card and link your Mobile Money or bank account. Replace the test secret key in Supabase Edge Functions (`PAYSTACK_SECRET_KEY`) with your **Live Secret Key**.
2. **Test a real GH₵5 order:** Create a temporary GH₵5 test bundle in `/admin/packages/new`, buy it yourself as a Guest and as a Student using Mobile Money, confirm that:
   - You receive the confirmation screen and email receipt.
   - The order appears in `/admin/orders`.
   - The pickup PIN works when you log in as a driver (`/driver/dashboard`).
3. **Set your real delivery schedule:** To keep delivery costs low when starting solo, batch deliveries into **2 or 3 fixed days per week** (e.g., **Wednesdays and Saturdays, 9:00 AM – 4:00 PM**). Configure this in `/admin/delivery`.

### Step 1.2 — The Kejetia / Central Market / Asafo Supplier Walk (Days 4–7)
Take a notebook to **Kejetia / Kumasi Central Market / Asafo Market**. For each of the 6 core categories below, visit **3 wholesale stores** (not roadside retailers):

| Category | Core Items to Price-Check (Wholesale Unit & Single Unit) |
|---|---|
| **Rice & Carbs** | 5 kg Jasmine Rice (Royal Umbrella, Lele, Milicent, K-72), Ena Pa Spaghetti, Indomie carton, Gari |
| **Canned Proteins** | Titus / Ena Pa Sardines (carton & tin), Ena Pa Mackerel, Tuna Flakes, Exeter Corned Beef, Baked Beans |
| **Cooking Essentials** | Frytol / Sunny Oil (1L & 500ml), Gino / Pomo Tomato Paste, Eggs (crate of 30) |
| **Breakfast & Flours** | Oats, Cornflakes, Tom Brown, Hausa Koko pack |
| **Milk & Beverages** | Ideal / Peak / Carnation Milk, Nido / Dano / Cowbell sachets & tins, Milo, Lipton |
| **Drinks & Juices** | Kalypo / Ceres / 1L Fruit Juice, Vita Milk |

**What you must collect from your top 2 wholesalers in each category:**
- The shop name, stall landmark, and owner's name.
- Their direct WhatsApp number and Mobile Money number.
- Agreement that you can **WhatsApp your order list 3 hours ahead**, pay via MoMo on pickup, and have an attendant pre-pack the cartons so you spend 15 minutes at the market instead of 2 hours.
- **Enter every wholesale price into `/admin/inventory`** and use the built-in **Paystack Fee Calculator** in `/admin/packages` to verify that ALPHA (GH₵500), BETA (GH₵450), and GAMMA (GH₵420) yield at least a **20–22% gross margin** over wholesale cost.

### Step 1.3 — Packaging that looks like a big company (Days 8–10)
People trust a food company by how clean and sealed the box looks when it arrives at a hostel.
- Buy 50 clean, uniform double-walled cartons (plus thick transparent wrapping film for rainy days and fragile egg crates).
- Print **A5 waterproof brand stickers** at a printing press in Asafo (`"FOOD BUNDLE — Semester Provisions Delivered · Scan to Reorder · +233 241 626 072"`).
- Every box must include a printed **Packing Slip & Quality Checklist** inside the top flap ("Packed by: ___ · Checked by: ___ · Order #___ · Delivery PIN required"). This costs GH₵0.50 per order and makes a solo operation look like an international brand.

### Step 1.4 — Recruit 3 On-Call Riders at Zero Fixed Salary (Days 11–14)
Go to **Tech Junction / Ayeduase Gate / Bomso**. Find 3 polite, well-spoken riders (motorbike with a large delivery box, or an *aboboyaa*/tricycle or taxi partner for heavy multi-box drops on Saturdays).
- Create an account for each rider and set their role to `driver` in `/admin/students`.
- Show them `/driver/dashboard` on their phone and explain the **Pickup PIN** rule: *never hand over a box without entering the student's 4-digit PIN*.
- Pay them **per completed delivery** (GH₵8 Main Campus, GH₵10 Ayeduase/Bomso, GH₵12 Kotei/Boadi) at the end of each delivery run. When you batch 5 boxes to Ayeduase in one trip, the rider earns GH₵40–50 in an hour and you get fast, reliable service with zero idle payroll.

---

## 4. Stage 2 — Months 1 to 2: Getting Your First 50 Paying Orders at KNUST

When you have under GH₵5,000, **you cannot out-spend anyone on ads—you must out-hustle and out-trust them**.

### Channel 1 — 10 Commission-Only Campus Ambassadors (Zero Upfront Cost)
Do not pay influencers upfront. Recruit **10 connected students at KNUST**:
- 2 in Main Campus Halls (Unity, Conti, Republic, Queens, Africa, Katanga)
- 4 in major off-campus hostels (Ayeduase, Brunei, Gaza, Evandy, Boadi)
- 2 Class Reps (First-Year & Second-Year big departments)
- 2 Campus Fellowship / Church Welfare leads

**How the ambassador deal works:**
1. Each ambassador registers on Food Bundle and gets their unique **Referral Code / Promo Code** (created in `/admin/promos`).
2. Their code gives their friends **GH₵10 off** their first bundle (or free campus delivery) and earns the ambassador **GH₵15–20 cash commission** paid every Saturday for every paid, delivered order.
3. Give every ambassador a 30-second unboxing video and a clean flyer to post on their **WhatsApp Status** and hostel WhatsApp groups every Tuesday and Friday evening.

### Channel 2 — The "Parent Payer" WhatsApp Strategy (Your Secret Weapon)
Students are often broke, **but parents always buy provisions at the start of the semester and at mid-semester**.
- Create a dedicated one-page image flyer:
  > **"Have a son or daughter at KNUST?"**
  > Stop worrying about whether chop money was spent on food or how they will carry heavy rice and oil from Kejetia.
  > Order an ALPHA (GH₵500), BETA (GH₵450), or GAMMA (GH₵420) Food Bundle online in 2 minutes—no account needed. Delivered straight to their hall or hostel with PIN verification.
- Ask every student customer and ambassador: *"Forward this link to your mum or dad on WhatsApp when asking for provisions."* That directly drives your **Guest Checkout** flow (`/guest-checkout`).

### Channel 3 — Relentless Visual Proof
In Ghana, online buyers fear "what I ordered vs. what I got" and scams. Overcome that by:
- Filming a 15-second video of **every single batch of boxes** being packed cleanly with branded stickers.
- Asking every happy student at the hostel gate for a 5-second photo holding their Food Bundle box (offer them 50 bonus loyalty points or a free pack of biscuits/Indomie in their next box).

---

## 5. Stage 3 — Months 3 to 6: Your First Employees (Moving From Hustle to System)

If you want to build a great company like the best in the world, **you must never hire on ego—you hire on unit-economics triggers**. Every new person must be paid out of the gross profit of orders that already exist.

Remember: each bundle earns **~GH₵98 contribution margin**.

### The Exact Hiring Trigger Table

| Hire # | Role | App Role to Assign | When to Hire (Trigger) | Pay Structure | Why This Role Frees You to Grow |
|---|---|---|---|---|---|
| **Hire #1** | **Part-Time Student Packers (×2)** | `packer` | **25+ bundles/week** (~GH₵2,450/wk gross margin) | **GH₵4 per box packed** (only works on Tuesday & Friday afternoons before delivery days) | Packing 30 boxes takes 6 hours. Handing them `/admin/orders` in Packer view lets you focus on sales & wholesale buying. |
| **Hire #2** | **Lead Campus Rider** | `driver` | **40+ bundles/week** (~GH₵3,900/wk gross margin) | Base retainer + per-drop bonus (or guaranteed minimum drops on Wed/Sat) | Ensures 100% on-time delivery and coordinates backup riders during semester-opening rush. |
| **Hire #3** | **Part-Time Customer Support & WhatsApp Closer** | `support` | **60+ bundles/week** (~GH₵5,880/wk gross margin) | Base stipend (GH₵600–800/mo) + GH₵5 bonus per closed WhatsApp/abandoned order | Answers parents immediately, follows up on pending orders in `/admin/orders` (Support view), and collects reviews. |
| **Hire #4** | **Kumasi Operations Supervisor** | `admin` | **120+ bundles/week** (~GH₵11,760/wk gross margin) | Full-time salary (GH₵2,000–2,800/mo) + KPI bonus (zero missing items, >95% on-time) | Runs daily market procurement, stock checks, packers, and riders in Kumasi so you can open Accra and raise capital. |

### Formalizing the Company in Stage 3 (Cost: ~GH₵600–1,200 paid from profits)
Once you have crossed your first 100 orders:
1. **Register the company** with the **Office of the Registrar of Companies (ORC)** in Ghana (incorporate as a Limited Liability Company so you can issue shares to investors and sign corporate contracts).
2. **Open a dedicated business bank account & Merchant MoMo account** in the company's legal name.
3. **Keep an Investor Data Room folder** on Google Drive from Day 1 containing:
   - Monthly Paystack settlement exports (proof of real revenue).
   - Wholesale purchase receipts (proof of your 22%+ gross margin).
   - Customer repeat rate & ambassador acquisition cost from your Admin Dashboard.

---

## 6. Stage 4 — Months 6 to 12: Raising the GH₵350,000 Pre-Seed & Unlocking Supplier Credit

Walking into an investor meeting with **only an idea** makes fundraising very hard.
Walking into an investor meeting saying:
> *"I started with GH₵4,500 in Kumasi. In 6 months we delivered 600+ food bundles at KNUST, generated GH₵270,000 in verified Paystack revenue at a 22% gross margin, have 4 part-time staff running on our proprietary platform, and we are raising GH₵350,000 to stock up for semester reopening and expand to Legon and UPSA."*
— puts you in the **top 1% of Ghanaian startup pitches**.

### Where to Pitch Your Business Plan (`docs/BUSINESS_PLAN.md`) in Ghana
1. **Kumasi Hive & KNUST Business Incubator (KBI):** Local mentorship, student talent pipeline, and ecosystem introductions right in Kumasi.
2. **Kosmos Innovation Center (KIC) AgriTech Challenge:** One of Ghana's strongest equity-free/seed programs for food supply-chain and agribusiness startups ($10,000–$50,000 funding).
3. **Tony Elumelu Foundation (TEF):** Annual $5,000 non-dilutive seed grant (applications open January every year).
4. **MEST Africa & Ghana Tech Lab / NEIP:** Startup pitch programs and seed investment networks in Accra and Kumasi.
5. **Strategic Angels (FMCG Distributors & Hostel Owners):** Large rice/oil/canned-food distributors in Kumasi and Accra who want a direct sales channel to 180,000 university students, or private hostel owners who want a value-added service for their residents.

### Unlocking 7- to 14-Day Supplier Credit
After buying GH₵30,000–50,000/month consistently from the same 2 wholesalers at Kejetia/Asafo for 4–6 months, show them your order growth and negotiate **7-day credit on non-perishables** (rice, oil, canned fish, milk). Once your supplier gives you 7 days to pay and your customer pays you on Day 0 via Paystack, **your growth becomes self-funding**.

---

## 7. Stage 5 & 6 — Year 2 to Year 3+: Scaling to Multi-City & Building a World-Class Employer

Great companies (like Amazon, Walmart, or dominant regional logistics firms) are built on **repeatable systems**, not heroic chaos. Because your platform already supports multiple hubs in `delivery_zones` and role-based access (`super_admin`, `admin`, `packer`, `driver`, `support`), expanding to a new university city follows a standard **30-Day City Launch Playbook**:

### The 30-Day City Launch Playbook (Accra: Legon/UPSA/ATU, then Sunyani: UENR, then Cape Coast: UCC)
1. **Hire 1 City Operations Coordinator** (a sharp recent graduate from that university who knows every hall, hostel, and market).
2. **Rent a 1-room micro-packing hub** within 10 minutes of campus (e.g., Madina for Legon/UPSA).
3. **Lock in 2 wholesale suppliers** in the local market (e.g., Madina Market / Makola in Accra).
4. **Recruit 15 campus ambassadors & 4 contracted riders** in that city.
5. **Activate the city's delivery zones** in `/admin/delivery` (already pre-seeded in your database for Legon, UPSA, ATU, and UENR!).

### How to Build a Company Where Talented People Love to Work
If your goal is to employ many people and build an admired institution:

1. **Create an Internal Career Ladder:**
   - Every great **Campus Ambassador** can become a paid **Part-Time Packer or Support Rep**.
   - Top **Packers** who show honesty and speed get promoted to **Packing Hub Supervisor** upon graduation.
   - Top **Hub Supervisors** get promoted to **City Operations Manager** when you launch a new university city (Cape Coast, Tamale, Takoradi, Winneba).
2. **Run on Clear Written Standards (SOPs):**
   - **The 4-Point Box Standard:** Every box must pass (1) Exact item count vs. receipt, (2) Expiry date >6 months away, (3) Heavy items at the bottom / eggs & fragile items cushioned on top, (4) Sealed with a Food Bundle tamper sticker.
   - **The 2-Minute Support Rule:** Every parent or student WhatsApp message during business hours gets a polite response within 2 minutes.
3. **Share Performance Rewards:**
   - Pay every packer, rider, and hub manager on time, every single week.
   - Give a monthly team bonus whenever the hub achieves **98%+ on-time delivery** and **zero missing-item complaints**.
4. **Move Up the Value Chain (Year 3+):**
   - **Direct Manufacturer Accounts:** Buy directly from Wilmar (Frytol), Nestlé (Milo/Ideal), Olam, and major rice importers to expand gross margin from 22% to 28%+.
   - **Food Bundle Private Label:** Package your own branded 5 kg perfumed rice, fortified gari, sugar, and shito using local Ghanaian processors—creating even more local jobs in processing and packaging.

---

## 8. Your First 30 Days — Printable Action Checklist

Tick these boxes in order over the next 30 days:

| Day | Task | Done? |
|---|---|---|
| **Days 1–2** | Verify Paystack Live account (Ghana Card + MoMo/Bank) and set live keys in Supabase | [ ] |
| **Day 3** | Place a live GH₵5 test order (Student + Guest), verify receipt, admin dashboard, and driver PIN | [ ] |
| **Days 4–6** | Visit Kejetia / Central Market / Asafo; record wholesale prices for 25 core items from 3 wholesalers | [ ] |
| **Day 7** | Enter all wholesale prices into `/admin/inventory` and verify ALPHA/BETA/GAMMA margins (≥20%) | [ ] |
| **Days 8–9** | Buy 50 clean cartons + print 100 branded box stickers & 200 A5 flyers in Asafo | [ ] |
| **Day 10** | Pack 2 demo bundles (ALPHA & GAMMA) and film 15 short unboxing/packing videos for TikTok & WhatsApp | [ ] |
| **Days 11–12** | Recruit 3 on-call riders around Ayeduase/Tech Junction on per-drop payout; set them up as `driver` in the app | [ ] |
| **Days 13–14** | Recruit 10 KNUST campus ambassadors (Main Campus + Ayeduase/Brunei/Gaza) and issue their promo codes in `/admin/promos` | [ ] |
| **Day 15** | **PUBLIC LAUNCH:** Ambassadors post unboxing videos + promo codes; share Parent Flyer in church/parent WhatsApp groups | [ ] |
| **Days 16–20** | Fulfil first Wednesday & Saturday batched delivery runs; film every delivery and collect student photos | [ ] |
| **Days 21–25** | Personally WhatsApp every first-week customer and parent for feedback and a referral | [ ] |
| **Days 26–30** | Review Month 1 unit economics (revenue, wholesale cost, rider payout, net profit) and double top ambassador outreach | [ ] |

