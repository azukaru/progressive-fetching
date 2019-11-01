import path from 'path';
import { makeFinegrained } from '../assembler/webpack';
const config = {
    context: __dirname,
    entry: {
        'page-a': './app/page-a.js',
        'page-b': './app/page-b.js',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/assets/',
    },
    optimization: {
        // Optionally, set runtime chunk.
        runtimeChunk: 'single',
    },
    devServer: {
        contentBase: path.resolve(__dirname, 'static'),
    },
};
export default makeFinegrained(config);
