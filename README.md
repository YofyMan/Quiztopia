# QuizForge AI

QuizForge AI is a full-stack GenAI quiz application. Registered users can generate multiple-choice quizzes on a topic, complete them, receive scores and explanations, and manage their saved quiz history.

## Features

- User sign-up, login, logout, and session authentication
- Secure password hashing with bcrypt
- Protected dashboard available only after login
- Gemini-generated multiple-choice quizzes
- Topic, difficulty, and question-count controls
- Automatic scoring and answer review
- Quiz history stored in MongoDB
- CRUD operations:
  - Create a generated quiz
  - Read quiz history and results
  - Update a quiz title
  - Delete a quiz
- Responsive interface for desktop and mobile
- Loading, validation, API-error, and not-found states

## Technology

- Node.js
- Express.js
- EJS
- MongoDB Atlas and Mongoose
- Google Gemini API through `@google/genai`
- express-session and connect-mongo
- bcryptjs
- HTML, CSS, and client-side JavaScript

## Database schema

### User

| Field | Type | Purpose |
|---|---|---|
| username | String | User display name |
| email | String | Unique login email |
| passwordHash | String | Hashed password; plaintext passwords are never stored |
| createdAt / updatedAt | Date | Automatically generated timestamps |

### Quiz

| Field | Type | Purpose |
|---|---|---|
| user | ObjectId | Owner of the quiz |
| title | String | Editable quiz title |
| topic | String | Requested topic |
| difficulty | String | easy, medium, or hard |
| questions | Array | Question text, four choices, answer, explanation, and selected answer |
| completed | Boolean | Whether the quiz was submitted |
| score | Number | Number of correct answers |
| createdAt / updatedAt | Date | Automatically generated timestamps |

## Local setup

### 1. Install Node.js

Use Node.js 20 or newer.

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment variables

Copy `.env.example` to `.env` and fill in your values:

```env
PORT=3000
MONGODB_URI=your_mongodb_atlas_connection_string
SESSION_SECRET=a_long_random_secret
GEMINI_API_KEY=your_google_ai_studio_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Never upload `.env` to GitHub.

### 4. Run the server

Development mode:

```bash
npm run dev
```

Normal mode:

```bash
npm start
```

Open `http://localhost:3000`.

## Getting the required services

### MongoDB Atlas

1. Create a free MongoDB Atlas account and cluster.
2. Create a database user.
3. In Network Access, allow your current IP for local development.
4. For Render deployment, allow access from `0.0.0.0/0` if required by your course setup.
5. Copy the Node.js connection string into `MONGODB_URI`.

### Gemini API

1. Open Google AI Studio.
2. Create a Gemini API key.
3. Add the key to `GEMINI_API_KEY` in `.env`.
4. Do not commit or display the key publicly.

## Deployment on Render

1. Push the project to a GitHub repository.
2. In Render, create a new **Web Service** from that repository.
3. Use these settings:
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
4. Add these environment variables in Render:
   - `MONGODB_URI`
   - `SESSION_SECRET`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` with value `gemini-2.5-flash`
   - `NODE_ENV` with value `production`
5. Deploy and test signup, login, quiz generation, scoring, history, rename, and delete.

## Test account for submission

Create a normal account after deployment and give the instructor its email and password. Do not use your personal password.

Example:

```text
Email: professor-test@example.com
Password: QuizTest123!
```

## Main routes

| Method | Route | Purpose |
|---|---|---|
| GET/POST | `/signup` | Register a user |
| GET/POST | `/login` | Authenticate a user |
| POST | `/logout` | End the session |
| GET | `/dashboard` | Generate quizzes and see recent activity |
| POST | `/quizzes/generate` | Generate and save a quiz |
| GET | `/quizzes/:id` | Take an unfinished quiz |
| POST | `/quizzes/:id/submit` | Grade and save answers |
| GET | `/quizzes/:id/results` | Review a completed quiz |
| GET | `/history` | View saved quizzes |
| POST | `/quizzes/:id/title` | Rename a quiz |
| POST | `/quizzes/:id/delete` | Delete a quiz |

## Security notes

- Passwords are hashed with bcrypt before storage.
- Sessions are stored in MongoDB rather than server memory.
- Session cookies are HTTP-only and secure in production.
- Database operations are restricted to the logged-in user's own quizzes.
- Input lengths and accepted difficulty/count values are validated.
- Secrets are loaded from environment variables.

## Known limitations

- AI-generated questions may occasionally contain factual mistakes.
- This class project does not include email verification or password reset.
- The app uses server-rendered pages and simple session authentication rather than OAuth.
