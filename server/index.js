
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';
import RoomManager from './RoomManager.js';

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

// Sert les fichiers statiques du dossier public
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '../public')));

RoomManager.registerRoutes(prisma, app, io)

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
