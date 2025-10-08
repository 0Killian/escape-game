import { PrismaClient } from "@prisma/client";
import { Server, Socket } from "socket.io";
import { Logger } from "winston";

export default {
  /**
   * Registers socket listeners for the second enigma.
   *
   * @param {Server} io
   * @param {Logger} logger
   * @param {PrismaClient} prisma
   * @param {Socket} socket
   * @param {import("#room").SocketState} socketState
   */
  async registerSocketListeners(io, logger, prisma, socket, socketState) {
    socket.on("enigma3:update", async ({ ambiance }) => {
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

      room = await prisma.room.update({
        where: { id: room.id },
        data: {
          Enigma4: {
            update: {
              ambiance,
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

      io.to(socketState.room).emit("room:update", { room });
    });

    socket.on("enigma3:submit", async () => {
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
            Enigma4: {
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
