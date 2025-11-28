# Collaborative Code Editor Platform

> A production-ready, full-stack solution for real-time collaborative coding, designed with scalability, security, and performance in mind.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Version](https://img.shields.io/badge/version-1.0.0-orange.svg)

## Table of Contents
- [About](#-about)
- [What's New](#-whats-new)
- [Standards & Security](#-standards--security)
- [Architecture](#-architecture)
- [How to Build](#-how-to-build)
- [Documentation](#-documentation)
- [Feedback and Contributions](#-feedback-and-contributions)
- [Contacts](#-contacts)

## 🚀 About

The **Collaborative Code Editor Platform** is a robust .NET-inspired, full-stack JavaScript solution designed to facilitate seamless real-time code collaboration. It adheres to high standards of interactivity and reliability, utilizing modern event-driven architectures and state-of-the-art web technologies.

This platform is engineered to solve the complex challenges of concurrent editing, providing a Google Docs-like experience for developers. Key architectural benefits include:

*   **Real-Time Synchronization**: Utilizing Socket.IO for low-latency, bi-directional communication ensures that every keystroke is synced instantly across all connected clients.
*   **Scalability**: The separation of the frontend (React/Vite) and backend (Node/Express) allows for independent scaling. Redis is employed for session management, ensuring the system can handle increasing loads efficiently.
*   **Security**: Built-in JWT authentication and sandboxed execution environments protect both the user and the server from malicious code and unauthorized access.
*   **Resilience**: MongoDB provides persistent storage for code snippets, while an offline buffer strategy ensures work is never lost, even during network interruptions.

Specifically tailored for developer interviews, education, and pair programming, this platform integrates a rich code editing experience (Monaco Editor) with a live preview engine.

## ✨ What's New

### Version 1.0.0 (Latest)

#### 🚀 Features
*   **Collaborative Cursors**: Real-time visualization of other users' cursor positions and selections, color-coded for clarity.
*   **Live Preview Sandbox**: A secure, isolated iframe environment that renders HTML/CSS/JS in real-time with a 500ms debounce for performance.
*   **Smart Conflict Resolution**: Implements a "Last-Write-Wins" strategy with timestamp validation to handle concurrent edits gracefully.
*   **Offline Support**: An intelligent buffer system that caches changes locally when offline and prompts for a merge upon reconnection.
*   **Rate Limiting**: Integrated middleware to prevent abuse and ensure service stability.

#### ⚡ Performance
*   **Redis Session Caching**: Active sessions and user states are stored in Redis for sub-millisecond access times.
*   **Optimized Debouncing**: Network traffic is minimized by debouncing edit events (200ms), reducing server load without compromising the user experience.

## 🛡 Standards & Security

This project adheres to modern security practices to ensure data integrity and user safety:

*   **JWT Authentication**: Secure, stateless authentication for both REST API endpoints and Socket.IO connections.
*   **Sandboxed Execution**: User code is executed within a strictly sandboxed `iframe` with `allow-scripts` permissions, blocking top-level navigation and external resource loading to prevent XSS attacks.
*   **Input Validation**: All incoming data is rigorously validated using `Zod` schemas to ensure type safety and data integrity.
*   **Containerization**: Fully containerized database services (MongoDB, Redis) ensure consistent and isolated execution environments.

## 🏗 Architecture

The system follows a modular client-server architecture, decoupled for flexibility and maintainability.

```mermaid
flowchart LR
  subgraph Client [Frontend (React + Vite)]
    A[Monaco Editor]
    B[Live Preview Sandbox]
    C[Cursor Manager]
  end

  subgraph Server [Backend (Node + Express)]
    API[REST API]
    SIO[Socket.IO Service]
  end

  subgraph Infrastructure
    R[(Redis\nSession Store)]
    M[(MongoDB\nPersistent Store)]
  end

  A -- "Edit Events (Debounced)" --> SIO
  C -- "Cursor Movements" --> SIO
  SIO <--> R
  SIO --> M
  API -- "Auth & CRUD" --> M
  Client <-.-> API
```

## ⚠️ Known Limitations

While the platform is production-ready for many use cases, there are specific architectural constraints to be aware of:

*   **Concurrency Limits**: The current WebSocket broadcast architecture is optimized for small-to-medium collaboration groups (approx. 10 active users per session). Larger groups may experience increased latency due to message broadcast overhead (N*N complexity).
*   **Conflict Resolution**: We utilize a "Last-Write-Wins" strategy with timestamp validation. This is robust for typical pair programming but does not offer the same character-level merge guarantees as Operational Transformation (OT) or CRDTs during high-latency, high-concurrency bursts.
*   **Mobile Support**: The editor is built on the Monaco Editor (VS Code core), which has limited support for mobile browsers and touch inputs. The platform is designed as a desktop-first experience.
*   **Client-Side Execution**: Code execution is performed within a client-side sandboxed iframe. This ensures high security and zero server-side computation costs but limits language support to web technologies (HTML/CSS/JS). Backend execution for languages like Python or Java is not currently supported.

## 🔨 How to Build

This section provides detailed instructions for setting up the project locally. The application is cross-platform and supports Windows, macOS, and Linux.

### Prerequisites
Ensure you have the following installed on your machine:
*   **Node.js** (v18.0.0 or higher)
*   **npm** (v9.0.0 or higher)
*   **Docker Desktop** (for running databases)
*   **Git**

### 🐳 Quick Start (Recommended)

1.  **Clone the Repository**
    ```bash
    git clone <repository-url>
    cd collaborative-editor
    ```

2.  **Start Infrastructure**
    Launch MongoDB and Redis containers using Docker Compose.
    ```bash
    docker-compose up -d
    ```

3.  **Install Dependencies**
    Install packages for both client and server.
    ```bash
    cd server && npm install
    cd ../client && npm install
    cd ..
    ```

4.  **Configure Environment**
    *   **Server**: Copy `server/.env.example` to `server/.env`. The defaults are configured for local development.
    *   **Client**: Copy `client/.env.example` to `client/.env`.

5.  **Run the Application**
    Open two terminal windows:
    *   **Terminal 1 (Server)**:
        ```bash
        cd server
        npm run dev
        ```
    *   **Terminal 2 (Client)**:
        ```bash
        cd client
        npm run dev
        ```

6.  **Access the App**
    Open your browser and navigate to `http://localhost:5173`.

### 🔧 Manual Setup (Detailed)

#### 1. Database Setup
If you prefer not to use Docker, you must have local instances of MongoDB (default port `27017`) and Redis (default port `6379`) running.

#### 2. Backend Configuration
Navigate to the `server` directory.
```bash
cd server
```
Create a `.env` file with the following variables:
```env
PORT=4000
MONGO_URI=mongodb://localhost:27017/collab-editor
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_secure_secret_key
CLIENT_URL=http://localhost:5173
```
Start the development server:
```bash
npm run dev
```

#### 3. Frontend Configuration
Navigate to the `client` directory.
```bash
cd client
```
Create a `.env` file:
```env
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```
Start the Vite development server:
```bash
npm run dev
```

### ⚠️ Troubleshooting

*   **Port Conflicts**: If port `4000` or `5173` is in use, update the `.env` files in both server and client to use available ports.
*   **Connection Refused**: Ensure Docker is running and the containers are healthy (`docker ps`).
*   **CORS Errors**: Verify that `CLIENT_URL` in `server/.env` matches the URL where your frontend is running.

## 📚 Documentation

For detailed API documentation, please refer to the Postman Collection included in the repository.

*   **File**: `postman_collection.json`
*   **Usage**: Import this file into Postman to explore authentication, snippet management, and user endpoints.

## 🤝 Feedback and Contributions

We welcome contributions from the community!
*   **Reporting Bugs**: Please use the GitHub Issues tab to report bugs. Include your OS, browser version, and steps to reproduce.
*   **Feature Requests**: Submit a proposal via GitHub Issues.
*   **Pull Requests**: Fork the repository, create a feature branch, and submit a PR. Please ensure all tests pass before submitting.



## � Acknowledgments

*   **[Monaco Editor](https://microsoft.github.io/monaco-editor/)** for the world-class code editing experience.
*   **[Socket.IO](https://socket.io/)** for the robust real-time communication engine.
*   **[React](https://react.dev/)** & **[Vite](https://vitejs.dev/)** for the lightning-fast frontend tooling.
*   **[Redis](https://redis.io/)** for high-performance session management.
*   The open-source community for continuous inspiration and support.

## 📞 Support

If you encounter any issues or have questions:

1.  Check the [Issues](../../issues) page.
*   **Security**: Built-in JWT authentication and sandboxed execution environments protect both the user and the server from malicious code and unauthorized access.
*   **Resilience**: MongoDB provides persistent storage for code snippets, while an offline buffer strategy ensures work is never lost, even during network interruptions.

Specifically tailored for developer interviews, education, and pair programming, this platform integrates a rich code editing experience (Monaco Editor) with a live preview engine.

## ✨ What's New

### Version 1.0.0 (Latest)

#### 🚀 Features
*   **Collaborative Cursors**: Real-time visualization of other users' cursor positions and selections, color-coded for clarity.
*   **Live Preview Sandbox**: A secure, isolated iframe environment that renders HTML/CSS/JS in real-time with a 500ms debounce for performance.
*   **Smart Conflict Resolution**: Implements a "Last-Write-Wins" strategy with timestamp validation to handle concurrent edits gracefully.
*   **Offline Support**: An intelligent buffer system that caches changes locally when offline and prompts for a merge upon reconnection.
*   **Rate Limiting**: Integrated middleware to prevent abuse and ensure service stability.

#### ⚡ Performance
*   **Redis Session Caching**: Active sessions and user states are stored in Redis for sub-millisecond access times.
*   **Optimized Debouncing**: Network traffic is minimized by debouncing edit events (200ms), reducing server load without compromising the user experience.

## 🛡 Standards & Security

This project adheres to modern security practices to ensure data integrity and user safety:

*   **JWT Authentication**: Secure, stateless authentication for both REST API endpoints and Socket.IO connections.
*   **Sandboxed Execution**: User code is executed within a strictly sandboxed `iframe` with `allow-scripts` permissions, blocking top-level navigation and external resource loading to prevent XSS attacks.
*   **Input Validation**: All incoming data is rigorously validated using `Zod` schemas to ensure type safety and data integrity.
*   **Containerization**: Fully containerized database services (MongoDB, Redis) ensure consistent and isolated execution environments.

## 🏗 Architecture

The system follows a modular client-server architecture, decoupled for flexibility and maintainability.

```mermaid
flowchart LR
  subgraph Client [Frontend (React + Vite)]
    A[Monaco Editor]
    B[Live Preview Sandbox]
    C[Cursor Manager]
  end

  subgraph Server [Backend (Node + Express)]
    API[REST API]
    SIO[Socket.IO Service]
  end

  subgraph Infrastructure
    R[(Redis\nSession Store)]
    M[(MongoDB\nPersistent Store)]
  end

  A -- "Edit Events (Debounced)" --> SIO
  C -- "Cursor Movements" --> SIO
  SIO <--> R
  SIO --> M
  API -- "Auth & CRUD" --> M
  Client <-.-> API
```

## ⚠️ Known Limitations

While the platform is production-ready for many use cases, there are specific architectural constraints to be aware of:

*   **Concurrency Limits**: The current WebSocket broadcast architecture is optimized for small-to-medium collaboration groups (approx. 10 active users per session). Larger groups may experience increased latency due to message broadcast overhead (N*N complexity).
*   **Conflict Resolution**: We utilize a "Last-Write-Wins" strategy with timestamp validation. This is robust for typical pair programming but does not offer the same character-level merge guarantees as Operational Transformation (OT) or CRDTs during high-latency, high-concurrency bursts.
*   **Mobile Support**: The editor is built on the Monaco Editor (VS Code core), which has limited support for mobile browsers and touch inputs. The platform is designed as a desktop-first experience.
*   **Client-Side Execution**: Code execution is performed within a client-side sandboxed iframe. This ensures high security and zero server-side computation costs but limits language support to web technologies (HTML/CSS/JS). Backend execution for languages like Python or Java is not currently currently supported.

## 🔨 How to Build

This section provides detailed instructions for setting up the project locally. The application is cross-platform and supports Windows, macOS, and Linux.

### Prerequisites
Ensure you have the following installed on your machine:
*   **Node.js** (v18.0.0 or higher)
*   **npm** (v9.0.0 or higher)
*   **Docker Desktop** (for running databases)
*   **Git**

### 🐳 Quick Start (Recommended)

1.  **Clone the Repository**
    ```bash
    git clone <repository-url>
    cd collaborative-editor
    ```

2.  **Start Infrastructure**
    Launch MongoDB and Redis containers using Docker Compose.
    ```bash
    docker-compose up -d
    ```

3.  **Install Dependencies**
    Install packages for both client and server.
    ```bash
    cd server && npm install
    cd ../client && npm install
    cd ..
    ```

4.  **Configure Environment**
    *   **Server**: Copy `server/.env.example` to `server/.env`. The defaults are configured for local development.
    *   **Client**: Copy `client/.env.example` to `client/.env`.

5.  **Run the Application**
    Open two terminal windows:
    *   **Terminal 1 (Server)**:
        ```bash
        cd server
        npm run dev
        ```
    *   **Terminal 2 (Client)**:
        ```bash
        cd client
        npm run dev
        ```

6.  **Access the App**
    Open your browser and navigate to `http://localhost:5173`.

### 🔧 Manual Setup (Detailed)

#### 1. Database Setup
If you prefer not to use Docker, you must have local instances of MongoDB (default port `27017`) and Redis (default port `6379`) running.

#### 2. Backend Configuration
Navigate to the `server` directory.
```bash
cd server
```
Create a `.env` file with the following variables:
```env
PORT=4000
MONGO_URI=mongodb://localhost:27017/collab-editor
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_secure_secret_key
CLIENT_URL=http://localhost:5173
```
Start the development server:
```bash
npm run dev
```

#### 3. Frontend Configuration
Navigate to the `client` directory.
```bash
cd client
```
Create a `.env` file:
```env
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```
Start the Vite development server:
```bash
npm run dev
```

### ⚠️ Troubleshooting

*   **Port Conflicts**: If port `4000` or `5173` is in use, update the `.env` files in both server and client to use available ports.
*   **Connection Refused**: Ensure Docker is running and the containers are healthy (`docker ps`).
*   **CORS Errors**: Verify that `CLIENT_URL` in `server/.env` matches the URL where your frontend is running.

## 📚 Documentation

For detailed API documentation, please refer to the Postman Collection included in the repository.

*   **File**: `postman_collection.json`
*   **Usage**: Import this file into Postman to explore authentication, snippet management, and user endpoints.

## 🤝 Feedback and Contributions

We welcome contributions from the community!
*   **Reporting Bugs**: Please use the GitHub Issues tab to report bugs. Include your OS, browser version, and steps to reproduce.
*   **Feature Requests**: Submit a proposal via GitHub Issues.
*   **Pull Requests**: Fork the repository, create a feature branch, and submit a PR. Please ensure all tests pass before submitting.



##  Acknowledgments

*   **[Monaco Editor](https://microsoft.github.io/monaco-editor/)** for the world-class code editing experience.
*   **[Socket.IO](https://socket.io/)** for the robust real-time communication engine.
*   **[React](https://react.dev/)** & **[Vite](https://vitejs.dev/)** for the lightning-fast frontend tooling.
*   **[Redis](https://redis.io/)** for high-performance session management.
*   The open-source community for continuous inspiration and support.

## 📞 Support

If you encounter any issues or have questions:

1.  Check the [Issues](../../issues) page.
2.  Create a new issue if your problem isn't already reported.
3.  Provide detailed information about your environment and the issue.

---

Made with ❤️ by [itsA-D](https://github.com/itsA-D)
