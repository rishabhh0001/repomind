# repomind
A GitHub Copilot for understanding entire software systems

## Project Structure
- `frontend/`: Next.js web application
- `backend/`: FastAPI backend with PostgreSQL, Redis, and LangChain

## Setup Instructions

### Backend
1. Go to the `backend` directory: `cd backend`
2. Copy the environment variables: `cp .env.example .env`
3. Fill out `.env` with your LLM API keys (e.g. Gemini, OpenAI, etc.).
4. Install dependencies: `pip install -r requirements.txt`
5. Run the server: `uvicorn app.main:app --reload`

### Frontend
1. Go to the `frontend` directory: `cd frontend`
2. Copy the environment variables: `cp .env.example .env.local` (Update `NEXT_PUBLIC_API_URL` if needed)
3. Install dependencies: `npm install`
4. Run the development server: `npm run dev`

### Docker (Optional)
You can use `docker-compose up -d` to spin up PostgreSQL and Redis.
