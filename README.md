# BloomForge_AI

A Retrieval-Augmented Generative AI Framework for Automated Question Paper Generation Using Bloom's Taxonomy and Syllabus Coverage Analysis.

## Overview
BloomForge_AI is a Vite + React web application that uses Supabase for authentication and a backend workflow (including Supabase Functions) to generate question papers.

## Prerequisites
- Node.js (LTS recommended)
- npm
- A Supabase project

## Setup
1. Install dependencies
   ```bash
   npm install
   ```

2. Configure Supabase environment variables
   - Create a file named **`.env`** in the project root (`BloomForge_AI/.env`).
   - Add the following variables (required by `src/app/lib/supabase.ts`):
     ```bash
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key
     ```

   Notes:
   - The app will fail to start if either variable is missing.
   - `.env` is already present in `.gitignore`, so secrets won’t be committed.

## Start the project
Run the development server:
```bash
npm run dev
```
Then open:
- http://localhost:5173/

## Login
After the app loads, sign in using:
- **Email:** `professor@university.edu`
- **Password:** `password`

## Troubleshooting
- If you see an error like:
  - `Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY`
  - Verify that your `.env` file exists in `BloomForge_AI/` and that both variables are set correctly.

