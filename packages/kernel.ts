import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

export type Fields = Record<string, string>
export type Entry = {seq:number, at:string, kind:string, id:string, data:Fields}
export const digest = (value:Uint8Array|string) => createHash('sha256').update(value).digest('hex')
export function requireValue(ok:unknown, message:string): asserts ok {
  if (!ok) throw new Error(message)
}
export function identifier(value:string) {
  requireValue(/^[a-z][a-z0-9-]{0,63}$/.test(value), 'Expected a short lowercase identifier')
  return value
}
export class Store {
  db:DatabaseSync
  constructor(home:string) {
    mkdirSync(home,{recursive:true,mode:0o700})
    this.db = new DatabaseSync(join(home,'studio.sqlite'))
    this.db.exec(`PRAGMA busy_timeout=5000;
      PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY, at TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS blobs(hash TEXT PRIMARY KEY, bytes BLOB NOT NULL);`)
  }
  transaction<T>(run:()=>T,mode:'read'|'write'='write'):T {
    this.db.exec(mode==='read'?'BEGIN':'BEGIN IMMEDIATE')
    try {
      const result=run()
      this.db.exec('COMMIT')
      return result
    } catch(error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }
  events(id?:string):Entry[] {
    const rows=id===undefined ? this.db.prepare('SELECT * FROM events ORDER BY seq').all()
      : this.db.prepare('SELECT * FROM events WHERE id=? ORDER BY seq').all(id)
    return rows.map(row=>({seq:Number(row.seq),at:String(row.at),kind:String(row.kind),id:String(row.id),data:JSON.parse(String(row.data))}))
  }
  record(kind:string,id:string,data:Fields={}) {
    this.db.prepare('INSERT INTO events(at,kind,id,data) VALUES(?,?,?,?)').run(new Date().toISOString(),kind,id,JSON.stringify(data))
  }
  put(bytes:Uint8Array) {
    const hash=digest(bytes)
    this.db.prepare('INSERT OR IGNORE INTO blobs VALUES(?,?)').run(hash,bytes)
    return hash
  }
  get(hash:string) {
    const bytes=this.db.prepare('SELECT bytes FROM blobs WHERE hash=?').get(hash)?.bytes
    requireValue(bytes instanceof Uint8Array && digest(bytes)===hash,'Artifact missing or changed')
    return bytes
  }
}
