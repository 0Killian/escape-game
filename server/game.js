import { PrismaClient } from "@prisma/client";
import { Server, Socket } from "socket.io";
import { Logger } from "winston";
import enigma1 from "./enigmas/enigma1.js";
import enigma2 from "./enigmas/enigma2.js";
import enigma3 from "./enigmas/enigma3.js";
import enigma4 from "./enigmas/enigma4.js";

export default {
  /**
   * Registers socket listeners for the game.
   *
   * @param {Server} io
   * @param {Logger} logger
   * @param {PrismaClient} prisma
   * @param {Socket} socket
   * @param {import("#room").SocketState} socketState
   */
  registerSocketListeners(io, logger, prisma, socket, socketState) {
    socket.on("game:start", async () => {
      if (!socketState.player) {
        socket.emit("error:not-found");
        return;
      }

      if (!socketState.room) {
        socket.emit("error:not-found");
        return;
      }

      let room = await prisma.room.findUnique({
        where: {
          id: socketState.room,
        },
        include: {
          players: true,
          Enigma1: true,
          Enigma2: true,
          Enigma3: true,
          Enigma4: true,
        },
      });

      const player = room.players.find((p) => p.id === socketState.player);

      if (!player) {
        socket.emit("error:not-found");
        return;
      }

      if (!player.isHost) {
        socket.emit("error:not-authorized");
        return;
      }

      room = await prisma.room.update({
        where: {
          id: room.id,
        },
        data: {
          started: true,
        },
        include: {
          players: true,
          Enigma1: true,
          Enigma2: true,
          Enigma3: true,
          Enigma4: true,
        },
      });

      logger.info(
        `Player ${player.pseudo} started the game in room ${room.code}`,
      );

      io.to(room.code).emit("game:started");
      io.to(room.code).emit("game:scene-changed", { scene: "main" });

      setTimeout(update, 1000);
    });

    socket.on("game:change-scene", async ({ scene }) => {
      const player = await prisma.player.findUnique({
        where: {
          id: socketState.player,
        },
        include: {
          room: true,
        },
      });

      logger.info(
        `Player ${player.pseudo} tries to change scene from ${player.currentScene} to ${scene}`,
      );

      if (scene === player.currentScene) {
        return;
      }

      switch (scene) {
        case "main":
        case "finale":
          break;
        case "enigma1":
        case "enigma2":
        case "enigma3":
        case "enigma4":
          switch (player.currentScene) {
            case "main":
              io.to(player.room.code).emit("game:scene-changed", { scene });
              break;
            default:
              socket.emit("error:invalid-scene-change");
          }
          break;
      }

      await prisma.player.update({
        where: {
          id: player.id,
        },
        data: {
          currentScene: scene,
        },
      });

      logger.info(`Player ${player.pseudo} changed scene to ${scene}`);
      socket.emit("game:scene-changed", { scene });
    });

    async function update() {
      const room = await prisma.room.update({
        where: {
          id: socketState.room,
        },
        data: {
          timer: {
            decrement: 1,
          },
        },
      });

      io.to(room.code).emit("game:update", {
        room,
        event: { kind: "game:timer", data: {} },
      });

      setTimeout(update, 1000);
    }

    enigma1.registerSocketListeners(io, logger, prisma, socket, socketState);
    enigma2.registerSocketListeners(io, logger, prisma, socket, socketState);
    enigma3.registerSocketListeners(io, logger, prisma, socket, socketState);
    enigma4.registerSocketListeners(io, logger, prisma, socket, socketState);
  },
};
