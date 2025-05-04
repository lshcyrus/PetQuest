# Copilot Instructions for PetQuest Project

## 1. Project Overview

*   **Description:** PetQuest is an interactive pet companion game using React for the UI and Phaser for the game engine, backed by a Node.js/Express/MongoDB API.
*   **Tech Stack:**
    *   **Frontend:** React 18, Phaser 3, Vite, JavaScript (JSX), CSS
    *   **Backend:** Node.js, Express, MongoDB (with Mongoose), JWT for auth
*   **Structure:** Monorepo-like structure with separate frontend (`PetQuest/`) and backend (`backend/`) directories.

## 2. Key Directories & Files

*   `PetQuest/`: Contains the React frontend application and Phaser game code.
    *   `src/components/`: React UI components (e.g., `LoginPage.jsx`).
    *   `src/game/`: Phaser game code (scenes, main config `main.js`, React bridge `PhaserGame.jsx`).
    *   `src/provider/globalContext.jsx`: Central React Context for global state management and API interactions.
    *   `src/utils/contextBridge.js`: Allows Phaser scenes to access the React global context.
    *   `src/App.jsx`: Main React application component, handles routing between Login and Game.
    *   `package.json`: Frontend dependencies and scripts (`npm run dev`).
    *   `.env`: Frontend environment variables (e.g., `VITE_API_URL`).
*   `backend/`: Contains the Node.js backend API.
    *   `controllers/`: Request handlers for API endpoints.
    *   `models/`: Mongoose schemas for database collections (User, Pet, Item, Quest).
    *   `routes/`: API route definitions.
    *   `middleware/`: Express middleware (e.g., `auth.js` for JWT protection, `validators.js` for input validation).
    *   `app.js`: Express application setup.
    *   `server.js`: Server startup and database connection.
    *   `package.json`: Backend dependencies and scripts (`npm start`, `npm run dev`).
    *   `.env`: Backend environment variables (DB connection, JWT secret, etc.).
*   `README.md` (Root & `PetQuest/`): Contain setup instructions and project details.

## 3. Development Workflow & Conventions

*   **Running the Project:**
    *   Backend: `cd backend && npm install && npm start` (or `npm run dev` for nodemon).
    *   Frontend: `cd PetQuest && npm install && npm run dev`.
    *   Requires a running MongoDB instance configured in `backend/.env`.
*   **State Management (Frontend):**
    *   Use the `useGlobalContext` hook within React components to access and modify global state (`userData`, `selectedPet`, etc.).
    *   Access context from Phaser scenes via the `getGlobalContext` function imported from `../utils/contextBridge`.
    *   API calls related to user/pet state should generally be managed within `globalContext.jsx`.
*   **API Interaction:**
    *   Frontend makes requests to the backend API specified by `VITE_API_URL`.
    *   Backend follows a standard MVC-like pattern: Routes -> Middleware (Auth, Validation) -> Controllers -> Models/DB.
    *   Use `async/await` for asynchronous operations.
*   **Authentication:**
    *   JWT-based. Token is stored in `localStorage` on the frontend.
    *   Backend uses the `protect` middleware (`middleware/auth.js`) for protected routes.
    *   Login/Registration logic is primarily in `PetQuest/src/components/LoginPage.jsx` (frontend) and `backend/controllers/authController.js` (backend).
*   **Error Handling:**
    *   Backend: Use `try...catch` blocks in controllers and pass errors to `next(err)` to be handled by `middleware/errorHandler.js`.
    *   Frontend: Use `try...catch` for API calls, update UI state (e.g., `setError`) to provide feedback.
*   **Database:**
    *   Use Mongoose schemas defined in `backend/models/`.
    *   Leverage Mongoose methods where appropriate (e.g., `petSchema.methods.updateStats` in `petModel.js`).
*   **Coding Style:**
    *   Follow existing patterns in the codebase (React functional components with hooks, Phaser ES6 classes for scenes, Express route/controller structure).
    *   Use clear variable and function names.
    *   Add JSDoc comments or inline comments for complex logic.
*   **Dependencies:** Install new dependencies using `npm install <package>` in the appropriate directory (`PetQuest/` or `backend/`).
*   **Validation:** Backend uses `express-validator` in `middleware/validators.js` for input validation. Ensure new routes/controllers have appropriate validation.

## 4. Important Considerations

*   **React-Phaser Integration:** Changes might require coordination between React components (`src/components/`, `src/provider/`) and Phaser scenes (`src/game/scenes/`). Use `EventBus.js` or `contextBridge.js` for communication.
*   **First Login Flow:** The `hasSelectedPet` flag in the User model and `globalContext` controls whether the user sees the `FirstLogin` scene or the `MainMenu`. Ensure changes respect this flow.
*   **Environment Variables:** Remember that sensitive information (API keys, DB URIs, JWT secrets) should be in `.env` files and not committed to Git.
*   **Absolute Paths:** When using tools that require file paths, ensure you provide absolute paths (e.g., `g:\PetQuest\backend\server.js`).

By following these instructions, you can contribute effectively to the PetQuest project while maintaining consistency with its architecture and conventions.