export const MAX_IMAGE=2*1024*1024;
export function validateTicket(input){
  if(!input || typeof input!=='object')throw Error('Invalid request.');
  const limits={license:100,company:160,email:254,product:40,problem:4000,requestId:100};
  const ticket={};
  for(const [key,max] of Object.entries(limits)){
    if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>max)throw Error('Please check '+key+'.');
    ticket[key]=input[key].trim();
  }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ticket.email)||/[\r\n]/.test(ticket.email))throw Error('Enter a valid reply email.');
  if(!['TaxPower GST','TaxPower GST Billing','TaxPower TDS'].includes(ticket.product))throw Error('Choose a valid product.');
  if(!/^[a-zA-Z0-9-]{8,100}$/.test(ticket.requestId))throw Error('Invalid request identifier.');
  if(input.screenshot){
    const f=input.screenshot;
    if(!['image/png','image/jpeg'].includes(f.type)||typeof f.base64!=='string'||f.base64.length>Math.ceil(MAX_IMAGE/3)*4||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(f.base64))throw Error('Screenshot must be PNG/JPEG, up to 2 MB.');
    const bytes=Buffer.from(f.base64,'base64');
    const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
    if(!bytes.length||bytes.length>MAX_IMAGE||(f.type==='image/png'?!png:!jpg))throw Error('Invalid screenshot image.');
    ticket.attachment={filename:f.type==='image/png'?'support-screenshot.png':'support-screenshot.jpg',content:bytes,contentType:f.type};
  }
  return ticket;
}
