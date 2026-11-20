# Calcu

A lightweight calculator with a Next.js frontend, a FastAPI backend, and SQLite-backed calculation history.

## Requirements

- Node.js 18.17 or later and npm
- Python 3.9 or later

## Start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

The API runs at `http://localhost:8000`. Interactive API documentation is available at `http://localhost:8000/docs`. The SQLite database is created as `backend/calculator.db` on first startup.

## Start the frontend

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. To use a different backend URL, set `NEXT_PUBLIC_API_URL` before starting Next.js.

## Run backend tests

```powershell
cd backend
python -m unittest discover
```
