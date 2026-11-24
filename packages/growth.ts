import {reviewEvidence} from './review.ts'
import {Store,requireValue,identifier} from './kernel.ts'

export function remember(s:Store,role:string,text:string) {
  requireValue(text.trim(),'Empty memory')
  s.record('episode',identifier(role),{text})
}
export function reflect(s:Store,role:string) {
  const events=s.events(role)
  const since=Number(events.findLast(e=>e.kind==='reflection')?.data.until || 0)
  const fresh=events.filter(e=>e.kind==='episode' && e.seq>since)
  if(!fresh.length) return
  const text=[...new Set(fresh.map(e=>e.data.text))].map(x=>'- '+x).join('\n')
  s.record('reflection',role,{text,until:String(fresh.at(-1)!.seq),sources:fresh.map(e=>e.seq).join(',')})
}
export function promote(s:Store,role:string,seq:number) {
  const events=s.events(role)
  const draft=events.find(e=>e.seq===seq && e.kind==='reflection')
  requireValue(draft && !events.some(e=>e.kind==='knowledge' && e.data.source===String(seq)),'Unknown or previously promoted reflection')
  s.record('knowledge',role,{text:draft.data.text,source:String(seq)})
}
export function rules(s:Store,role:string) {
  return JSON.parse(s.events(role).findLast(e=>e.kind==='rules')?.data.rules || '[]') as string[]
}
export function canAdoptRule(current:string[],base:string,rule:string) {
  return base===JSON.stringify(current) && !current.includes(rule)
}
export function propose(s:Store,role:string,source:number,rule:string) {
  const evidence=s.events().find(e=>e.seq===source && ['returned','blocked'].includes(e.kind))
  requireValue(evidence && s.events(evidence.id).find(e=>e.kind==='ticket')?.data.role===role,'Choose a return for this role')
  requireValue(rule.trim() && rule.length<=400 && !rule.includes('\n'),'Supply one short workflow step')
  const current=rules(s,role)
  requireValue(!current.includes(rule),'Rule already active')
  s.record('proposal',role,{source:String(source),rule,base:JSON.stringify(current)})
}
export function decide(s:Store,role:string,seq:number,report:Uint8Array) {
  const events=s.events(role)
  const p=events.find(e=>e.seq===seq && e.kind==='proposal')
  requireValue(!events.some(e=>e.kind==='rules' && e.data.proposal===String(seq)),'Proposal already adopted')
  const current=rules(s,role)
  requireValue(p && canAdoptRule(current,p.data.base,p.data.rule),'Proposal missing, duplicate or outdated')
  reviewEvidence(report,role,seq,p.data.rule)
  s.record('rules',role,{rules:JSON.stringify([...current,p.data.rule]),before:JSON.stringify(current),evidence:s.put(report),proposal:String(seq)})
}
export function rollback(s:Store,role:string) {
  const last=s.events(role).findLast(e=>e.kind==='rules')
  requireValue(last && !last.data.rollback,'No active promotion to undo')
  s.record('rules',role,{rules:last.data.before,before:last.data.rules,rollback:String(last.seq)})
}
