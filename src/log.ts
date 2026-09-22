// One JSON object per line on stderr (stdout carries the protocol in stdio
// mode). Railway reads `level` and `message` from structured lines; without
// `level` it classifies every stderr line as an error.
type LogLevel = "info" | "warn" | "error";

export function log(level: LogLevel, message: string, fields: Record<string, unknown> = {}): void {
  console.error(JSON.stringify({ level, message, ...fields }));
}
