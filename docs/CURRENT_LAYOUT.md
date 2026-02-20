# Current Application Layout & Design System

## 1. Design Philosophy

**"Military-Grade Command Intelligence"**

The current application layout is centered around providing a **professional, tactical, and high-contrast environment** suitable for both day and night operations (field and command center usage).

### Core Aesthetic Pillars
*   **Deep Dark Mode**: The primary background is a deep midnight blue/black (`bg-dark-bg` / `slate-900`), minimizing eye strain and maximizing data visibility.
*   **Tactical Accents**: Use of **Emerald Green** (Success/Secure) and **Electric Blue** (Information/Active) for critical path actions and highlights.
*   **Glassmorphism**: Semi-transparent, blurred backgrounds (`backdrop-blur-md`, `bg-dark-surface/90`) on headers, footers, and cards to create depth without obstructing context.
*   **High-Legibility Typography**:
    *   **Headings**: `Outfit` (Clean, geometric sans-serif) for immediate readability.
    *   **Body**: `Inter` (Standard UI font) for dense information display.

---

## 2. Structural Layout

The application follows a standard **Full-Width Responsive Layout**:

### A. Header (Global Navigation)
*   **Position**: Sticky Top (`z-50`).
*   **Style**: Dark Glassmorphism (`bg-dark-bg/90`, `border-b border-white/10`).
*   **Components**:
    *   **Brand Logo**: "HAWKSEYE" (Left) - Bold, tracking-widest.
    *   **Primary Navigation**: Center-aligned links (`Home`, `Mission`, `Capabilities`, `Secure Comms`, `Contact`).
        *   *State*: Inactive (Gray-300), Hover/Active (White/Blue).
    *   **Account Actions**: Right-aligned User Dropdown (or Login/Register).
    *   **Mobile Menu**: Hamburger menu (Right) triggering a slide-over panel.

### B. Main Content Area (`<main>`)
*   **Style**: `relative`, `z-0`, transparent background (inherits global dark theme).
*   **Behavior**: Flexible width, centered content containers (`max-w-7xl`).

### C. Footer (Global Information)
*   **Style**: Dark Surface (`bg-dark-surface/90`, `border-t border-white/10`).
*   **Content Columns**:
    1.  **Brand Mission**: Short description of Hawkseye/EdgePlay.
    2.  **Analytics Links**: Quick access to dashboards and reports.
    3.  **Contact Info**: Email, Phone, Physical Address (Pretoria, ZA).
    4.  **Socials & CTA**: Icons and a prominent "View Analytics" button.

---

## 3. Page-Specific Layouts

### 1. Home Page (`/`)
*   **Hero Section**: Full-screen (`min-h-[600px]`) background image with dark overlay. Features "Zero-Trust Asset Intelligence" headline and primary CTA.
*   **Products Teaser**: Grid showcasing main product categories.
*   **Solutions Grid**: Highlighting software capabilities (Real-time tracking, etc.).
*   **Why Us**: Value proposition section.
*   **Testimonials**: Social proof carousel.

### 2. Mission / About (`/about`)
*   **Layout**: Single column flow.
*   **Hero**: Standard height (`h-[400px]`) with "About Hawkseye" title.
*   **Stats Grid**: 4-column layout displaying key metrics (Years, Countries, Projects).
    *   *Style*: Semi-transparent dark cards (`bg-dark-surface/50`).
*   **Mission Statement**: Two-column layout (Text Left, Image Right).
*   **Team Grid**: 3-column card layout for key personnel.
    *   *Style*: Dark cards with hover-border effects.

### 3. Capabilities / Products (`/products`)
*   **Layout**: Vertical list of product sections.
*   **Structure**: Alternating Layout (Image Left/Text Right -> Image Right/Text Left).
*   **Product Cards**: Large, detailed sections for each item (Collars, Bird Trackers).
    *   *Features Grid*: 2x2 grid of key selling points with icons.
    *   *Specifications*: 2-column list of technical specs (Weight, Battery Life).
    *   *Tags*: "Suitable For" pill tags.
    *   *CTA*: "Request a Quote" button.

### 4. Contact (`/contact`)
*   **Layout**: Split view (2/3 Form, 1/3 Info).
*   **Contact Form**: Detailed form with fields for Name, Org, Subject, Message.
    *   *Style*: Dark input fields (`bg-dark-surface`, `text-white`) with emerald focus rings.
*   **Info Sidebar**: Vertical list of contact details and office hours.

### 5. Authentication (`/login`, `/register`)
*   **Layout**: Centered card on dark background.
*   **Style**: Focused, distraction-free inputs and submission buttons.

---

## 4. Design System & CSS (Tailwind)

The project utilizes a customized Tailwind configuration (`tailwind.config.js`) to enforce consistency:

*   **Colors**:
    *   `brand`: Blue scale (50-900).
    *   `accent`: Green/Emerald for success/action.
    *   `dark`:
        *   `bg`: `#0f172a` (Slate 900 base).
        *   `surface`: `#1e293b` (Slate 800 base).
        *   `border`: `#334155` (Slate 700 base).
*   **Effects**:
    *   `glass-panel`: `backdrop-blur-md`, `bg-dark-surface/60`.
    *   `glass-card`: `backdrop-blur-lg`, `bg-white/5`.
    *   `shadow-glow`: Custom glow effect for high-tech feel.
*   **Animations**:
    *   `animate-float`: Subtle floating movement for hero elements.

---

## 5. Improvement Assessment

*   **Current Strength**: Strong, cohesive visual identity with high contrast and professional "tactical" feel.
*   **Areas for Potential Improvement**:
    *   **Dashboard Complexity**: The internal dashboard pages (not detailed here) likely need complex data visualization components (charts, heatmaps) to match the marketing site's quality.
    *   **Mobile Navigation**: Ensure the slide-over menu is fully optimized for touch targets on smaller devices.
    *   **Performance**: Large hero images should be optimized (`WebP`, lazy loading) to ensure fast load times, especially for field operators with limited bandwidth.
