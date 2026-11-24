import {Store} from '../packages/kernel.ts'
import {reflect} from '../packages/growth.ts'
import {mkdirSync,writeFileSync,renameSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {homedir} from 'node:os'
import {join} from 'node:path'

const home=process.env.EVO_HOME || join(homedir(),'.evo-studio')
const s=new Store(home)
function write(dir:string,name:string,content:string) {
  mkdirSync(dir,{recursive:true,mode:0o700})
  const temp=join(dir,randomUUID()+'.tmp')
  writeFileSync(temp,content,{mode:0o600})
  renameSync(temp,join(dir,name))
}
function consolidate() {
  s.transaction(()=>{
    const events=s.events()
    const roles=new Set(events.filter(e=>e.kind==='episode').map(e=>e.id))
    const vault=join(home,'knowledge')
    const index=[]
    for(const role of roles) {
      reflect(s,role)
      const notes=s.events(role).filter(e=>e.kind==='knowledge')
      if(!notes.length) continue
      write(vault,role+'.md','# '+role+'\n\n'+notes.map(e=>e.data.text+'\n\nSource event '+e.data.source).join('\n\n'))
      index.push('- [['+role+']]')
    }
    write(join(vault,'_ai'),'index.md',index.join('\n')+'\n')
    const week=Date.now()-7*86400000
    const recent=events.filter(e=>Date.parse(e.at)>=week && ['episode','done','returned'].includes(e.kind))
    write(home,'week.md','# Weekly record\n\n'+recent.map(e=>'- '+e.at.slice(0,10)+' · '+e.id+' · '+(e.data.text || e.data.note)+' (event '+e.seq+')').join('\n'))
  })
}
if(process.argv.includes('--nightly')) {
  for(;;) {
    const next=new Date()
    next.setHours(2,0,0,0)
    if(+next<=Date.now()) next.setDate(next.getDate()+1)
    await new Promise(resolve=>setTimeout(resolve,Math.max(0,+next-Date.now())))
    try {consolidate()} catch {console.error('Nightly consolidation failed. Check the private state directory.')}
  }
} else {
  try {consolidate()} finally {s.db.close()}
}
