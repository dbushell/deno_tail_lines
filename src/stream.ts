const BUFFER_SIZE = 1024 * 32;

const LF = '\n'.charCodeAt(0);

export interface TailLineStreamOptions {
  signal?: AbortSignal;
}

export class TailLineStream extends ReadableStream<Uint8Array> {
  #file: Deno.FsFile;
  #stat: Deno.FileInfo | undefined;
  #signal?: AbortSignal;
  /** Buffer of read bytes to be processed */
  #buf = new Uint8Array(0);
  /** Index of current pull iteration */
  #iteration = 0;

  constructor(file: Deno.FsFile, options?: TailLineStreamOptions) {
    super({
      pull: (controller) => this.#pull(controller),
      cancel: () => this.#close()
    });
    this.#file = file;
    this.#signal = options?.signal;
  }

  /** Maximum number of pulls to read the entire file */
  get #maxIterations() {
    return this.#stat ? Math.ceil(this.#stat.size / BUFFER_SIZE) : 0;
  }

  /** Maximum number of bytes to read in a pull */
  get #maxRead() {
    return this.#stat ? Math.min(BUFFER_SIZE, this.#stat.size) : 0;
  }

  /** Close the file and stream */
  #close(controller?: ReadableStreamDefaultController<Uint8Array>) {
    try {
      this.#file.close();
    } catch {
      // Ignore
    }
    if (controller) {
      controller.close();
    }
  }

  async #pull(controller: ReadableStreamDefaultController<Uint8Array>) {
    // Get file size on first pull
    if (!this.#stat) {
      this.#stat = await this.#file.stat();
      if (this.#stat.size === 0) {
        this.#close(controller);
        return;
      }
    }
    // Close if stream has been aborted
    if (this.#signal?.aborted) {
      this.#close(controller);
      return;
    }
    // Close after all data has been read
    if (this.#iteration >= this.#maxIterations) {
      // Check for final line in buffer
      if (this.#buf.length) {
        controller.enqueue(this.#buf.slice());
      }
      this.#close(controller);
      return;
    }

    let read: number | null = this.#maxRead;

    // Seek to start of current iteration
    if (this.#maxIterations > 1) {
      let seek = (this.#iteration + 1) * this.#maxRead;
      if (seek > this.#stat.size) {
        read = this.#maxRead - (seek - this.#stat.size);
        seek = this.#stat.size;
      }
      await this.#file.seek(-seek, Deno.SeekMode.End);
    }

    let readBuf = new Uint8Array(read);
    read = await this.#file.read(readBuf);

    // Close if nothing has been read
    if (read === null) {
      this.#close(controller);
      return;
    }

    // Handle trailing line feed at end of file
    if (this.#iteration === 0 && readBuf.at(-1) === LF) {
      if (readBuf.length === 1) {
        // File is an empty line
        controller.enqueue(new Uint8Array());
        this.#close(controller);
        return;
      }
      readBuf = readBuf.subarray(0, -1);
      read--;
    }

    // Concatenate read buffer with existing buffer
    const newBuf = new Uint8Array(readBuf.length + this.#buf.length);
    newBuf.set(readBuf, 0);
    newBuf.set(this.#buf, readBuf.length);
    this.#buf = newBuf;

    // Work through lines in buffer in reverse order
    let index = this.#buf.length;
    while (true) {
      if (this.#signal?.aborted) {
        this.#close(controller);
        return;
      }
      // Find last line feed in buffer
      const newIndex = this.#buf.lastIndexOf(LF, index - 1);
      if (newIndex === -1) {
        // File is exactly one line
        if (this.#maxIterations === 1) {
          controller.enqueue(this.#buf.slice(0, index));
        }
        break;
      }
      controller.enqueue(this.#buf.slice(newIndex + 1, index));
      index = newIndex;
      // New line at start of buffer
      if (index === 0) {
        controller.enqueue(new Uint8Array());
        break;
      }
    }

    if (this.#maxIterations === 1) {
      this.#close(controller);
      return;
    }

    // Shrink buffer to remaining data for next iteration
    this.#buf = this.#buf.slice(0, index);

    this.#iteration++;
  }
}
