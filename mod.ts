import {readOffsets} from './src/offsets.ts';
import {TailLineStream} from './src/stream.ts';

export {readOffsets, TailLineStream};

interface DecoderOptions {
  encoding?: string;
  fatal?: boolean;
  ignoreBOM?: boolean;
}

export async function* tailLines(
  file: Deno.FsFile,
  maxLines: number,
  decoderOpts?: DecoderOptions
): AsyncGenerator<string, void, unknown> {
  const textDecoder = new TextDecoder(decoderOpts?.encoding, decoderOpts);
  const controller = new AbortController();
  const stream = new TailLineStream(file, {
    signal: controller.signal
  });
  let lines = 0;
  for await (const line of stream) {
    if (controller.signal.aborted) break;
    yield textDecoder.decode(line);
    if (++lines >= maxLines) {
      controller.abort();
      return;
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
  lines.reverse();
  return lines;
};
