/**
 * Outbox — thin re-export layer over syncEngine (single source of truth).
 * All consumers that import from '@/services/outbox' now use the unified engine.
 */
export {
  enqueue,
  getOutboxStatus,
  retryFailedEvents,
  syncOutbox as flushOutbox,
  applyIdMappings as applyIdMapInCaches
} from './syncEngine';
