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
        /** @type {{ name: string; position: { x: number; y: number } }} */
        { name, position },
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
        let storyboard = room.Enigma1.storyboards.find(
          (/** @type {Storyboard} */ storyboard) => storyboard.name === name,
        );
        if (!storyboard) {
          logger.error(`Storyboard not found for enigma 1 in room ${room.id}`);
          socket.emit("error:no-found");
          return;
        }

        storyboard.position = position;

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

        io.to(room.id).emit("game:update", { room });
      },
    );

    socket.on(
      "enigma1:set-storyboard",
      async (
        /** @type {{ name: string; index: number }} */
        { name, index },
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
        let storyboard = room.Enigma1.storyboards.find(
          (/** @type {Storyboard} */ storyboard) => storyboard.name === name,
        );
        if (!storyboard) {
          logger.error(`Storyboard not found for enigma 1 in room ${room.id}`);
          socket.emit("error:no-found");
          return;
        }

        storyboard.index = index;

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

        io.to(room.id).emit("game:update", { room });
      },
    );

    socket.on("enigma1:submit-solution", async () => {
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

      io.to(room.code).emit("game:update", { room });
    });
  },
};
