const BUFFER_SIZE = 1024 * 32;

const LF = '\n'.charCodeAt(0);

/**
 * Return array of line feed byte offsets in reverse order
 * @deprecated
 */
export const readOffsets = async (
  file: Deno.FsFile,
  maxOffsets = Number.MAX_SAFE_INTEGER
): Promise<number[]> => {
  const stat = await file.stat();
  const offsets: number[] = [];
  const maxRead = Math.min(BUFFER_SIZE, stat.size);
  for (let i = 0; i < Math.ceil(stat.size / maxRead); i++) {
    let read: number | null = maxRead;
    let seek = (i + 1) * maxRead;
    if (seek > stat.size) {
      read = maxRead - (seek - stat.size);
      seek = stat.size;
    }
    const buf = new Uint8Array(read);
    await file.seek(-seek, Deno.SeekMode.End);
    read = await file.read(buf);
    if (read === null) break;
    let offset = buf.length;
    while (offset) {
      offset = buf.lastIndexOf(LF, offset - 1);
      if (offset === -1) break;
      offsets.push(seek - offset - 1);
    }
    if (offsets.length >= maxOffsets) break;
  }
  if (offsets.at(0) !== 0) offsets.unshift(0);
  if (offsets.at(-1) !== stat.size) offsets.push(stat.size);
  return offsets;
};
