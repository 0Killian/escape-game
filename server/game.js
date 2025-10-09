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
          // Autorisé depuis n'importe quelle scène
          break;
        case "enigma1":
        case "enigma2":
        case "enigma3":
        case "enigma4":
          // Les énigmes ne peuvent être accédées que depuis main
          if (player.currentScene !== "main") {
            socket.emit("error:invalid-scene-change");
            return;
          }
          break;
        default:
          socket.emit("error:invalid-scene-change");
          return;
      }

      await prisma.player.update({
        where: {
          id: player.id,
        },
        data: {
          currentScene: scene,
        },
      });

      // Récupérer la room complète avec toutes les énigmes
      const room = await prisma.room.findUnique({
        where: {
          id: player.room.id,
        },
        include: {
          players: true,
          Enigma1: true,
          Enigma2: true,
          Enigma3: true,
          Enigma4: true,
        },
      });

      logger.info(`Player ${player.pseudo} changed scene to ${scene}`);
      socket.emit("game:scene-changed", { scene });
      // Envoyer aussi un update avec les données complètes de la room
      socket.emit("game:update", {
        room,
        event: { kind: "game:scene-change", data: {} },
      });
    });

    async function update() {
      // Fetch current room state
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

      // Check if timer should be stopped (all enigmas completed)
      const allCompleted =
        room.Enigma1.completed &&
        room.Enigma2.completed &&
        room.Enigma3.completed;

      if (allCompleted && !room.timerStopped) {
        // Stop the timer by setting timerStopped flag
        room = await prisma.room.update({
          where: {
            id: socketState.room,
          },
          data: {
            timerStopped: true,
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
          `Timer stopped for room ${room.code} - all enigmas completed`,
        );
      } else if (!room.timerStopped && room.timer > 0) {
        // Continue decrementing timer if not stopped and time remaining
        room = await prisma.room.update({
          where: {
            id: socketState.room,
          },
          data: {
            timer: {
              decrement: 1,
            },
          },
          include: {
            players: true,
            Enigma1: true,
            Enigma2: true,
            Enigma3: true,
            Enigma4: true,
          },
        });
      } else if (!room.timerStopped && room.timer === 0) {
        // Game over - time's up
        room = await prisma.room.update({
          where: {
            id: socketState.room,
          },
          data: {
            timerStopped: true,
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
          `Game over for room ${room.code} - time's up`,
        );

        io.to(room.code).emit("game:over", {
          room,
          reason: "timeout",
        });
      }

      io.to(room.code).emit("game:update", {
        room,
        event: { kind: "game:timer", data: {} },
      });

      // Only continue the timer loop if the room still exists and game isn't over
      if (!room.timerStopped || room.timer > 0) {
        setTimeout(update, 1000);
      }
    }

    enigma1.registerSocketListeners(io, logger, prisma, socket, socketState);
    enigma2.registerSocketListeners(io, logger, prisma, socket, socketState);
    enigma3.registerSocketListeners(io, logger, prisma, socket, socketState);
    enigma4.registerSocketListeners(io, logger, prisma, socket, socketState);
  },
};
