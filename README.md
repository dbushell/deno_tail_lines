# 🦎 Deno Tail Lines

Read the last N lines of a text file and return a string array.

`import {tailLines} from 'https://deno.land/x/tail_lines/mod.ts';`

[GitHub](https://github.com/dbushell/deno_tail_lines) / [Deno module](https://deno.land/x/tail_lines)

## Usage

Using `tailLine` async function:

```ts
import {tailLine} from 'https://deno.land/x/tail_lines/mod.ts';
const path = '/path/to/example.log';
const maxLines = 10;
const lines = await tailLine(path, maxLines);
```

Using `tailLines` async iterator function:

```ts
import {tailLines} from 'https://deno.land/x/tail_lines/mod.ts';
const path = '/path/to/example.log';
const maxLines = 10;
const lines: string[] = [];
const file = await Deno.open(path);
for await (const line of tailLines(file, maxLines)) {
  lines.unshift(line);
}
```

### Stream API

The two functions above use `TailLineStream` under the hood.

To use `TailLineStream` create an instance:

```ts
import {TailLineStream} from 'https://deno.land/x/tail_lines/mod.ts';
const path = '/path/to/example.log';
const file = await Deno.open(path);
const stream = new TailLineStream(file);
const textDecoder = new TextDecoder();
```

Then use either the reader:

```ts
const reader = stream.getReader();
reader.read().then(function process({done, value}) {
  if (done) return;
  console.log(textDecoder.decode(value));
  reader.read().then(process);
});
```

Or the async iterator:

```ts
for await (const line of stream) {
  console.log(textDecoder.decode(line));
}
```

You could pipe through a `TextDecoderStream`:

```ts
const stream = new TailLineStream(file).pipeThrough(new TextDecoderStream());
for await (const line of stream) {
  console.log(line);
}
```

But you should just use `tailLines()` instead it will be faster.

## Performance

This library works by reading the file in reverse. Useful for reading a small number of lines from the end of a very large file. For example, tailing 10 lines from the end of a 500000 line 1GB file can take < 1ms on a fast drive. It is much faster than the methods below.

## Using the Standard Library

The Deno standard library includes the [`TextLineStream`](https://deno.land/std@0.204.0/streams/mod.ts?s=TextLineStream) transform stream and now deprecated [`readLines`](https://deno.land/std@0.204.0/io/mod.ts?s=readLines) function. You can read all lines and slice the result.

```ts
import {TextLineStream} from 'https://deno.land/std@0.204.0/streams/mod.ts';
const path = '/path/to/example.log';
const maxLines = 10;
let lines: string[] = [];
const file = await Deno.open(path);
const lines = file.readable
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(new TextLineStream());
for await (const line of lines) {
  lines.push(line);
}
lines = lines.slice(-maxLines);
```

Performance balloons exponentially and is unsuitable for large files because the entire file is read through memory.

## Using `tail` Unix command

Spawning a `tail` process is another option.

```ts
const path = '/path/to/example.log';
const maxLines = 10;
const command = new Deno.Command('tail', {
  args: ['-n', String(maxLines), `${path}`]
});
const {stdout} = await command.output();
const lines = new TextDecoder().decode(stdout).split('\n');
```

This technique is slower but still relatively fast compared to the standard options.

* * *

[MIT License](/LICENSE) | Copyright © 2023 [David Bushell](https://dbushell.com)
