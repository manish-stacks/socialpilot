export class PermanentError extends Error {}
export class RetryableError extends Error { constructor(m: string, public minDelayMs = 0) { super(m); } }
export class UncertainError extends Error {}
export class NotReadyError extends Error {}
