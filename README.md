# Harold - Fitness Tracking App

Full-stack fitness tracker with workout logging, progressive overload AI generation, and nutrition tracking.

## Tech Stack
- **Frontend:** React + TypeScript + Tailwind CSS + Vite
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT + bcrypt
- **AI:** Anthropic Claude API for progressive overload generation

## Local Setup

1. Copy and configure environment variables:
   ```
   cp .env.example .env
   ```
   Fill in your `ANTHROPIC_API_KEY` if you want AI week generation.

2. Start PostgreSQL:
   ```
   docker-compose up -d
   ```

3. Install server dependencies and run migrations:
   ```
   cd server
   npm install
   npx prisma migrate dev --name init
   npx prisma db seed
   npm run dev
   ```

4. In a second terminal, start the frontend:
   ```
   cd client
   npm install
   npm run dev
   ```

5. Open http://localhost:5173

6. Login with the demo account:
   - Email: `demo@ironlog.com`
   - Password: `demo1234`

## Features
- User registration and login
- Workout tracker with week/day/exercise/set management
- Inline editing for reps and weights
- Set feedback field for qualitative notes (used by AI for smarter progression)
- AI-powered next week generation with progressive overload
- Nutrition tracker with daily meal logging
- Macro targets with progress bars
- Dashboard with workout streak counter

## Deploying to Render + AWS RDS

1. **Push the project to a GitHub repository**

2. **In AWS RDS:**
   - Make sure your PostgreSQL instance is publicly accessible
     OR add Render's IP ranges to your RDS security group inbound rules
   - Note your RDS endpoint, port (5432), database name, username, password
   - Your DATABASE_URL will be:
     ```
     postgresql://USERNAME:PASSWORD@RDS-ENDPOINT:5432/DBNAME?sslmode=require
     ```

3. **Deploy the API on Render:**
   - New > Web Service > connect your GitHub repo
   - Root directory: `server`
   - Build command: `npm install && npm run build && npx prisma generate && npx prisma migrate deploy`
   - Start command: `npm start`
   - Add environment variables:
     - `DATABASE_URL` = your AWS RDS connection string (with `?sslmode=require`)
     - `JWT_SECRET` = any long random string
     - `ANTHROPIC_API_KEY` = your key from console.anthropic.com
     - `NODE_ENV` = `production`
     - `CLIENT_URL` = `https://harold-client.onrender.com` (set after frontend is deployed)
   - Deploy and note the API URL (e.g. `https://harold-api.onrender.com`)

4. **Deploy the frontend on Render:**
   - New > Static Site > connect the same GitHub repo
   - Root directory: `client`
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
   - Add environment variable:
     - `VITE_API_URL` = `https://harold-api.onrender.com/api`
   - Deploy

5. **Go back to the harold-api service** on Render and update `CLIENT_URL`
   to the frontend URL from step 4, then redeploy.

6. **Seed the database (one time only):**
   - In Render dashboard > harold-api > Shell
   - Run: `npx prisma db seed`

7. Visit your frontend URL and log in with `demo@ironlog.com` / `demo1234`
