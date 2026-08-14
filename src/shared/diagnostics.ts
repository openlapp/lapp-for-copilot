export type DiagnosticLevel = "ERROR" | "WARN" | "INFO";

export interface AppDiagnostic {
  level: DiagnosticLevel;
  code: string;
  message: string;
  location?: string;
}

export function diagnostic(
  level: DiagnosticLevel,
  code: string,
  message: string,
  location?: string,
): AppDiagnostic {
  return location ? { level, code, message, location } : { level, code, message };
}
