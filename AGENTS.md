# Agent Commands

## Running the Application Locally

### Start Backend (NestJS API)
```bash
cd backend && npm run start:dev
```
- Runs on http://localhost:3001 (or $HOST:$PORT from .env)
- Swagger docs available at http://localhost:3001/docs

### Start Frontend (Next.js)
```bash
cd signalos && HOST=0.0.0.0 npm run dev
```
- Runs on http://localhost:3000 by default
- Use `HOST=0.0.0.0` to make it accessible from other devices on the local network

## Environment Setup

### Backend (.env)
```
NODE_ENV=development
PORT=3001
HOST=0.0.0.0
JWT_SECRET=dev-secret-key-change-in-production
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

## Debugging Access

Both servers bind to `0.0.0.0` by default, allowing access from other devices on the local network:
- Find your IP: `ip addr show` or `hostname -I`
- Access frontend at `http://<YOUR_IP>:3000`
- Access backend API at `http://<YOUR_IP>:3001/api/v1`