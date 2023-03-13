# 🦎 Deno Tail Lines

Read the last N lines of a text file and return a string array.

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
file.close();
```

## Performance

This works by reading the file in reverse. It is very fast when reading a small number of lines from a very large file. For example, tailing 10 lines from the end of a 500000 line 1GB file can take < 1ms on a fast drive.

If you're tailing the majority of lines, e.g. 900 of 1000, then slicing `readLines` is faster. For small files ~100 lines there is little difference to either technique.

## Using the Standard Library

The Deno standard library includes a [`readLines`](https://deno.land/std/io/read_lines.ts) function. You can read all lines and slice the result.

Performance grows exponentially and is unsuitable for large files unless you want to keep most lines.

```ts
import {readLines} from "https://deno.land/std/io/mod.ts";
const path = '/path/to/example.log';
const maxLines = 10;
let lines: string[] = [];
const file = await Deno.open(path);
for await(const line of readLines(file)) {
  lines.push(line);
}
file.close();
lines = lines.slice(-maxLines);
```

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

This is slower than above (until `readLines` balloons) but more consistent and relatively fast for all use cases.

## License

MIT License

* * *

[MIT License](/LICENSE) | Copyright © 2023 [David Bushell](https://dbushell.com) | [@dbushell](https://twitter.com/dbushell)
