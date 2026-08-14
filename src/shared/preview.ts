export function isCurrentPreview(currentOperationId: string, incomingOperationId?: string): boolean {
  if (!currentOperationId) return false;
  if (incomingOperationId && currentOperationId !== incomingOperationId) return false;
  return true;
}

export function remainingPreviewOperationId(current: string | undefined, cancelled: string): string | undefined {
  return current === cancelled ? undefined : current;
}
