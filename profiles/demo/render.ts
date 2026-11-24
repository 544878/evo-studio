const chunks:Buffer[]=[]
for await(const chunk of process.stdin) chunks.push(Buffer.from(chunk))
const input=JSON.parse(Buffer.concat(chunks).toString())
const title=String(input.ticket.id).replace(/[^a-z0-9-]/g,'')
process.stdout.write('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#182126"/><text x="48" y="180" fill="white" font-size="44">'+title+'</text></svg>')
export {}
