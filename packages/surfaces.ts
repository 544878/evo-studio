import {readFileSync} from 'node:fs'
import {Store,digest,identifier,requireValue} from './kernel.ts'
import {board} from './control.ts'
import {canAdoptRule,rules} from './growth.ts'

export const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export function context(s:Store,role:string,mode:string) {
  identifier(role)
  requireValue(['work','companion'].includes(mode),'Choose work or companion')
  const policy=readFileSync(new URL('../roles/'+role+'/'+(mode==='work'?'WORK':'SOUL')+'.md',import.meta.url),'utf8')
  return mode==='work' ? {policy,steps:rules(s,role)} : {policy,memories:s.events(role).filter(e=>e.kind==='episode').slice(-5).map(e=>e.data.text)}
}
export function draft(s:Store,id:string,destination:string,text:string) {
  requireValue(board(s.events()).get(id)?.status==='done','Select a reviewed ticket')
  requireValue(['portfolio','article','release'].includes(destination),'Invalid destination')
  requireValue(text.trim() && !/(?:[\w.+-]+@[\w.-]+\.[a-z]{2,}|\/(?:Users|home)\/|[A-Z]:\\Users\\|-----BEGIN .*PRIVATE KEY|(?:sk-|ghp_|github_pat_)[\w-]{12,})/i.test(text),'Review text for private information')
  const key=digest(JSON.stringify([id,destination,text]))
  if(!s.events(key).length) s.record('draft',key,{id,destination,text})
  return key
}
export function approve(s:Store,key:string,destination:string) {
  const events=s.events(key)
  requireValue(events.length===1 && events[0].kind==='draft' && events[0].data.destination===destination,'Draft or destination mismatch')
  s.record('approved',key,{destination})
}
export function portfolio(s:Store,destination:string) {
  const events=s.events()
  const allowed=new Set(events.filter(e=>e.kind==='approved' && e.data.destination===destination).map(e=>e.id))
  return events.filter(e=>e.kind==='draft' && allowed.has(e.id)).map(e=>destination==='portfolio' ? '<article><p>'+escape(e.data.text)+'</p></article>' : e.data.text).join('\n\n')
}
export function graph(s:Store) {
  const lines=['flowchart TD']
  for(const task of board(s.events()).values()) {
    lines.push('  t_'+task.id+'["'+task.id+' · '+task.status+'"]')
    for(const dep of task.deps) lines.push('  t_'+dep+' --> t_'+task.id)
  }
  return lines.join('\n')
}
export function panel(s:Store) {
  const events=s.events()
  const tasks=[...board(events).values()].map(({id,status,deps})=>({id,status,deps}))
  const waiting=tasks.filter(t=>['blocked','review'].includes(t.status))
  const resolved=new Set(events.flatMap(e=>{
    if(e.kind==='knowledge') return [Number(e.data.source)]
    if(e.kind==='rules' && e.data.proposal) return [Number(e.data.proposal)]
    return []
  }))
  const currentRules=new Map<string,string[]>()
  for(const e of events) if(e.kind==='rules') currentRules.set(e.id,JSON.parse(e.data.rules))
  const pending=events.filter(e=>!resolved.has(e.seq) && (e.kind==='reflection' ||
    (e.kind==='proposal' && canAdoptRule(currentRules.get(e.id) || [],e.data.base,e.data.rule))))
  const show=(v:unknown)=>'<pre>'+escape(JSON.stringify(v,null,2))+'</pre>'
  return '<!doctype html><html lang="en"><meta charset="utf-8"><title>Studio desk</title><main><h1>Studio desk</h1><h2>Needs attention</h2>'+show(waiting)+'<h2>Dependencies</h2>'+show(tasks)+'<h2>Workflow and memory review</h2><p>Pending items: '+pending.length+'</p></main></html>'
}
