// @ts-ignore
import Document, {Html, Head, Main, NextScript} from 'next/document';
// @ts-ignore
import React from 'react';

function toChunkNames(props: any) {
  const {page} = props.__NEXT_DATA__;
  return ['_app', page.replace(/^\//, '')]
    .map(name => encodeURIComponent(name))
    .join(',');
}

function HackyNextScript(props: any) {
  return <>
    <script
      id="__NEXT_DATA__"
      type="application/json"
      nonce={props.nonce}
      crossOrigin={props.crossOrigin || (process as any).crossOrigin}
      dangerouslySetInnerHTML={{
        __html: NextScript.getInlineScriptSource(props),
      }}
    />
    <script async src = {`/api/chunks/js/n=${toChunkNames(props)}`}></script>
  </>;
}

class BundleDocument extends Document {
  render() {
    return (
      <Html>
      {/* TODO: We still preload the wrong files and don't preload the batch */}
      <Head />
      <body>
        <Main />
        {/* <NextScript /> */}
        <HackyNextScript {...(this as any).props} />
      </body>
      </Html>
    );
  }
}
(BundleDocument as any).contextType = Document.contextType;

export default Document;
