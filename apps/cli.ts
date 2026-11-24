#!/usr/bin/env node
import {homedir} from 'node:os'
import {join} from 'node:path'
import {readFileSync} from 'node:fs'
import {Store,requireValue} from '../packages/kernel.ts'
import {board,create,move} from '../packages/control.ts'
import {remember,reflect,promote,propose,decide,rollback} from '../packages/growth.ts'
import {approve,context,draft,graph,panel,portfolio} from '../packages/surfaces.ts'

import {deliver} from '../packages/outbox.ts'
import {intake,route} from '../packages/intake.ts'

const help=`evo-studio COMMAND [arguments]
ticket ID ROLE SCOPE TITLE [DEPENDENCY ...]
intake SOURCE EXTERNAL_ID TITLE | route TRIGGER ID ROLE SCOPE POLICY_VERSION
deliver APPROVED_HASH
board | events | attention | graph | panel
start ID VERSION ROLE
submit ID VERSION ROLE FILE
handback ID VERSION ROLE REASON
return ID VERSION manager|reviewer REASON
accept ID VERSION reviewer REVIEW
artifact HASH
remember ROLE TEXT | sleep ROLE | promote-memory ROLE EVENT
context ROLE work|companion
propose ROLE RETURN_EVENT RULE | adopt ROLE PROPOSAL_EVENT REPORT_FILE | rollback ROLE
draft DONE_TICKET portfolio|release|article TEXT | approve HASH DESTINATION | export DESTINATION
Commands use the owner's local authority. Set EVO_HOME to a private state directory.`
const [command,...args]=process.argv.slice(2)
function arg(i:number) {
  requireValue(args[i]?.trim(),'Missing argument. Use --help.')
  return args[i]
}
function run(s:Store) {
  switch(command) {
    case 'deliver': return deliver(s,process.env.EVO_HOME || join(homedir(),'.evo-studio'),arg(0))
    case 'intake': return intake(s,arg(0),arg(1),arg(2))
    case 'route':
      context(s,arg(2),'work')
      requireValue(arg(2)!=='reviewer','Choose a producing role')
      return route(s,arg(0),arg(1),arg(2),arg(3),arg(4))
    case 'ticket':
      context(s,arg(1),'work')
      requireValue(arg(1)!=='reviewer','Choose a producing role')
      return create(s,arg(0),arg(1),arg(2),arg(3),args.slice(4))
    case 'start': return move(s,arg(0),Number(arg(1)),'active',arg(2),'')
    case 'submit': return move(s,arg(0),Number(arg(1)),'review',arg(2),'',readFileSync(arg(3)))
    case 'handback': return move(s,arg(0),Number(arg(1)),'blocked',arg(2),arg(3))
    case 'return': return move(s,arg(0),Number(arg(1)),'returned',arg(2),arg(3))
    case 'accept': return move(s,arg(0),Number(arg(1)),'done',arg(2),arg(3))
    case 'artifact': return Buffer.from(s.get(arg(0)))
    case 'board': return [...board(s.events()).values()]
    case 'events': return s.events()
    case 'attention': return [...board(s.events()).values()].filter(t=>['review','blocked'].includes(t.status))
    case 'graph': return graph(s)
    case 'panel': return panel(s)
    case 'remember':
      context(s,arg(0),'work')
      return remember(s,arg(0),arg(1))
    case 'sleep': return reflect(s,arg(0))
    case 'promote-memory': return promote(s,arg(0),Number(arg(1)))
    case 'context': return context(s,arg(0),arg(1))
    case 'propose': return propose(s,arg(0),Number(arg(1)),arg(2))
    case 'adopt': return decide(s,arg(0),Number(arg(1)),readFileSync(arg(2)))
    case 'rollback': return rollback(s,arg(0))
    case 'draft': return draft(s,arg(0),arg(1),arg(2))
    case 'approve': return approve(s,arg(0),arg(1))
    case 'export': return portfolio(s,arg(0))
    default: throw new Error('Unknown command. Use --help.')
  }
}
if(!command || command==='--help') console.log(help)
else {
  const s=new Store(process.env.EVO_HOME || join(homedir(),'.evo-studio'))
  try {
    const reads=['artifact','board','events','attention','graph','panel','context','export']
    const result=s.transaction(()=>run(s),reads.includes(command)?'read':'write')
    if(Buffer.isBuffer(result)) process.stdout.write(result)
    else if(result!==undefined) console.log(typeof result==='string'?result:JSON.stringify(result,null,2))
  } catch(error) {
    console.error(error instanceof Error?error.message:'Command failed')
    process.exitCode=1
  } finally { s.db.close() }
}
