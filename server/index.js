/**
 * @fileoverview Main server entry point for the escape game application.
 * Sets up Express server, Socket.IO, Prisma database client, and routing.
 */

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { fileURLToPath } from "url";
import RoomManager from "./RoomManager.js";
import winston from "winston";

/** @type {PrismaClient} Prisma database client instance */
const prisma = new PrismaClient();

/** @type {express.Express} Express application instance */
const app = express();

/** @type {http.Server} HTTP server instance */
const server = http.createServer(app);

/** @type {Server} Socket.IO server instance for real-time communication */
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());

/** @type {winston.Logger} Winston logger instance for application logging */
const logger = winston.createLogger({
  level: "info",
  format: winston.format.cli(),
  transports: [new winston.transports.Console()],
});

// Sert les fichiers statiques du dossier public
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "../public")));

RoomManager.registerRoutes(logger, prisma, app, io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
