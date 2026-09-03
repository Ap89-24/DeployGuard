// ============================================================================
// DeployGuard AI - In-Memory & Redis Event Bus
// ============================================================================

import { EventEmitter } from 'events';
import { BaseDomainEvent, EventType } from './event-types.js';

export class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    super();
    this.setMaxListeners(100);
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }

    return EventBus.instance;
  }

  public publishEvent(event: BaseDomainEvent): void {
    console.log(
      `[EventBus] Publishing event '${event.type}' (${event.id}) for provider '${event.provider}'`,
    );

    this.emit(event.type, event);
    this.emit('*', event);
  }

  public subscribeToEvent(
    eventType: EventType | '*',
    handler: (event: BaseDomainEvent) => void,
  ): void {
    this.on(eventType, handler);
  }

  public unsubscribeFromEvent(
    eventType: EventType | '*',
    handler: (event: BaseDomainEvent) => void,
  ): void {
    this.off(eventType, handler);
  }
}