=> Cloning from https://github.com/ankaderler/newankabotsms
==> Checking out commit b526f5e4b6e066a707b823ae11df3ef0265ca6bd in branch main
==> Using Node.js version 24.21.0 (default)
==> Docs on specifying a Node.js version: https://render.com/docs/node-version
==> Running build command 'npm install'...
added 100 packages, and audited 101 packages in 4s
18 packages are looking for funding
  run `npm fund` for details
found 0 vulnerabilities
==> Uploading build...
==> Uploaded in 1.6s. Compression took 0.1s
==> Build successful 🎉
==> Deploying...
==> Setting WEB_CONCURRENCY=1 by default, based on available CPUs in the instance
==> Running 'node server.js'
Panel 10000 portunda başarıyla çalışıyor...
/opt/render/project/src/node_modules/node-fetch/lib/index.js:1501
			reject(new FetchError(`request to ${request.url} failed, reason: ${err.message}`, 'system', err));
			       ^
FetchError: request to https://api.telegram.org/bot8874989367:[REDACTED]/getMe failed, reason: 
    at ClientRequest.<anonymous> (/opt/render/project/src/node_modules/node-fetch/lib/index.js:1501:11)
    at ClientRequest.emit (node:events:514:28)
    at emitErrorEvent (node:_http_client:114:11)
    at TLSSocket.socketErrorListener (node:_http_client:766:5)
    at TLSSocket.emit (node:events:514:28)
    at emitErrorNT (node:internal/streams/destroy:170:8)
    at emitErrorCloseNT (node:internal/streams/destroy:129:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21) {
  type: 'system',
  errno: 'ETIMEDOUT',
  code: 'ETIMEDOUT'
}
Node.js v24.21.0
==> Exited with status 1
==> Common ways to troubleshoot your deploy
