import {linkSync,unlinkSync,readFileSync,writeFileSync,mkdirSync,openSync,closeSync,fsyncSync} from 'node:fs'
import {join} from 'node:path'
import {randomUUID} from 'node:crypto'
import {Store,digest,requireValue} from './kernel.ts'
import {escape} from './surfaces.ts'

export function deliver(s:Store,root:string,key:string) {
  const events=s.events(key)
  const draft=events.find(e=>e.kind==='draft')
  requireValue(draft && events.some(e=>e.kind==='approved' && e.data.destination===draft.data.destination),'Approval required')
  const {destination,text}=draft.data
  const content=destination==='portfolio' ? '<article><p>'+escape(text)+'</p></article>\n' : text+'\n'
  const dir=join(root,'outbox',destination)
  mkdirSync(dir,{recursive:true,mode:0o700})
  const target=join(dir,key+(destination==='portfolio'?'.html':'.txt'))
  const tmp=join(dir,randomUUID()+'.tmp')
  const fd=openSync(tmp,'wx',0o600)
  try {
    try {writeFileSync(fd,content);fsyncSync(fd)} finally {closeSync(fd)}
    try {linkSync(tmp,target)} catch(error) {
      if((error as NodeJS.ErrnoException).code!=='EEXIST') throw error
    }
    requireValue(digest(readFileSync(target))===digest(content),'Existing delivery differs from approved bytes')
    const parent=openSync(dir,'r')
    try {fsyncSync(parent)} finally {closeSync(parent)}
    if(!events.some(e=>e.kind==='delivered')) s.record('delivered',key,{destination,hash:digest(content)})
    return target
  } finally {unlinkSync(tmp)}
}
