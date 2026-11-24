import {spawnSync} from 'node:child_process'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import assert from 'node:assert/strict'

const home=mkdtempSync(join(tmpdir(),'studio-check-'))
function run(args:string[],status=0,entry='apps/cli.ts') {
  const p=spawnSync(process.execPath,[entry,...args],{env:{...process.env,EVO_HOME:home},encoding:'utf8'})
  assert.equal(p.status,status,p.stderr)
  return p.stdout.trim()
}
try {
  run(['ticket','intro','motion','film','Render an opener'])
  run(['ticket','archive','curator','library','Archive approved opener','intro'])
  run(['start','archive','2','curator'],1)
  run(['intro',process.execPath,'profiles/demo/render.ts'],0,'apps/worker.ts')
  const task=JSON.parse(run(['attention']))[0]
  assert.match(run(['artifact',task.hash]),/<svg/)
  run(['accept','intro',String(task.version),'motion','Looks fine'],1)
  run(['accept','intro',String(task.version),'reviewer','Inspected opener'])
  const receipt=JSON.parse(run(['events'])).find((e:{kind:string})=>e.kind==='done')
  assert.equal(receipt.data.hash,task.hash)
  assert.equal(receipt.data.submissionVersion,String(task.version))
  run(['start','archive','2','curator'])
  const hash=run(['draft','intro','portfolio','A reviewed motion study.'])
  assert.equal(run(['export','portfolio']),'')
  run(['approve',hash,'release'],1)
  run(['approve',hash,'portfolio'])
  assert.match(run(['export','portfolio']),/motion study/)
  run(['remember','motion','Synthetic private journal entry'])
  run(['sleep','motion'])
  run(['ticket','motion','motion','titles','Prepare a title'])
  run(['motion',process.execPath,'-e','process.stdin.pipe(process.stdout)'],0,'apps/worker.ts')
  const sameName=JSON.parse(run(['attention'])).find((task:{id:string})=>task.id==='motion')
  const payload=JSON.parse(run(['artifact',sameName.hash]))
  assert.deepEqual(payload.history.map((event:{kind:string})=>event.kind),['ticket','active'])
  assert.ok(!JSON.stringify(payload).includes('Synthetic private journal entry'))
  const desk=run(['panel'])
  assert.ok(desk.includes('Pending items: 1'))
  assert.ok(!desk.includes('Synthetic private journal entry'))
  assert.ok(!desk.includes('Prepare a title'))
  console.log(JSON.stringify({scenario:'reviewed motion artifact',result:'passed'}))
} finally {rmSync(home,{recursive:true,force:true})}
