export interface ScalarOptions {
  proxy?: boolean | string
}

function scalar(url: string, options: ScalarOptions = {}) {
  const proxyUrl = typeof options.proxy === 'string' ? options.proxy : 'https://proxy.scalar.com'

  return `<!doctype html>
    <html>
      <head>
        <title>API Reference</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <script
          id="api-reference"
          data-url="${url}"
          ${options.proxy ? 'data-proxy-url="' + proxyUrl + '"' : ''}></script>
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
      </body>
    </html>`
}

export const ui = {
  scalar,
}
