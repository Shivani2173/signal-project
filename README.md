# Signal: The Asymmetric Information Laboratory

**Signal** is a production-quality, real-time multiplayer web application that simulates complex game theory mechanics—specifically, Michael Spence's model of costly signaling and asymmetric information. 

Designed as an interactive behavioral economics laboratory, it places four users into a strict, server-authoritative Finite State Machine (FSM). Players must navigate a high-stakes environment of hidden assets, deception, and trust, while the system actively charts the evolution of their decision-making using D3.js.

### ⚙️ Core Architecture & Features
* **Strict Server Authority:** The Node.js backend acts as an impenetrable source of truth. Game state and hidden roles are scrubbed and sanitized before broadcasting to clients, completely preventing browser-based cheating or state injection.
* **Real-Time FSM:** A robust, server-side Finite State Machine handles automated timers, role shuffling, and phase transitions via Socket.io, ensuring all clients remain perfectly synchronized regardless of local hardware latency.
* **Evolutionary Data Visualization:** Integrates D3.js to dynamically render SVG multi-line graphs at the end of the simulation, mathematically mapping the rise and fall of "societal trust" based on player choices.
* **Modern UI/UX:** Built with Vite, React, and Tailwind CSS to create a sleek, responsive, and immersive "dark mode" laboratory environment.

### 🛠️ Tech Stack
* **Frontend:** React (Vite), D3.js, Tailwind CSS
* **Backend:** Node.js, Express.js
* **Real-Time Engine:** Socket.io
