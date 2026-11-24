import {createServer} from 'node:http'
import {join} from 'node:path'
import {homedir} from 'node:os'
import {Store} from '../packages/kernel.ts'
import {panel} from '../packages/surfaces.ts'

const s=new Store(process.env.EVO_HOME || join(homedir(),'.evo-studio'))
const server=createServer((req,res)=>{
  if(req.method!=='GET' || req.url!=='/' || req.headers.host!=='127.0.0.1:'+req.socket.localPort) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'none'; frame-ancestors 'none'",'x-content-type-options':'nosniff'})
  res.end(s.transaction(()=>panel(s),'read'))
})
const port=Number(process.env.EVO_PORT || 4173)
server.listen(port,'127.0.0.1',()=>{
  const address=server.address()
  if(address && typeof address==='object') console.log('Studio desk: http://127.0.0.1:'+address.port)
})
server.on('close',()=>s.db.close())
