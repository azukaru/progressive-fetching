import {fork, ChildProcess} from 'child_process';
import {clearLine, cursorTo} from 'readline';
import {REPLServer} from 'repl';
import {fileURLToPath} from 'url';

function forwardOutput(worker: ChildProcess, repl: REPLServer) {
  const output = repl.outputStream;
  for (const stream of [worker.stdout, worker.stderr]) {
    if (!stream) continue;
    stream.setEncoding('utf8');
    stream.on('data', data => {
      clearLine(output, -1);
      cursorTo(output, 0);
      const lines = data.split('\n');
      if (!lines[lines.length - 1]) {
        lines.pop();
      }
      for (const line of lines) {
        output.write(`< build: ${line}\n`);
      }
      repl.prompt(true);
    });
  }
}

interface BuilderOptions {
  repl: REPLServer;
  setProgress(progress: number): void;
}

export default class WebpackBuilder {
  private worker: ChildProcess;

  constructor(options: BuilderOptions) {
    const workerURL = new URL('./worker.js', import.meta.url);
    this.worker = fork(fileURLToPath(workerURL.href), [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });
    this.worker.unref();
    forwardOutput(this.worker, options.repl);

    this.worker.on('message', (message) => {
      if (message.type === 'webl.builder.progress') {
        options.setProgress(message.progress);
      }
    });
  }
}
