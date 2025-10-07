/**
 * @fileoverview Room manager module for handling game rooms and player connections.
 * Manages room creation, player joins/leaves, and Socket.IO event handling.
 */

import { PrismaClient } from "@prisma/client";
import { Logger } from "winston";
import express from "express";
import { Server } from "socket.io";

/**
 * Generates a random 6-character room code using alphanumeric characters (excluding easily confused characters).
 * @returns {string} A 6-character room code (e.g., "ABC123")
 */
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ123456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

export default {
  /**
   * Register the routes for managing rooms
   *
   * @param {Logger} logger
   * @param {PrismaClient} prisma
   * @param {express.Express} app
   * @param {Server} io
   */
  registerRoutes: (logger, prisma, app, io) => {
    // Create a room
    app.post("/api/rooms", async (req, res) => {
      const code = generateRoomCode();

      const room = await prisma.room.create({
        data: { code },
      });

      await prisma.enigma1.create({
        data: { roomId: room.id, storyboards: [] },
      });

      await prisma.enigma2.create({
        data: { roomId: room.id, photos: [] },
      });

      await prisma.enigma3.create({
        data: { roomId: room.id, roles: [] },
      });

      await prisma.enigma4.create({
        data: { roomId: room.id, ambiance: null },
      });

      logger.info(`Room ${code} created`);
      res.json({ code });
    });

    // Check if a room exists
    app.get("/api/rooms/:code", async (req, res) => {
      const { code } = req.params;
      const room = await prisma.room.findUnique({ where: { code } });
      if (!room) return res.status(404).json({ error: "Salle inexistante" });
      res.json({ ok: true });
    });

    // Socket connection
    io.on("connection", (socket) => {
      let currentRoom = null;
      let currentPlayer = null;

      let playerTimers = {};
      let roomTimers = {};

      // A player joins a room
      socket.on(
        "room:join",
        async (
          /** @type {{ code: string, pseudo: string }} */
          { code, pseudo },
        ) => {
          logger.info(`Player ${pseudo} tries to join room ${code}`);
          let room = await prisma.room.findUnique({
            where: { code },
            include: {
              players: true,
              Enigma1: true,
              Enigma2: true,
              Enigma3: true,
              Enigma4: true,
            },
          });

          if (!room) return socket.emit("room:not-found");

          let player = room.players.find((p) => p.pseudo == pseudo);
          let reconnected = false;

          if (player !== undefined) {
            player = await prisma.player.update({
              where: {
                id: player.id,
              },
              data: {
                connected: true,
                lastSeenAt: new Date(),
              },
            });

            reconnected = true;
          } else {
            if (room.players.length >= 2) return socket.emit("room:full");

            player = await prisma.player.create({
              data: {
                pseudo,
                room: { connect: { id: room.id } },
                isHost: room.players.length == 0,
                currentScene: "main",
              },
            });
          }

          if (room.players.length == 0) {
            room = await prisma.room.update({
              where: { id: room.id },
              data: {
                hostPlayerId: player.id,
              },
              include: {
                players: true,
                Enigma1: true,
                Enigma2: true,
                Enigma3: true,
                Enigma4: true,
              },
            });
          }

          room = await prisma.room.findUnique({
            where: { code },
            include: {
              players: true,
              Enigma1: true,
              Enigma2: true,
              Enigma3: true,
              Enigma4: true,
            },
          });

          if (reconnected) {
            io.to(room.code).emit("room:reconnected", { player });
          } else {
            io.to(room.code).emit("room:new-player", { player });
          }

          currentRoom = room.code;
          currentPlayer = player.id;

          if (roomTimers[currentRoom]) {
            clearTimeout(roomTimers[currentRoom]);
            delete roomTimers[currentRoom];
          }

          if (playerTimers[currentPlayer]) {
            clearTimeout(playerTimers[currentPlayer]);
            delete playerTimers[currentPlayer];
          }

          socket.join(room.code);
          socket.emit("room:joined", { room, self: player });

          logger.info(`Player ${pseudo} joined room ${room.code}`);
        },
      );

      socket.on("room:leave", async () => {
        if (!currentPlayer) return;
        await removePlayer(currentPlayer, currentRoom);
      });

      socket.on("disconnect", async () => {
        if (!currentPlayer) return;
        if (
          (await prisma.player.count({ where: { id: currentPlayer } })) === 0
        ) {
          return;
        }

        let player = await prisma.player.update({
          where: { id: currentPlayer },
          data: { connected: false },
          include: { room: true },
        });

        io.to(player.room.code).emit("room:player-disconnected", { player });

        playerTimers[currentPlayer] = setTimeout(async () => {
          await removePlayer(currentPlayer, currentRoom);
        }, 60000);
      });

      /**
       * Removes a player from a room and handles host transfer if necessary.
       * Deletes the room after 60 seconds if it becomes empty.
       * @param {number} playerId - The ID of the player to remove
       * @param {string} roomCode - The room code
       * @returns {Promise<void>}
       */
      async function removePlayer(playerId, roomCode) {
        const player = await prisma.player.findUnique({
          where: { id: playerId },
        });
        if (!player) return;

        const room = await prisma.room.findUnique({
          where: { code: roomCode },
          include: {
            players: true,
            Enigma1: true,
            Enigma2: true,
            Enigma3: true,
            Enigma4: true,
          },
        });

        // Si le joueur qui part est host, transférer avant suppression
        if (room && room.players.length === 2 && player.isHost) {
          // Trouver le joueur restant
          const newHost = room.players.find((p) => p.id !== playerId);
          if (newHost) {
            await prisma.player.update({
              where: { id: newHost.id },
              data: { isHost: true },
            });
            await prisma.room.update({
              where: { id: room.id },
              data: { hostPlayerId: newHost.id },
            });
            io.to(room.code).emit("room:host-changed", {
              playerId: newHost.id,
            });
          }
        }

        await prisma.player.delete({ where: { id: playerId } });

        // Recharge la room après suppression
        const updatedRoom = await prisma.room.findUnique({
          where: { code: roomCode },
          include: {
            players: true,
            Enigma1: true,
            Enigma2: true,
            Enigma3: true,
            Enigma4: true,
          },
        });
        io.to(roomCode).emit("room:player-left", { player });

        // Suppression salle si vide
        if (updatedRoom && updatedRoom.players.length === 0) {
          roomTimers[roomCode] = setTimeout(async () => {
            const room = await prisma.room.findUnique({
              where: { code: roomCode },
            });
            await prisma.enigma1.delete({ where: { id: room.id } });
            await prisma.enigma2.delete({ where: { id: room.id } });
            await prisma.enigma3.delete({ where: { id: room.id } });
            await prisma.enigma4.delete({ where: { id: room.id } });
            await prisma.room.delete({ where: { id: room.id } });
          }, 60000);
        }
      }
    });
  },
};
