import {REPLServer} from 'repl';
import {format} from 'util';
import {ChildProcess} from 'child_process';
import {clearLine, cursorTo} from 'readline';
import {Readable} from 'stream';

export default class WeblREPL {
  private mode: 'development' | 'test' | 'production';
  private port: number | null = null;
  private progress: number = 0;

  constructor(private repl: REPLServer) {
    this.mode = process.env.NODE_ENV as 'production' || 'development';
    this.registerCommands();
    this.updatePrompt();
  }

  private registerCommands() {
    this.repl.defineCommand('node-env', {
      help: '',
      action: (text) => {
        this.log('Got text: %j', text);
      },
    });
  }

  forwardStream(prefix: string, stream: Readable) {
    if (!stream) return;
    const output = this.repl.outputStream;
    stream.setEncoding('utf8');
    stream.on('data', data => {
      clearLine(output, -1);
      cursorTo(output, 0);
      const lines = data.split('\n');
      if (!lines[lines.length - 1]) {
        lines.pop();
      }
      for (const line of lines) {
        output.write(`< ${prefix}: ${line}\n`);
      }
      this.repl.prompt(true);
    });
  }

  forwardOutput(prefix: string, worker: ChildProcess) {
    for (const stream of [worker.stdout, worker.stderr]) {
      if (!stream) continue;
      this.forwardStream(prefix, stream);
    }
  }

  setProgress(progress: number) {
    this.progress = progress;
    this.updatePrompt();
  }

  setPort(port: number) {
    this.port = port;
    this.updatePrompt();
  }

  log(message: any, ...args: any[]) {
    this.repl.outputStream.write(format(message, ...args) + '\n');
    this.updatePrompt();
  }

  formatPrompt() {
    if (this.port === null) {
      return `⏱>`;
    }
    const mode = this.mode === 'production' ? '✨' : '🛠';
    const rounded = Math.floor(this.progress * 100);
    const perc = rounded < 10 ? ` ${rounded}%` : (rounded === 100 ? ' ✅' : `${rounded}%`);
    return `[${mode} ${perc}] `;
  }

  updatePrompt() {
    this.repl.setPrompt(this.formatPrompt());
    this.repl.prompt(true);
  }

  exitOnClose() {
    this.repl.on('close', () => {
      process.exit();
    });
  }
}
