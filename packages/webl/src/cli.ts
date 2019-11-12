import {start as startREPL, REPLServer} from 'repl';
import {createServer, IncomingMessage, ServerResponse, Server} from 'http';
import {AddressInfo} from 'net';
import {format} from 'util';

import WebpackBuilder from './webpack/index.js';

class Webl {
  onRequest = this._onRequest.bind(this);
  onListen = this._onListen.bind(this);

  private mode: 'development' | 'test' | 'production';
  private port: number | null = null;
  private progress: number = 0;
  private builder: WebpackBuilder;

  constructor(private repl: REPLServer) {
    this.mode = process.env.NODE_ENV as 'production' || 'development';
    this.registerCommands();
    this.updatePrompt();

    this.builder = new WebpackBuilder({repl, setProgress: this.setProgress.bind(this)});
  }

  private registerCommands() {
    this.repl.defineCommand('node-env', {
      help: '',
      action: (text) => {
        this.log('Got text: %j', text);
      },
    });
  }

  setProgress(progress: number) {
    this.progress = progress;
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
    const perc = rounded < 10 ? `0${rounded}` : (rounded === 100 ? '✅' : `${rounded}`);
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
