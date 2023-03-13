const BUFFER_SIZE = 1024 * 32;

const LF = '\n'.charCodeAt(0);

interface DecoderOptions {
  encoding?: string;
  fatal?: boolean;
  ignoreBOM?: boolean;
}

export const readOffsets = async (
  file: Deno.FsFile,
  maxOffsets = Number.MAX_SAFE_INTEGER
): Promise<number[]> => {
  const stat = await file.stat();
  const offsets: number[] = [];
  const maxLength = Math.min(BUFFER_SIZE, stat.size);
  for (let i = 0; i < Math.ceil(stat.size / maxLength); i++) {
    let length = maxLength;
    let seek = (i + 1) * maxLength;
    if (seek > stat.size) {
      length = maxLength - (seek - stat.size);
      seek = stat.size;
    }
    const buf = new Uint8Array(length);
    await file.seek(-seek, Deno.SeekMode.End);
    const read = await file.read(buf);
    if (read === null) break;
    for (let k = read; k > 0; k--) {
      if (buf[k - 1] === LF) offsets.push(seek - k);
    }
    if (offsets.length >= maxOffsets) break;
  }
  if (offsets.at(0) !== 0) offsets.unshift(0);
  if (offsets.at(-1) !== stat.size) offsets.push(stat.size);
  return offsets;
};

export async function* tailLines(
  file: Deno.FsFile,
  maxLines = Number.MAX_SAFE_INTEGER,
  decoderOpts?: DecoderOptions
) {
  const textDecoder = new TextDecoder(decoderOpts?.encoding, decoderOpts);
  const offsets: number[] = await readOffsets(file, maxLines + 1);
  for (let i = 0; i < offsets.length - 1 && i < maxLines; i++) {
    const length = offsets[i + 1] - offsets[i];
    await file.seek(-offsets[i + 1], Deno.SeekMode.End);
    const buffer = new Uint8Array(length);
    await file.read(buffer);
    if (buffer.at(-1) === LF) {
      yield textDecoder.decode(buffer.subarray(0, -1));
    } else {
      yield textDecoder.decode(buffer);
    }
  }
}

export const tailLine = async (
  path: string,
  maxLines: number,
  decoderOpts?: DecoderOptions
): Promise<string[]> => {
  const file = await Deno.open(path);
  const lines: string[] = [];
  for await (const line of tailLines(file, maxLines, decoderOpts)) {
    lines.push(line);
  }
  file.close();
  lines.reverse();
  return lines;
};
