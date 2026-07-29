# BloomForge_AI

BloomForge_AI is a modern web-based platform for generating question papers and assessment materials using AI, syllabus analysis, and Bloom's Taxonomy. The system combines a React frontend, Supabase backend services, and Python-based document processing to create an intelligent academic workflow.

## Project Overview
BloomForge_AI helps educators and academic institutions:
- upload and manage syllabus content
- analyze syllabus coverage and topic distribution
- generate AI-powered questions and answer keys
- build question papers with structured academic quality
- export results in PDF-friendly formats

The application follows a Retrieval-Augmented Generation (RAG) inspired workflow where syllabus content is processed, indexed, and used to generate relevant educational outputs.

## Tech Stack
### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Material UI
- Radix UI components
- React Router
- Recharts, Framer Motion, Sonner

### Backend / Services
- Supabase Auth
- Supabase Edge Functions
- Python for document and syllabus processing

### AI / Document Processing
- Google Gemini / GenAI integration
- pdfplumber
- pdfjs-dist
- papaparse

## Libraries to Install
### 1) Frontend dependencies
From the project root, install all Node.js dependencies:

```bash
npm install
```

This installs libraries such as:
- React, React DOM
- Vite and plugin-react
- Tailwind CSS
- Material UI and Emotion
- Radix UI
- Supabase JS SDK
- React Router
- Recharts, Motion, Sonner
- html2pdf.js, pdfjs-dist, papaparse

### 2) Python dependencies
If you plan to run the Python reader or syllabus processing scripts, install Python packages:

```bash
pip install -r requirement.txt
```

Required Python libraries include:
- pdfplumber
- pydantic
- google-genai
- pdfjs-dist
- supabase

> Make sure Python 3.9+ is installed on your system.

## Prerequisites
Before running the project, make sure you have:
- Node.js (LTS recommended)
- npm
- Python 3.9 or newer
- A Supabase project

## Environment Setup
Create a file named `.env` in the project root and add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key
```

These values are required for authentication and backend connectivity.

## How to Start the Project
### 1) Install dependencies
```bash
npm install
pip install -r requirement.txt
```

### 2) Configure environment variables
Create the `.env` file as described above.

### 3) Run the development server
```bash
npm run dev
```

Then open the local app in your browser:
- http://localhost:5173/

## Project Workflow
1. User logs in through the authentication system.
2. Syllabus or academic documents are uploaded and managed.
3. Python-based processing extracts and prepares content from PDFs.
4. Supabase functions help generate embeddings and support AI-driven question creation.
5. The UI displays analytics, question banks, answer keys, and generated papers.

## Project Structure
- [src](src) - frontend source code
- [src/app/components/pages](src/app/components/pages) - main application pages
- [src/app/lib](src/app/lib) - auth and Supabase configuration
- [supabase/functions](supabase/functions) - backend edge functions
- [reader](reader) - Python scripts for document processing

## Development Notes
- The frontend is built with Vite and React.
- The app uses Supabase for authentication and backend services.
- AI features are powered through server-side functions and Python processing scripts.
- For production builds, run:

```bash
npm run build
```

## Troubleshooting
If the app shows an error related to missing Supabase configuration, verify that:
- the `.env` file exists in the project root
- both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correctly set

## License
This project is intended for educational and academic use.

