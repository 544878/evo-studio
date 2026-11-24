#!/usr/bin/env node
import {spawn} from 'node:child_process'
import {join} from 'node:path'
import {homedir} from 'node:os'
import {Store,requireValue} from '../packages/kernel.ts'
import {board,isTicketEvent,move} from '../packages/control.ts'
import {context} from '../packages/surfaces.ts'

async function execute(command:string,args:string[],input:string):Promise<Buffer> {
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{stdio:['pipe','pipe','inherit'],timeout:120000,killSignal:'SIGKILL'})
    const parts:Buffer[]=[]
    let size=0
    child.stdout.on('data',(part:Buffer)=>{
      size+=part.length
      if(size>8*1024*1024) child.kill('SIGKILL')
      else parts.push(part)
    })
    child.stdin.on('error',()=>{})
    child.on('error',reject)
    child.on('close',code=>code===0 && parts.length && size<=8*1024*1024 ? resolve(Buffer.concat(parts)) : reject(new Error('Executor failed or output was empty or too large')))
    child.stdin.end(input)
  })
}
const [id,command,...args]=process.argv.slice(2)
requireValue(id && command,'Usage: node apps/worker.ts TICKET EXECUTABLE [ARG ...]')
const s=new Store(process.env.EVO_HOME || join(homedir(),'.evo-studio'))
try {
  const task=s.transaction(()=>{
    const current=board(s.events()).get(id)
    requireValue(current,'Unknown ticket')
    move(s,id,current.version,'active',current.role,'')
    return board(s.events()).get(id)!
  })
  try {
    const input={
      ticket:task,
      context:context(s,task.role,'work'),
      history:s.events(id).filter(isTicketEvent),
      dependencies:task.deps.map(dep=>board(s.events()).get(dep))
    }
    const bytes=await execute(command,args,JSON.stringify(input))
    s.transaction(()=>move(s,id,task.version,'review',task.role,'',bytes))
  } catch(error) {
    s.transaction(()=>{
      if(board(s.events()).get(id)?.version===task.version) move(s,id,task.version,'blocked',task.role,'Executor interrupted. Review before retry.')
    })
    throw error
  }
} finally {s.db.close()}
