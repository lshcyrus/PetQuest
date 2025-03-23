# PetQuest

## About PetQuest

PetQuest is an interactive pet companion game built with Phaser 3 and React. Players select a virtual pet at first login, which becomes their companion throughout their journey. The game features a responsive design that works on both desktop and mobile devices.

## Technologies Used

- **Frontend**:
  - React 18 - For UI components and state management
  - Phaser 3.88 - Game engine for rendering and gameplay
  - Vite - Fast bundling and development server

- **Backend**:
  - Node.js - JavaScript runtime
  - Express - Web framework
  - MongoDB - Database for user data and game state
  - JWT - Authentication and session management

## Project Structure

### Frontend (PetQuest/)
- `src/` - Main React application code
  - `components/` - React UI components (LoginPage, etc.)
  - `game/` - Phaser game implementation
    - `scenes/` - Game scenes (FirstLogin, MainMenu, etc.)
  - `provider/` - Global state management
  - `styles/` - CSS styles
  - `utils/` - Utility functions

### Backend (backend/)
- `config/` - Configuration files
- `controllers/` - Request handlers
- `middleware/` - Express middleware (auth, validation)
- `models/` - MongoDB schema definitions
- `routes/` - API route definitions
- `utils/` - Utility functions

## Core Features

### User Authentication

The game implements a complete authentication system with login and registration capabilities:

- JSON Web Tokens (JWT) for secure authentication
- Password hashing with bcrypt
- Token-based session management
- Server-side validation

### Pet Selection System

First-time users are presented with a pet selection screen:

- Players can choose from different pet types (Fire Dragon, Ice Dragon)
- Each pet has unique stats and characteristics
- Selection is persistent and saved to the database
- The user's pet selection status is tracked via the `hasSelectedPet` field

### Global Context Management

The application uses React's Context API for global state management:

- `GlobalProvider` component maintains user data, pet selection, and game state
- State is synchronized between the frontend and backend
- API requests handle data persistence
- Error handling and fallback mechanisms are implemented

### React-Phaser Integration

The game seamlessly integrates React components with Phaser:

- `PhaserGame` component serves as a bridge between React and Phaser
- `EventBus` enables communication between the frameworks
- Global context is accessible from Phaser scenes
- Responsive design adapts to different screen sizes and orientations

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive a JWT
- `GET /api/auth/me` - Get current user information
- `GET /api/auth/logout` - Log out current user

### User Management
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/pet-selection` - Update pet selection status

## Getting Started

### Prerequisites
- Node.js (v14+)
- MongoDB instance
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd PetQuest
```

2. Install frontend dependencies
```bash
npm install
```

3. Install backend dependencies
```bash
cd backend
npm install
```

4. Configure environment variables
- Create a `.env` file in the backend directory with:
```
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
```
- Create a `.env` file in the frontend directory with:
```
VITE_API_URL=http://localhost:5000/api
```

5. Start the backend server
```bash
cd backend
npm start
```

6. Start the frontend development server
```bash
cd ../PetQuest
npm run dev
```

7. Open your browser to `http://localhost:8080` (Default)

## Implementation Details

### User Authentication Flow

1. **Registration**: 
   - User submits registration form
   - Backend validates data and creates new user in database
   - Password is hashed with bcrypt before storage
   - JWT token is generated and returned to client

2. **Login**:
   - User submits email/password
   - Backend validates credentials
   - JWT token is generated and returned to client
   - User data including `hasSelectedPet` status is included in response

3. **Session Management**:
   - Frontend stores JWT in localStorage
   - Token is included in Authorization headers for API requests
   - Backend middleware verifies token for protected routes

### First Login Experience

The first login experience is handled through a series of steps:

1. When a user logs in, the `hasSelectedPet` status is checked
2. If `hasSelectedPet` is false, the user is directed to the `FirstLogin` scene
3. The scene presents pet options with animations and statistics
4. Upon selecting a pet, the selection is saved to the user's profile in the database
5. The `hasSelectedPet` flag is set to true, preventing this scene on subsequent logins

### State Management

The application uses a central state management approach:

1. **GlobalContext**:
   - Maintains user data, pet information, and game state
   - Provides methods for updating user data
   - Handles API communication for data persistence

2. **Data Flow**:
   - User actions trigger state updates in the GlobalContext
   - React components re-render based on state changes
   - API requests are made to persist changes to the backend
   - Error handling provides fallbacks if API requests fail

### Mobile Optimization

The game is fully responsive and optimized for mobile devices:

1. **Responsive Layout**:
   - Dynamic scaling based on device screen size
   - Different layouts for portrait and landscape orientations
   - Touch-friendly UI elements with appropriate sizes

2. **Performance**:
   - Optimized asset loading for mobile connections
   - Reduced animations and effects on low-end devices
   - Efficient rendering with hardware acceleration

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
