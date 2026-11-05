import {decideFromObservation,executeDecision,sanitizeObservation} from './decision-core.mjs';
// Opt-in integration seam. This does NOT replace the canonical easyBotAction.
// Caller supplies a canonical owner observation and an isolated planning engine.
export const observeGame=sanitizeObservation;
export const decideGame=decideFromObservation;
export const executeGameDecision=executeDecision;
