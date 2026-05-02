# MyCarQR Workspace

## Overview

MyCarQR is a full-stack web application designed to simplify contact between individuals and car owners regarding parking issues, without compromising personal privacy. It allows car owners to generate smart QR codes for their vehicles. The project aims to provide a robust platform for managing vehicles, generating QR codes, handling scan alerts, and facilitating emergency communications. MyCarQR also includes features for managing accident reports, lost items, and vehicle documents, along with a comprehensive admin panel for operational oversight and user management.

## User Preferences

- **Iterative Development**: I prefer an iterative approach to development, where features are built and reviewed incrementally.
- **Clear Communication**: Please explain technical concepts and decisions in clear, concise language.
- **Detailed Explanations**: Provide detailed explanations for significant code changes or architectural decisions.
- **Ask Before Major Changes**: Consult with me before implementing any major changes to the codebase or architecture.
- **No changes to `.replit`**: The `.replit` file is system-protected. Use the `verifyAndReplaceDotReplit` callback for any modifications.
- **Object Storage**: Accident-report and lost-item photos should be stored in Replit App Storage (Google Cloud Storage), not as base64 inside the Postgres `photos` jsonb column.

## System Architecture

MyCarQR is a pnpm monorepo using TypeScript, built with Node.js 24. The application consists of two primary artifacts: a React+Vite frontend and an Express 5 API server.

**UI/UX Decisions:**
- The frontend is built with React, Vite, Tailwind v4, shadcn/ui, Wouter, and TanStack Query.
- It supports dark/light mode toggling.
- Design themes are available for QR codes, with both free and premium options.
- UI elements like public legal pages, tabbed profile settings, and admin panels are consistently designed for clarity and usability.

**Technical Implementations:**
- **API Framework**: Express 5 for backend services.
- **Database**: PostgreSQL with Drizzle ORM for data persistence.
- **Authentication**: Clerk is used for user authentication (Replit-managed via proxy).
- **Validation**: Zod is used for API schema validation.
- **API Codegen**: Orval generates API client code from an OpenAPI specification.
- **Build System**: esbuild is used for bundling the API server.
- **QR Generation**: The `qrcode` npm package is used for generating QR codes, with advanced features like Error Correction Level H and custom logo overlays.
- **Monorepo Structure**: The project is organized as a pnpm workspace with several internal packages:
    - `lib/api-spec`: OpenAPI specification and Orval configuration.
    - `lib/api-zod`: Generated Zod schemas.
    - `lib/api-client-react`: Generated React Query hooks.
    - `lib/db`: Drizzle ORM schema and database connection.
- **Object Storage**: Photos for accident reports and lost items are stored in Google Cloud Storage via Replit App Storage. The API handles signed URL generation for uploads and secure serving of objects.
- **Admin Panel**: A comprehensive admin panel with 10 tabs for managing users, vehicles, payments, sticker orders, and content (legal pages, FAQs, testimonials, support tickets). Access is restricted to `is_admin` users or an allowlist.
- **Payment Workflow**: Implements a UPI payment process with screenshot uploads, admin review, and automated premium plan activation with expiry.
- **Sticker PDF Generation**: Generates print-ready sticker PDFs (8x8 cm, 300 DPI, ECL-H) with various premium designs, incorporating dynamic QR codes and vehicle information.
- **Dynamic Content**: Legal pages, FAQs, and testimonials are stored in the database and rendered dynamically, with default content fallback.
- **Notification System**: Users can manage notification preferences.
- **Support System**: Users can create support tickets, and admins can respond.

**Feature Specifications:**
- **Core Features**: Landing page, Clerk authentication, dashboard, vehicle management (add, edit, delete, QR toggle), QR code generation, public scan page (Alert Owner, Report Accident, Found Keys), emergency help.
- **Alerts and Reports**: Scan alerts, accident reports (with photos, location), lost key returns (with finder contact, photos).
- **User Profiles**: SOS Emergency Profile (contacts, blood group, medical notes), Document reminders, Privacy mode, Safety score per vehicle.
- **Monetization**: Pricing page, premium upgrade flow, admin-configurable prices.
- **Advanced QR Features**: QR Design Studio with themes, print-ready sticker PDFs, physical sticker orders with style selection and tracking.
- **User Interaction**: Contact form, tabbed profile settings, notification preferences, help/support, testimonials.

## External Dependencies

- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Clerk (Replit-managed)
- **Object Storage**: Google Cloud Storage (via Replit App Storage)
- **Frontend Libraries**: React, Vite, Tailwind CSS, shadcn/ui, Wouter, TanStack Query
- **Validation**: Zod
- **API Codegen**: Orval
- **QR Code Generation**: `qrcode` npm package
- **Markdown Rendering**: `react-markdown`