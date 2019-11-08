import {start as startREPL, REPLServer} from 'repl';
import {createServer, IncomingMessage, ServerResponse, Server} from 'http';
import {AddressInfo} from 'net';
import {format} from 'util';
import {spawn, ChildProcess} from 'child_process';
import {clearLine, cursorTo} from 'readline';

function printHelloABunch() {
  process.on('disconnect', () => process.exit());
  if (!process.connected) {process.exit();}
  setInterval(() => {console.log('hello')}, 500);
}

const hello = spawn(
  'node',
  ['-e', `(${printHelloABunch})()`],
  {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  }
);
hello;

class Webl {
  onRequest = this._onRequest.bind(this);
  onListen = this._onListen.bind(this);

  private mode: 'development' | 'test' | 'production';
  private port: number | null = null;
  private progress: number = 0;

  constructor(private repl: REPLServer) {
    this.mode = process.env.NODE_ENV as 'production' || 'development';
    this.registerCommands();
    this.updatePrompt();

    this.forwardOutput('hello', hello);
  }

  private registerCommands() {
    this.repl.defineCommand('node-env', {
      help: '',
      action: (text) => {
        this.log('Got text: %j', text);
      },
    });
  }

  forwardOutput(name: string, child: ChildProcess) {
    for (const stream of [child.stdout, child.stderr]) {
      if (!stream) continue;
      stream.setEncoding('utf8');
      stream.on('data', data => {
        clearLine(this.repl.outputStream, -1);
        cursorTo(this.repl.outputStream, 0);
        const lines = data.split('\n');
        if (!lines[lines.length - 1]) {
          lines.pop();
        }
        for (const line of lines) {
          this.repl.outputStream.write(`< ${name}: ${line}\n`);
        }
        this.updatePrompt();
      });
    }
  }

  setProgress(percent: number) {
    this.progress = percent;
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
    const perc = this.progress < 10 ? `0${this.progress}` : (this.progress === 100 ? '✅' : `${this.progress}`);
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

  private _onRequest(req: IncomingMessage, res: ServerResponse) {
    res.end('TODO\n');
  }

  private _onListen(server: Server) {
    this.port = (server.address() as AddressInfo).port;
    this.updatePrompt();

    const bumpProgress = () => {
      if (this.progress < 100) {
        this.setProgress(this.progress + 10);
        setTimeout(bumpProgress, 200);
      }
    };
    bumpProgress();
  }
}

async function main(argv: string[]) {
  const webl = new Webl(startREPL());
  webl.exitOnClose();

  const server = createServer(webl.onRequest);
  server.unref();
  server.listen(0, '127.0.0.1', webl.onListen.bind(null, server));
}

main(process.argv).catch(e => process.nextTick(() => {throw e}));
