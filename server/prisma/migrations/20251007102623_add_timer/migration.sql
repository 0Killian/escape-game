-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "timer" INTEGER NOT NULL DEFAULT 2700;

-- CreateTable
CREATE TABLE "Enigma1" (
    "roomId" TEXT NOT NULL,
    "storyboards" JSONB[],
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Enigma1_pkey" PRIMARY KEY ("roomId")
);

-- CreateTable
CREATE TABLE "Enigma2" (
    "roomId" TEXT NOT NULL,
    "photos" TEXT[],
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Enigma2_pkey" PRIMARY KEY ("roomId")
);

-- CreateTable
CREATE TABLE "Enigma3" (
    "roomId" TEXT NOT NULL,
    "roles" TEXT[],
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Enigma3_pkey" PRIMARY KEY ("roomId")
);

-- CreateTable
CREATE TABLE "Enigma4" (
    "roomId" TEXT NOT NULL,
    "ambiance" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Enigma4_pkey" PRIMARY KEY ("roomId")
);

-- AddForeignKey
ALTER TABLE "Enigma1" ADD CONSTRAINT "Enigma1_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enigma2" ADD CONSTRAINT "Enigma2_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enigma3" ADD CONSTRAINT "Enigma3_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enigma4" ADD CONSTRAINT "Enigma4_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
