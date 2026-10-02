# 🚀 GeeksforGeeks SRMIST Core Team Portal

A modern, high-performance internal management and collaboration portal built exclusively for the **GeeksforGeeks Student Chapter at SRM Institute of Science and Technology (SRMIST)**.

Designed with a custom **Neo-Brutalism / Neo-Flat** UI architecture, this portal streamlines member onboarding, role hierarchy tracking, timetable coordination, profile management, and secure account management.

---

## ✨ Key Features

### 🎨 Neo-Flat / Neo-Brutalist UI

- Modern, responsive, and theme-adaptive interface.
- Tactile soft-shadow containers.
- Dynamic status indicators.
- Clean and consistent typography.
- Built using **Tailwind CSS**.
- Fully responsive across desktop, tablet, and mobile devices.

### 🛡️ Secure Authentication & Access Control

- Role-based permissions for different chapter positions:
  - `President`
  - `Secretary`
  - `Joint Secretary`
  - `Domain Director`
  - `Associate Lead`
  - `Member`
- Administrative account approval workflow.
- New registrations remain in a **Pending** state until approved by authorized executives.
- Protected routes and role-aware access control.

### 🔐 Identity-Verified Password Recovery

- Secure password recovery workflow.
- Designed to work around fragile institutional SMTP limitations.
- Uses backend-validated identity parameters established during member onboarding.
- Prevents unauthorized password-reset attempts through identity verification.

### 📊 Comprehensive Profile & Academic Hub

The portal maintains structured member information including:

- Full name
- SRM email address
- SRM registration number
- Batch
- Department
- Phone number
- Faculty Advisor information
- Personal email
- LinkedIn profile
- GitHub profile
- Instagram profile
- Chapter role
- Domain
- Account status
- Profile avatar

### 📅 Timetable Free-Slot Matrix

Interactive timetable management system for coordinating chapter activities.

- Supports **Day Orders 1–5**.
- Members can specify their available/free periods.
- Provides a centralized availability matrix.
- Helps optimize:
  - Chapter meetings
  - Domain meetings
  - Events
  - Workshops
  - Task allocation

### 👑 Dynamic Chapter Hierarchy

- Automatically represents the chapter's organizational hierarchy.
- Displays reporting structures based on:
  - Roles
  - Domains
  - Leadership positions
- Helps members understand the chapter's chain of command.

---

# 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js** | Application framework |
| **React** | UI development |
| **Tailwind CSS** | Styling and responsive design |
| **Supabase** | Backend, database, authentication and storage |
| **PostgreSQL** | Relational database |
| **Row Level Security (RLS)** | Database-level access control |
| **Lucide React** | Icon library |
| **Vercel** | Deployment platform |

### Core Technologies

- **Framework:** [Next.js](https://nextjs.org/) — App Router
- **Frontend:** React
- **Styling:** Tailwind CSS + Custom Neo-Flat CSS Utilities
- **Backend & Database:** [Supabase](https://supabase.com/)
- **Database:** PostgreSQL
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage
- **Icons:** [Lucide React](https://lucide.dev/)
- **Deployment:** [Vercel](https://vercel.com/)

---

# 🗄️ Database Architecture

The application is built around three core relational Supabase tables.

## 1. `profiles`

Stores general member profile and chapter-related information.

Typical fields include:

- Full name
- SRM email
- Registration number
- Department
- Batch
- Role
- Domain
- Account status
- Avatar information
- Social profile links

---

## 2. `profile_private`

Stores sensitive member information that should not be exposed through the public profile layer.

Includes information such as:

- Phone number
- Faculty Advisor information
- Personal email
- Identity verification information
- `aadhaar_last4`

> ⚠️ Sensitive information should always be protected using appropriate Supabase Row Level Security (RLS) policies and should never be exposed to unauthorized users.

---

## 3. `timetable_slots`

Stores member timetable availability.

The table maintains free-slot information mapped against:

- Day Order 1
- Day Order 2
- Day Order 3
- Day Order 4
- Day Order 5

This enables the portal to determine suitable time slots for chapter activities and meetings.

---

# 🔐 Security Architecture

The application uses multiple layers of security.

### Authentication

Authentication is handled through **Supabase Auth**.

### Authorization

Access permissions are controlled through:

- User roles
- Supabase Row Level Security
- Protected application routes
- Backend validation

# 📜 License

This project is proprietary software developed for the:

**GeeksforGeeks SRMIST Student Chapter**

All rights reserved.

Unauthorized copying, distribution, modification, or commercial use of this software is prohibited without prior permission.

---

# ❤️ Built For

<div align="center">

### GeeksforGeeks × SRMIST

**GeeksforGeeks Student Chapter**  
**SRM Institute of Science and Technology**

🚀 Learn • Build • Collaborate • Grow

</div>