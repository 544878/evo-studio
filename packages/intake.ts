import {Store,requireValue,digest} from './kernel.ts'
import {create,board} from './control.ts'

export function intake(s:Store,source:string,externalId:string,title:string) {
  requireValue(['issue','comment','journal','manual'].includes(source),'Unknown source')
  requireValue(externalId.trim() && title.trim(),'Source identifier and title required')
  const key=digest(JSON.stringify([source,externalId]))
  if(!s.events(key).length) s.record('trigger',key,{source,externalId,title})
  return key
}
export function route(s:Store,key:string,id:string,role:string,scope:string,policy:string) {
  const events=s.events(key)
  requireValue(events.length===1 && events[0].kind==='trigger' && policy.trim(),'Open trigger and policy revision required')
  requireValue(!board(s.events()).has(id),'Ticket already exists')
  create(s,id,role,scope,events[0].data.title,[])
  s.record('mandate',key,{id,role,scope,policy})
}
