import {requireValue,digest} from './kernel.ts'

export type Check={name:string,expected:string,actual:string}
export function reviewEvidence(bytes:Uint8Array,role:string,proposal:number,rule:string) {
  const report=JSON.parse(Buffer.from(bytes).toString('utf8'))
  requireValue(report.role===role && report.proposal===proposal && report.ruleDigest===digest(rule),'Report targets a different proposal')
  requireValue(report.reviewer==='reviewer' && report.reviewer!==role,'Independent reviewer required')
  requireValue(Array.isArray(report.checks) && report.checks.length>0,'Missing regression observations')
  for(const check of report.checks as Check[]) {
    requireValue(check && typeof check.name==='string' && check.name.trim() && typeof check.expected==='string' && check.expected.length && check.expected===check.actual,'Regression evidence failed')
  }
}
