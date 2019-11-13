import {start as startREPL, REPLServer} from 'repl';
import {createServer, IncomingMessage, ServerResponse, Server} from 'http';
import {AddressInfo} from 'net';
import {existsSync} from 'fs';
import WeblREPL from './repl.js';

interface Builder {}

interface WeblOptions {
  repl: boolean | REPLServer;
}

class Webl {
  onRequest = this._onRequest.bind(this);
  onListen = this._onListen.bind(this);

  private builder?: Builder;
  private repl: WeblREPL | null;

  constructor(options: WeblOptions) {
    this.repl = options.repl ?
      new WeblREPL(options.repl === true ? startREPL() : options.repl) : null;
  }

  async start() {
    const forwardOutput = this.repl ?
      this.repl.forwardOutput.bind(this.repl) : () => {};
    const setProgress = this.repl ?
      this.repl.setProgress.bind(this.repl) : () => {};
    if (existsSync('webpack.config.js')) {
      const {default: WebpackBuilder} = await import('./webpack/index.js');
      this.builder = new WebpackBuilder({
        forwardOutput,
        setProgress,
      });
    } else {
      const {default: ParcelBuilder} = await import('./parcel/index.js');
      this.builder = new ParcelBuilder({
        forwardOutput,
        setProgress,
      });
    }
  }

  exitOnClose() {
    if (this.repl) {
      this.repl.exitOnClose();
    }
  }

  private _onRequest(req: IncomingMessage, res: ServerResponse) {
    res.end('TODO\n');
  }

  private _onListen(server: Server) {
    this.repl?.setPort((server.address() as AddressInfo).port);
  }
}

async function main(argv: string[]) {
  const webl = new Webl({
    repl: process.stdin.isTTY,
  });
  webl.exitOnClose();

  const server = createServer(webl.onRequest);
  server.unref();
  server.listen(0, '127.0.0.1', webl.onListen.bind(null, server));

  await webl.start();
}

main(process.argv).catch(e => process.nextTick(() => {throw e}));
