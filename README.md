# Secure Print Hub

A secure PDF printing solution that ensures document security and print management.

## Features

- Secure PDF upload and management
- Print job queuing system
- User authentication and authorization
- Print job tracking
- Secure document handling

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS
- **Backend**: Node.js, Express
- **Database**: Redis (for queue management)
- **Deployment**: Render

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Redis (for local development)

### Local Development

#### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory with the following variables:
   ```
   PORT=3001
   NODE_ENV=development
   REDIS_URL=redis://localhost:6379
   # Add other environment variables as needed
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd secure-print-hub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the frontend directory with the following variables:
   ```
   VITE_API_URL=http://localhost:3001
   # Add other environment variables as needed
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment to Render

This project is configured for deployment on Render using the `render.yaml` file. To deploy:

1. Push your code to a GitHub repository
2. Connect your GitHub repository to Render
3. Render will automatically detect the `render.yaml` file and set up the services

### Environment Variables for Production

Make sure to set the following environment variables in your Render dashboard:

#### Backend Service
- `NODE_ENV=production`
- `PORT=10000`
- `REDIS_URL` (will be automatically set by Render)

## Project Structure

```
├── backend/             # Backend server code
│   ├── src/            # Source files
│   ├── queues/         # Print job queues
│   └── workers/        # Background workers
├── secure-print-hub/   # Frontend React application
│   ├── public/         # Static files
│   └── src/            # Source files
├── .gitignore          # Git ignore files
└── render.yaml         # Render deployment configuration
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
