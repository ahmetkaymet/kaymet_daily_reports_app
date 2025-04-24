export function uploadFile(
  file: File,
  formattedFileName: string,
  onProgress: (progress: number) => void
): Promise<void>; 