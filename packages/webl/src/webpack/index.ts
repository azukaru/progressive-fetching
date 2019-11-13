import {fork, ChildProcess} from 'child_process';
import {fileURLToPath} from 'url';

interface BuilderOptions {
  setProgress(progress: number): void;
  forwardOutput(name: string, worker: ChildProcess): void;
}

export default class WebpackBuilder {
  private worker: ChildProcess;

  constructor(options: BuilderOptions) {
    const workerURL = new URL('./worker.js', import.meta.url);
    this.worker = fork(fileURLToPath(workerURL.href), [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });
    this.worker.unref();
    options.forwardOutput('webpack', this.worker);

    this.worker.on('message', (message) => {
      if (message.type === 'webl.builder.progress') {
        options.setProgress(message.progress);
      }
    });
  }
}
