# 🦎 Deno Tail Lines

Read the last N lines of a text file and return a string array.

## Usage

Using `tailLines` async function:

```ts
import {tailLines} from 'https://deno.land/x/deno_taillines@v0.1.0/mod.ts'
const path = '/path/to/example.log';
const maxLines = 10;
const lines = await tailLines(path, maxLines);
```

Using `tailLine` async iterator function:

```ts
import {tailLine} from 'https://deno.land/x/deno_taillines@v0.1.0/mod.ts'
const path = '/path/to/example.log';
const maxLines = 10;
const lines: string[] = [];
const file = await Deno.open(path);
for await (const line of tailLine(file, maxLines)) {
  lines.unshift(line);
}
file.close();
```

## Performance

This works by reading the file in reverse. It is very fast when reading a small number of lines from a very large file. For example, tailing 10 lines from the end of a 500000 line 1GB file can take < 1ms on a fast drive.

If you're tailing the majority of lines, e.g. 900 of 1000, then splicing `readLines` is faster. For small files ~100 lines there is little difference to either technique.

## Using the Standard Library

The Deno standard library includes a [`readLines`](https://deno.land/std/io/read_lines.ts) function.

```ts
import {readLines} from "https://deno.land/std/io/mod.ts";
const path = '/path/to/example.log';
const maxLines = 10;
let lines: string[] = [];
const file = await Deno.open('/path/to/example.log');
for await(const line of readLines(file)) {
  lines.push(line);
}
file.close();
lines = lines.slice(-maxLines);
```

## License

MIT License

* * *

[MIT License](/LICENSE) | Copyright © 2023 [David Bushell](https://dbushell.com) | [@dbushell](https://twitter.com/dbushell)