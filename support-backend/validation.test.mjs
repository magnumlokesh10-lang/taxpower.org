import test from 'node:test';import assert from 'node:assert/strict';import {validateTicket} from './validation.mjs';
const base={license:'ABC-123',company:'Demo Company',email:'customer@example.com',product:'TaxPower GST',problem:'Cannot open the return.',requestId:'12345678-test'};
test('valid ticket retains required details',()=>{assert.equal(validateTicket(base).company,'Demo Company');});
test('required details and reply email validated',()=>{for(const key of ['license','company','email','problem'])assert.throws(()=>validateTicket({...base,[key]:''}));assert.throws(()=>validateTicket({...base,email:'a@b.com\r\nBcc:bad@evil.com'}));});
test('unsupported product and invalid screenshot rejected',()=>{assert.throws(()=>validateTicket({...base,product:'Other'}));assert.throws(()=>validateTicket({...base,screenshot:{type:'image/png',base64:Buffer.from('not an image').toString('base64')}}));});
test('PNG bytes produce private email attachment',()=>{const t=validateTicket({...base,screenshot:{type:'image/png',base64:'iVBORw0KGgo='}});assert.equal(t.attachment.filename,'support-screenshot.png');});
test('oversize image and long problem rejected',()=>{assert.throws(()=>validateTicket({...base,problem:'x'.repeat(4001)}));assert.throws(()=>validateTicket({...base,screenshot:{type:'image/jpeg',base64:'A'.repeat(3000000)}}));});
