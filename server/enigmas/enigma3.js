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
    socket.on("enigma3:update", async ({ index, role }) => {
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

      // Mettre à jour le tableau des rôles
      const newRoles = [...room.Enigma3.roles];
      newRoles[index] = role;

      room = await prisma.room.update({
        where: { id: room.id },
        data: {
          Enigma3: {
            update: {
              roles: newRoles,
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

      io.to(room.code).emit("game:update", { room });
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

      // Solution correcte selon les archétypes narratifs du Titanic
      // Index 0: Héros -> Jack (jack)
      // Index 1: Mentor -> Molly Brown (molly)
      // Index 2: Antagoniste -> Caledon Hockley (caledon)
      // Index 3: Allié -> Fabrizio (fabrizio)
      // Index 4: Héroïne -> Rose (rose)
      // Index 5: Sbire -> Spicer Lovejoy (lovejoy)
      const correctSolution = [
        "jack",
        "molly",
        "caledon",
        "fabrizio",
        "rose",
        "lovejoy",
      ];

      const isCorrect = room.Enigma3.roles.every(
        (role, index) => role === correctSolution[index],
      );

      if (isCorrect) {
        room = await prisma.room.update({
          where: { id: room.id },
          data: {
            Enigma3: {
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

        logger.info(`Enigma 3 completed in room ${room.code}`);
      } else {
        logger.info(`Enigma 3 failed in room ${room.code}`);
      }

      io.to(room.code).emit("game:update", {
        room,
        event: {
          kind: "enigma3:submit-result",
          data: { completed: room.Enigma3.completed },
        },
      });
    });
  },
};
