import { PrismaClient } from "@prisma/client";
import { Server, Socket } from "socket.io";
import { Logger } from "winston";

/**
 * @typedef {Object} Storyboard
 * @property {string} name
 * @property {Object} position
 * @property {number} position.x
 * @property {number} position.y
 * @property {number} index
 */

export default {
  /**
   * Registers socket listeners for the first enigma.
   *
   * @param {Server} io
   * @param {Logger} logger
   * @param {PrismaClient} prisma
   * @param {Socket} socket
   * @param {import("#room").SocketState} socketState
   */
  registerSocketListeners(io, logger, prisma, socket, socketState) {
    socket.on(
      "enigma1:move",
      async (
        /** @type {Array<{ key: string; x: number; y: number }>} */
        moves,
      ) => {
        for (const { key, x, y } of moves) {
          logger.info(`Moving storyboard ${key} to (${x}, ${y})`);
        }

        let room = await prisma.room.findUnique({
          where: { id: socketState.room },
          include: {
            players: true,
            Enigma1: true,
            Enigma2: true,
            Enigma3: true,
            Enigma4: true,
          },
        });

        for (const { key, x, y } of moves) {
          /** @type {Storyboard} */
          // @ts-ignore
          let storyboard = room.Enigma1.storyboards.find(
            (/** @type {Storyboard} */ storyboard) => storyboard.name === key,
          );
          if (!storyboard) {
            logger.error(
              `Storyboard not found for enigma 1 in room ${room.id}`,
            );
            socket.emit("error:no-found");
            return;
          }

          storyboard.position = { x, y };
        }

        room = await prisma.room.update({
          where: { id: room.id },
          data: {
            Enigma1: {
              update: {
                storyboards: room.Enigma1.storyboards,
              },
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

        io.to(room.code).emit("game:update", {
          room,
          event: { kind: "enigma1:move", data: moves },
        });
      },
    );

    socket.on(
      "enigma1:swap-slots",
      async (
        /** @type {{ slot1: string, slot2: string }} */
        { slot1, slot2 },
      ) => {
        let room = await prisma.room.findUnique({
          where: { id: socketState.room },
          include: {
            players: true,
            Enigma1: true,
            Enigma2: true,
            Enigma3: true,
            Enigma4: true,
          },
        });

        /** @type {Storyboard} */
        // @ts-ignore
        let storyboard1 = room.Enigma1.storyboards.find(
          (/** @type {Storyboard} */ storyboard) => storyboard.name === slot1,
        );
        if (!storyboard1) {
          logger.error(`Storyboard not found for enigma 1 in room ${room.id}`);
          socket.emit("error:no-found");
          return;
        }

        /** @type {Storyboard} */
        // @ts-ignore
        let storyboard2 = room.Enigma1.storyboards.find(
          (/** @type {Storyboard} */ storyboard) => storyboard.name === slot2,
        );
        if (!storyboard2) {
          logger.error(`Storyboard not found for enigma 1 in room ${room.id}`);
          socket.emit("error:no-found");
          return;
        }

        [storyboard1.index, storyboard2.index] = [
          storyboard2.index,
          storyboard1.index,
        ];

        room = await prisma.room.update({
          where: { id: room.id },
          data: {
            Enigma1: {
              update: {
                storyboards: room.Enigma1.storyboards,
              },
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

        logger.info(
          `Enigma 1 swapped slots ${storyboard1.name} and ${storyboard2.name} in room ${room.id}`,
        );
        io.to(room.code).emit("game:update", {
          room,
          event: {
            kind: "enigma1:swap-slots",
            data: { slot1: storyboard1.name, slot2: storyboard2.name },
          },
        });
      },
    );

    socket.on("enigma1:submit", async () => {
      let room = await prisma.room.findUnique({
        where: { id: socketState.room },
        include: {
          players: true,
          Enigma1: true,
          Enigma2: true,
          Enigma3: true,
          Enigma4: true,
        },
      });

      // TODO: Solution
      if (false) {
        room = await prisma.room.update({
          where: { id: room.id },
          data: {
            Enigma1: {
              update: {
                completed: true,
              },
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
      }

      io.to(room.code).emit("game:update", {
        room,
        event: {
          kind: "enigma1:submit",
          data: { completed: room.Enigma1.completed },
        },
      });
    });
  },
};
