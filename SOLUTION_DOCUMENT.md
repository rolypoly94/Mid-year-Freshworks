# Solution Document: Mid-Year Performance Feedback Portal (Fresh Performance Impact)

## 1. Executive Summary
The **Mid-Year Performance Feedback Portal** is a secure, scalable, and data-driven application designed to streamline the performance review process at Freshworks. It provides a centralized platform for Managers, HRBPs, and Administrators to manage, track, and analyze employee performance feedback while ensuring data integrity and role-based security.

## 2. Architecture Overview
The application follows a modern full-stack architecture optimized for real-time updates and secure data handling.

### 2.1 Frontend
- **Framework:** React 19 with TypeScript for robust type safety.
- **Styling:** Tailwind CSS 4.0 for a modern, responsive, and utility-first UI.
- **Animations:** Motion (formerly Framer Motion) for smooth transitions and interactive elements.
- **Icons:** Lucide-React for a consistent and professional iconography.
- **Charts:** Recharts for high-performance data visualization and analytics.

### 2.2 Backend & Infrastructure
- **Server:** Node.js with Express, serving as the application host and API layer.
- **Database:** Google Cloud Firestore (NoSQL) for real-time data synchronization and flexible schema management.
- **Authentication:** Firebase Authentication (Google OAuth) restricted to `@freshworks.com` domains.
- **Build Tool:** Vite for lightning-fast development and optimized production builds.

## 3. Key Features

### 3.1 Role-Based Access Control (RBAC)
The system identifies users based on their authenticated email and assigns one of four roles:
1.  **Admin (TM Space):** Global oversight, bulk data management (Excel import), and organizational analytics.
2.  **HRBP:** Visibility into specific organizational units (Org View) and performance distribution tracking.
3.  **Manager:** Direct report management, feedback drafting, and submission.
4.  **Employee:** Personal performance dashboard and feedback acknowledgement.

### 3.2 Performance Review Workflow
- **Drafting:** Managers can save progress as drafts before final submission.
- **Validation:** Real-time validation ensures all required fields (Wins, Growth Areas, Ratings) are completed.
- **Acknowledgement:** Employees are notified when feedback is released and can formally acknowledge it within the portal.

### 3.3 Data Management & Analytics
- **Excel Integration:** Bulk import of employee records and export of comprehensive performance reports using the `xlsx` library.
- **Bell Curve Analysis:** Automated comparison of actual performance ratings against organizational guidelines.
- **Demographic Insights:** Visual breakdowns by department, location, and gender diversity.

## 4. Technical Specifications

### 4.1 Data Model (Firestore)
The primary entity is the `Employee` document, which includes:
- **Profile Data:** Name, ID, Title, Grade, Location, Tenure.
- **Org Metadata:** Manager Email, HRBP Email, Cost Center.
- **Performance Data:** 2024/2025 Ratings, Compa-Ratio.
- **Feedback Object:** `MidYearCheckin` containing text feedback and trending ratings.

### 4.2 Security Model
Security is enforced at the database level using **Firestore Security Rules**:
- **Domain Restriction:** Only `@freshworks.com` emails can access the system.
- **Ownership Logic:** Employees can only read their own documents.
- **Manager Logic:** Managers can only read/write documents where they are listed as the `manager_email`.
- **Admin Override:** Specific admin accounts have global CRUD permissions.
- **Validation:** Rules strictly enforce data types and enum values (e.g., specific rating categories).

### 4.3 Data Exchange & Synchronization
To ensure Workday remains the "System of Record," the application supports two synchronization paths:
1.  **Workday REST API (Primary):** The application is architected to connect via Workday Web Services (REST). This allows for:
    -   **Inbound:** Fetching real-time organizational hierarchies and employee metadata.
    -   **Outbound:** Writing validated feedback and ratings directly to the Workday Performance module.
2.  **EIB (Enterprise Interface Builder) Fallback:** For rapid deployment and limited testing windows, the portal generates pre-formatted CSV/Excel files ready for bulk-loading into Workday via standard EIB templates.

### 4.4 Dependencies
- `firebase`: Core SDK for Auth and Firestore.
- `recharts`: Data visualization.
- `xlsx`: Spreadsheet processing.
- `motion`: UI animations.
- `express`: Server-side hosting.

## 5. Deployment & Setup
The application is containerized and deployed on **Google Cloud Run** in the **Asia-East1 (Taiwan)** region, ensuring high availability, automatic scaling, and secure data handling.

### 5.1 Security & Identity Integration
- **Authentication:** Google OAuth restricted to the `@freshworks.com` domain.
- **Service Security:** Communication with Workday APIs utilizes scoped Integration System Users (ISU) with OAuth 2.0.
- **Data Encryption:** All data is encrypted at rest in Firestore and in transit via TLS 1.3.

### 5.2 Environment Configuration
Required environment variables (defined in `.env.example`):
- `GEMINI_API_KEY`: For future AI-assisted feedback generation.
- `FIREBASE_CONFIG`: Project-specific credentials.

### 5.2 Build Process
1.  `npm install`: Install dependencies.
2.  `npm run build`: Compile frontend assets.
3.  `npm start`: Launch the Express server.

## 6. User Experience & Frictionless Design
Unlike traditional ERP systems (e.g., Workday) which are often perceived as cumbersome due to their multi-module complexity, this portal is a **"System of Action"** designed with a "Click-to-Do" philosophy:
- **Zero-Learning Curve:** The interface uses familiar consumer-grade design patterns, requiring no formal training for managers.
- **Single-Purpose Focus:** By stripping away non-essential HR functions, the time-to-completion for a performance check-in is reduced by an estimated 60-70% compared to legacy systems.
- **Instant Feedback Loops:** Real-time visual indicators (Bell Curve, Progress Bars) provide immediate gratification and organizational awareness for the TM team.

---
*Document Version: 1.1.0*  
*Date: April 13, 2026*  
*Prepared for: Freshworks Internal Team*
