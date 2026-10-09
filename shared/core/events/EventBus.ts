import { IEventBus, PlatformEventName, EventPayloads } from "./types";

/**
 *  CORE SYSTEM EVENT BUS
 *
 * An in-memory, strongly typed publisher/subscriber bus.
 * This prevents domains from importing each other to trigger side effects.
 */
class MemoryEventBus implements IEventBus {
  private handlers: Map<PlatformEventName, Set<Function>> = new Map();

  /**
   * Dispatches an event to all registered subscribers and awaits their completion.
   * Uses Promise.allSettled so all handlers are guaranteed to finish before any
   * error is propagated, preventing premature acknowledgment or dangling handlers.
   * If any handler fails, the error is propagated to the caller, ensuring that
   * transactional processors (such as the Outbox Relay) do not acknowledge an event
   * prematurely.
   */
  async dispatch<T extends PlatformEventName>(
    event: T,
    payload: EventPayloads[T],
  ): Promise<void> {
    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers || eventHandlers.size === 0) return;

    const handlerPromises = Array.from(eventHandlers).map(async (handler) => {
      await handler(payload);
    });

    const results = await Promise.allSettled(handlerPromises);

    const rejections = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );

    if (rejections.length > 0) {
      const firstError = rejections[0].reason;
      const errorToThrow =
        firstError instanceof Error
          ? firstError
          : new Error(String(firstError));

      if (rejections.length > 1) {
        console.error(
          `[EventBus] Multiple handlers failed for event '${event}' (${rejections.length} errors):`,
          rejections.map((r) => r.reason),
        );
      }

      throw errorToThrow;
    }
  }


  /**
   * Emits an event to all registered subscribers asynchronously
   * to prevent blocking the main thread or the publisher.
   */
  emit<T extends PlatformEventName>(event: T, payload: EventPayloads[T]): void {
    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers || eventHandlers.size === 0) return;

    // Execute handlers in the next tick to prevent blocking the publisher
    setTimeout(() => {
      eventHandlers.forEach(async (handler) => {
        try {
          await handler(payload);
        } catch (error) {
          console.error(`Event handler failed for event: ${event}`, {
            error,
            payload,
          });
        }
      });
    }, 0);
  }

  /**
   * Subscribes to an event. Returns an unsubscribe function to prevent memory leaks.
   */
  subscribe<T extends PlatformEventName>(
    event: T,
    handler: (payload: EventPayloads[T]) => void | Promise<void>,
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    const eventHandlers = this.handlers.get(event)!;
    eventHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(event);
        }
      }
    };
  }

  /**
   * Clears all registered handlers. Useful for test isolation.
   */
  clear(): void {
    this.handlers.clear();
  }
}

// Export a singleton instance
export const eventBus = new MemoryEventBus();

