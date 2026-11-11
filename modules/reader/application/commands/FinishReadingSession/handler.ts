import { FinishReadingSessionCommand } from "./command";
import { FinishReadingSessionOutput } from "./output";
import { ReaderRepository } from "../../../infrastructure/ReaderRepository";
import { ReadingPosition } from "../../../domain/ReadingPosition";
import { ReadingSessionCompleted } from "../../../domain/Events";

export class FinishReadingSessionHandler {
  constructor(private readonly readerRepository: ReaderRepository) {}

  async execute(
    command: FinishReadingSessionCommand,
  ): Promise<FinishReadingSessionOutput> {
    try {
      const { sessionId, location, chapter, page, progress, pagesRead } =
        command.input;

      const session = await this.readerRepository.findById(sessionId);
      if (!session) {
        throw new Error("Session not found");
      }

      const endPosition = ReadingPosition.create({
        location,
        chapter,
        page,
        progress,
        updatedAt: new Date(),
      });

      session.complete(endPosition, pagesRead);

      await this.readerRepository.save(session);

      // Domain events dispatch here (e.g., orchestrating ApplyReadingActivity)
      // const events = session.getDomainEvents();
      // this.eventDispatcher.dispatchAll(events);

      const finishEvent = session
        .getDomainEvents()
        .find(
          (e): e is ReadingSessionCompleted =>
            e.type === "ReadingSessionCompleted",
        );

      session.clearDomainEvents();

      return {
        sessionId: session.id,
        durationSeconds: finishEvent?.durationSeconds || 0,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unknown error finishing session",
      );
    }
  }
}
