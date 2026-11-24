import {Store,identifier,requireValue} from './kernel.ts'
import type {Entry} from './kernel.ts'

const transitions=new Set(['active','review','done','returned','blocked'])

export function isTicketEvent(event:Entry) {
  return event.kind==='ticket' || transitions.has(event.kind)
}

export function board(events:Entry[]) {
  const tasks=new Map<string,{id:string,role:string,scope:string,deps:string[],status:string,version:number,hash:string,title:string,detail:string}>()
  for (const e of events) {
    if(e.kind==='ticket') tasks.set(e.id,{id:e.id,role:e.data.role,scope:e.data.scope,deps:JSON.parse(e.data.deps),status:'ready',version:e.seq,hash:'',title:e.data.title,detail:e.data.title})
    const t=tasks.get(e.id)
    if(t && transitions.has(e.kind)) {
      t.status=e.kind
      t.version=e.seq
      t.hash=e.kind==='done' ? e.data.hash || t.hash : e.data.hash || ''
      t.detail=e.data.note || t.title
    }
  }
  return tasks
}
export function create(s:Store,id:string,role:string,scope:string,title:string,deps:string[]) {
  identifier(id)
  identifier(role)
  requireValue(scope.split('/').every(x=>/^[a-z0-9_-]+$/.test(x)),'Invalid work scope')
  const tasks=board(s.events())
  requireValue(!tasks.has(id) && title.trim() && deps.every(d=>tasks.has(d)),'Duplicate ticket, missing title or unknown dependency')
  s.record('ticket',id,{role,scope,title,deps:JSON.stringify(deps)})
}
export function move(s:Store,id:string,version:number,state:string,actor:string,note:string,bytes?:Uint8Array) {
  const tasks=board(s.events())
  const t=tasks.get(id)
  requireValue(t && t.version===version,'Missing ticket or stale version')
  const worker=actor===t.role
  if(state==='active') {
    requireValue(worker && ['ready','returned'].includes(t.status),'Ticket cannot start')
    requireValue(t.deps.every(d=>tasks.get(d)?.status==='done'),'Dependency still open')
    for(const b of tasks.values()) if(b.status==='active') {
      requireValue(!(b.scope===t.scope || b.scope.startsWith(t.scope+'/') || t.scope.startsWith(b.scope+'/')),'Work scope in use')
    }
  } else if(state==='review') {
    requireValue(worker && t.status==='active' && bytes && bytes.length,'Active worker and artifact required')
    s.record(state,id,{actor,hash:s.put(bytes)})
    return
  } else if(state==='blocked') requireValue(worker && t.status==='active' && note.trim(),'Handback requires a reason')
  else if(state==='returned') requireValue(note.trim() && ((t.status==='review' && actor==='reviewer' && !worker) || (t.status==='blocked' && actor==='manager')),'Invalid return decision')
  else if(state==='done') {
    requireValue(actor==='reviewer' && !worker && t.status==='review' && note.trim(),'Independent review required')
    s.get(t.hash)
    s.record(state,id,{actor,note,hash:t.hash,submissionVersion:String(t.version)})
    return
  } else throw new Error('Unknown state')
  s.record(state,id,{actor,note})
}
