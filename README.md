# Simple Planner - Hello World Electron App

A minimal Electron application to get you started with desktop app development using web technologies.

## What is Electron?

Electron lets you build desktop applications using HTML, CSS, and JavaScript. It combines the Chromium rendering engine and the Node.js runtime, allowing you to create cross-platform desktop apps with web technologies.

## Project Structure

```
simple-planner/
├── package.json     # Project configuration and dependencies
├── main.js          # Main Electron process (backend)
├── index.html       # App's user interface (frontend)
└── README.md        # This file
```

## Key Files Explained

### `main.js` - The Main Process
- Creates and manages application windows
- Handles app lifecycle events (startup, quit, etc.)
- Acts as the "backend" of your Electron app

### `index.html` - The Renderer Process
- Contains your app's user interface
- Runs in a Chromium browser window
- Acts as the "frontend" of your Electron app

### `package.json`
- Defines app metadata and dependencies
- Contains the `start` script to run your app
- Points to `main.js` as the entry point

## How to Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the app:
   ```bash
   npm start
   ```

## Next Steps

Now that you have a working Electron app, you can:
- Modify `index.html` to change the user interface
- Add CSS for styling
- Add JavaScript for interactive functionality
- Explore Electron's APIs for native desktop features