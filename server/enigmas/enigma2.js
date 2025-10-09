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
    socket.on("enigma2:update", async ({ index, lighting }) => {
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

      // Ensure photos array has 5 elements
      const photos = [...room.Enigma2.photos];
      while (photos.length < 5) {
        photos.push("");
      }
      photos[index] = lighting || "";

      room = await prisma.room.update({
        where: { id: room.id },
        data: {
          Enigma2: {
            update: {
              photos: photos,
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
        event: { kind: "enigma2:update", data: { index, lighting } },
      });
    });

    socket.on("enigma2:reset", async () => {
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
          Enigma2: {
            update: {
              photos: ["", "", "", "", ""],
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
        event: { kind: "enigma2:reset", data: null },
      });
    });

    socket.on("enigma2:submit", async () => {
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

      // Check if all assignments are correct
      const correctSolution = [
        "Éclairage 3 points",
        "Low-key (film noir)",
        "High-key",
        "Contre-jour",
        "Lumière naturelle",
      ];

      const isCorrect =
        room.Enigma2.photos.length === correctSolution.length &&
        room.Enigma2.photos.every(
          (photo, index) => photo === correctSolution[index],
        );

      if (isCorrect) {
        room = await prisma.room.update({
          where: { id: room.id },
          data: {
            Enigma2: {
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
          kind: "enigma2:submit-result",
          data: { completed: room.Enigma2.completed },
        },
      });
    });
  },
};
