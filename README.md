# Git-Hired

Git-Hired is a full-stack application that helps recruiters and hiring managers analyze GitHub profiles and match candidates to job requirements using advanced analytics and AI. It provides deep insights into candidates' coding skills, activity, code quality, and project documentation, making technical hiring more data-driven and efficient.

Check out our demo video [here](https://youtu.be/X81xl0mgMdI).

---

## Features

- **GitHub Profile Analysis**: Deeply analyzes public GitHub profiles for skills, activity, code quality, and documentation.
- **AI-Powered Matching**: Uses Gemini AI to match candidates to job descriptions based on skills, repositories, and code quality.
- **Resume Upload & Storage**: Securely uploads and stores candidate resumes using MongoDB GridFS.
- **Comprehensive Metrics**: Calculates activity scores, code proficiency, and README/documentation quality.
- **RESTful API**: Exposes endpoints for frontend integration and automation.
- **Modern Frontend**: Built with Next.js and TypeScript for a responsive, user-friendly experience.

---

## Architecture

```
frontend/ (Next.js, TypeScript, React)
  ├─ app/           # Main app pages and layouts
  ├─ components/    # UI and feature components
  ├─ hooks/         # Custom React hooks
  ├─ lib/           # Utility libraries (analyzers, comparators)
  └─ api/           # API route handlers

backend/ (Flask, Python)
  ├─ app.py         # Main Flask app and API endpoints
  ├─ analyzer.py    # Code quality and proficiency analysis
  ├─ requirements.txt
  └─ ...
```

- **Database**: MongoDB (with GridFS for file storage)
- **AI Integration**: Google Gemini API for advanced analysis

---

## Setup Instructions

### Prerequisites
- Node.js (v18+ recommended)
- Python 3.9+
- MongoDB instance (local or cloud)
- GitHub API Token (for higher rate limits)
- Google Gemini API Key (for AI features)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/git-hired.git
cd git-hired
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables (create a .env file)
MONGODB_URI=your_mongodb_uri
GITHUB_TOKEN=your_github_token
GEMINI_API_KEY=your_gemini_api_key

# Run the Flask server
python app.py
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install  # or pnpm install

# Run the Next.js app
npm run dev
```

---

## API Endpoints (Backend)

- `POST   /find-matching-users` — Find GitHub users matching required skills and languages
- `GET    /get-info/<username>` — Get summary info for a GitHub user
- `GET    /deep-search/<username>` — Deep analysis of a GitHub profile
- `GET    /deep-search/<username>/summary` — Fast summary analysis
- `POST   /match-candidate/<username>` — Match a candidate to a job (rule-based)
- `POST   /match-candidate-ai/<username>` — AI-powered candidate-job matching
- `GET    /activity-score/<username>` — Activity and growth scoring
- `GET    /readme-analysis/<username>` — AI-powered README quality analysis
- `GET    /code-proficiency/<username>` — Code proficiency scoring
- `GET    /code-quality/<username>` — Fast code quality analysis
- `POST   /api/candidates` — Create a candidate (with resume upload)
- `GET    /api/candidates?jobId=...` — List candidates for a job
- `GET    /api/resumes/<candidate_id>` — Download candidate resume

---

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Python, Flask, MongoDB, GridFS
- **AI/ML**: Google Gemini API
- **Other**: GitHub API, Docker (optional for deployment)

---

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request


## Acknowledgements
- [Flask](https://flask.palletsprojects.com/)
- [Next.js](https://nextjs.org/)
- [Google Gemini](https://ai.google.dev/)
- [MongoDB](https://www.mongodb.com/)
- [GitHub API](https://docs.github.com/en/rest)
