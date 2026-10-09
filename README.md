# 📚 Sharaga Dairy

> A modern, intuitive web application designed for students and academic groups to manage class schedules, homework, and group updates in one place.

[![Next.js](https://img.shields.io/badge/Next.js-14%2B-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Overview

Sharaga Dairy simplifies academic routine tracking. Instead of relying on messy chat pinned messages or spreadsheets, it provides a centralized platform for academic group members to keep track of their daily timetable, deadlines, homework assignments, and announcements.

## ✨ Key Features

- Dynamic Timetable: Clean view of daily and weekly classes with room numbers and teacher details.
- Task & Homework Tracking: Add, organize, and check off group assignments and project deadlines.
- Group-Oriented: Tailored for collective use within university groups and streams.
- Responsive UI: Fully responsive interface built with Tailwind CSS, optimized for mobile phones and desktops.
- Reliable Data Storage: Persistent and structured database schema powered by PostgreSQL and Prisma ORM.

---

## 🛠️ Tech Stack

- Frontend: Next.js (React), Tailwind CSS
- Backend: Next.js API Routes / Server Actions
- Database & ORM: PostgreSQL, Prisma ORM
- Deployment: Vercel / Cloud Hosting

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- Node.js (v18.x or newer)
- npm / pnpm / yarn
- PostgreSQL instance (local or hosted)

### Installation

1. Clone the repository:
git clone https://github.com/andriyco13/sharagadairy.git
cd sharagadairy

2. Install dependencies:
npm install

3. Configure environment variables:
Create a .env file in the root directory and add your connection string:
DATABASE_URL="postgresql://user:password@localhost:5432/sharagadairy?schema=public"

4. Run database migrations:
npx prisma db push

5. Start the development server:
npm run dev

Open http://localhost:3000 with your browser to see the result.

---

## 📄 License

This project is open-source and available under the MIT License.
