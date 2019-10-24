import Document, { Html, Head, Main, NextScript } from 'next/document';

function toChunkNames(props) {
  const {page} = props.__NEXT_DATA__;
  return ['_app', page.replace(/^\//, '')].join(',');
}

function HackyNextScript(props) {
  return <>
    <script
      id="__NEXT_DATA__"
      type="application/json"
      nonce={props.nonce}
      crossOrigin={props.crossOrigin || process.crossOrigin}
      dangerouslySetInnerHTML={{
        __html: NextScript.getInlineScriptSource(props),
      }}
    />
    <script async src={`/api/chunks?chunkNames=${toChunkNames(props)}`}></script>
  </>;
}

class MyDocument extends Document {
  render() {
    return (
      <Html>
        {/* TODO: We still preload the wrong files and don't preload the batch */}
        <Head />
        <body>
          <Main />
          {/* <NextScript /> */}
          <HackyNextScript {...this.props} />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
