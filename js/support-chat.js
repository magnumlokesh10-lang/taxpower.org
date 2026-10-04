(() => {
  if (document.getElementById('tp-support-widget')) return;
  // Set to your deployed HTTPS backend URL to enable in-page email submission.
  const endpoint = window.TAXPOWER_SUPPORT_ENDPOINT || '';
  const email = 'info@magnuminfosystem.com';
  const root = document.createElement('div');
  root.id = 'tp-support-widget';
  root.innerHTML = `<button class="tp-chat-launch" type="button" aria-expanded="false" aria-controls="tp-chat-panel"><span class="tp-launch-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 17 3 21l6-2h9a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 2 3Z"/><path d="M7 8h10M7 12h7"/></svg></span><span class="tp-launch-label">Technical Support<small>How can we help?</small></span></button>
  <section id="tp-chat-panel" class="tp-chat-panel" role="dialog" aria-modal="true" aria-labelledby="tp-chat-title" hidden>
  <header><div><strong id="tp-chat-title">TaxPower technical support</strong><small>Support assistant · Automated</small></div><button type="button" class="tp-chat-close" aria-label="Close support assistant">×</button></header>
  <div class="tp-chat-body"><div class="tp-chat-greeting">Hello! 👋 I’ll help you raise a technical support request with Magnum. First, let’s get your details.</div><div class="tp-chat-transcript" role="log" aria-label="Support conversation"></div><div class="tp-chat-content"></div></div><div class="tp-chat-composer"></div><p class="tp-chat-status" role="status" aria-live="polite"></p>
  <footer><a class="tp-chat-gmail" href="https://mail.google.com/mail/?view=cm&amp;fs=1&amp;to=support%40taxpower.org" target="_blank" rel="noopener noreferrer"><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 6 9 7 9-7"/></svg><span>Email support<small>Open in Gmail</small></span><span aria-hidden="true">↗</span></a></footer></section>`;
  document.body.appendChild(root);
  const panel=root.querySelector('.tp-chat-panel'), content=root.querySelector('.tp-chat-content'), status=root.querySelector('.tp-chat-status'), launch=root.querySelector('.tp-chat-launch');
  const composer=root.querySelector('.tp-chat-composer'), chatBody=root.querySelector('.tp-chat-body');
  function scrollChat(){requestAnimationFrame(()=>{chatBody.scrollTop=chatBody.scrollHeight;});}
  const fields=[
    {key:'license',label:'What is your Customer / License ID?',hint:'You can find it in your TaxPower licence or registration details.',max:100},
    {key:'company',label:'What is your company name?',max:160},
    {key:'email',label:'Which email can the team reply to?',type:'email',max:254},
    {key:'product',label:'Which software do you need help with?',type:'select'},
    {key:'problem',label:'What problem are you facing?',hint:'Include the error message and what you were doing when it occurred.',type:'textarea',max:4000},
    {key:'screenshot',label:'Add an error screenshot',hint:'Optional: PNG or JPEG, up to 2 MB. Hide passwords, OTPs and unrelated customer data.',type:'file'}
  ];
  let step=0, data={}, screenshot=null, preview='', busy=false, returnFocus=null, editing=false, transitioning=false, sentMessage='';
  const requestId=()=>globalThis.crypto?.randomUUID?.() || Date.now()+'-'+Math.random().toString(16).slice(2);
  let id=requestId();
  const setStatus=message=>status.textContent=message;
  function show(){returnFocus=document.activeElement;panel.hidden=false;launch.setAttribute('aria-expanded','true');if(!busy&&!transitioning)render();}
  function hide(){panel.hidden=true;launch.setAttribute('aria-expanded','false');(returnFocus?.isConnected?returnFocus:launch).focus();}
  launch.addEventListener('click',()=>panel.hidden?show():hide());
  root.querySelector('.tp-chat-close').addEventListener('click',hide);
  document.addEventListener('click',e=>{if(e.target.closest('[data-support-chat]')){e.preventDefault();show();}});
  panel.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();hide();}
    if(e.key==='Tab') {const items=[...panel.querySelectorAll('button:not(:disabled),a,input,select,textarea')].filter(el=>el.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
  function button(text,fn,secondary=false){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=secondary?'tp-chat-secondary':'tp-chat-primary';b.addEventListener('click',fn);return b;}
  function reset(){sentMessage='';if(preview)URL.revokeObjectURL(preview);preview='';data={};screenshot=null;step=0;editing=false;id=requestId();render();}
  function bubble(text,who='assistant'){
    const item=document.createElement('div');item.className='tp-chat-message tp-chat-'+who;
    const name=document.createElement('small');name.textContent=who==='user'?'You':'TaxPower assistant';
    const body=document.createElement('div');body.textContent=text;item.append(name,body);return item;
  }
  function conversation(){
    const log=root.querySelector('.tp-chat-transcript');log.replaceChildren();
    for(let i=0;i<Math.min(step,fields.length);i++){
      const f=fields[i];log.append(bubble(f.label),bubble(f.type==='file'?(screenshot?'Screenshot attached: '+screenshot.name:'Skip screenshot'):data[f.key]||'','user'));
    }
  }
  function render(){
    content.replaceChildren();composer.replaceChildren();setStatus('');conversation();
    if(sentMessage){content.append(bubble(sentMessage),button('New request',reset,true));return;}
    if(step===fields.length){content.append(bubble('Thanks! Here’s your request summary. Check the details, then submit it here.'));summary();return;}
    const field=fields[step], form=document.createElement('form'), label=document.createElement('label');label.htmlFor='tp-chat-answer';label.textContent=field.label;label.className='tp-chat-sr-only';form.append(label);root.querySelector('.tp-chat-transcript').append(bubble(field.label));
    let input=document.createElement(field.type==='textarea'?'textarea':field.type==='select'?'select':'input');input.id='tp-chat-answer';input.name=field.key;if(!['select','file'].includes(field.type))input.placeholder=field.key==='problem'?'Describe your issue…':'Type your reply…';
    if(field.type==='select'){for(const text of ['TaxPower GST','TaxPower GST Billing','TaxPower TDS']){const o=document.createElement('option');o.value=text;o.textContent=text;input.append(o);}}
    else if(field.type==='file'){input.type='file';input.accept='image/png,image/jpeg';}
    else {if(field.type!=='textarea')input.type=field.type||'text';input.maxLength=field.max;input.required=true;}
    if(field.type!=='file')input.value=data[field.key]||(field.type==='select'?'TaxPower GST':'');
    if(field.key==='email')input.autocomplete='email';if(field.key==='company')input.autocomplete='organization';
    form.append(input);
    const hint=document.createElement('p');hint.className='tp-chat-hint';hint.id='tp-chat-hint';hint.textContent=field.hint||'';input.setAttribute('aria-describedby',hint.id);form.append(hint);
    if(field.type==='file'&&screenshot){const selected=document.createElement('p');selected.textContent='Selected: '+screenshot.name;form.append(selected,button('Remove screenshot',()=>{URL.revokeObjectURL(preview);preview='';screenshot=null;render();},true));}
    const actions=document.createElement('div');actions.className='tp-chat-actions';if(step>0)actions.append(button('‹',()=>{if(field.type!=='file')data[field.key]=input.value.trim();step--;render();},true));
    const next=button(editing?'Save':step===fields.length-1?'Review':'Send ↑',()=>{});next.type='submit';actions.append(next);form.append(actions);composer.append(form);
    form.addEventListener('submit',async e=>{e.preventDefault();if(busy||transitioning)return;setStatus('');if(!form.reportValidity())return;
      if(field.type==='file'&&input.files[0]){
        const f=input.files[0];if(f.size>2*1024*1024||!['image/png','image/jpeg'].includes(f.type)){setStatus('Choose a PNG or JPEG screenshot smaller than 2 MB.');return;}
        const bytes=new Uint8Array(await f.slice(0,8).arrayBuffer());const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
        if((f.type==='image/png'&&!png)||(f.type==='image/jpeg'&&!jpg)){setStatus('This file is not a valid PNG or JPEG image.');return;}
        if(preview)URL.revokeObjectURL(preview);screenshot=f;preview=URL.createObjectURL(f);
      }else if(field.type!=='file'){if(!input.value.trim()){setStatus('Please enter this detail.');input.focus();return;}data[field.key]=input.value.trim();}
      id=requestId();
      const log=root.querySelector('.tp-chat-transcript');
      log.append(bubble(field.type==='file'?(screenshot?'Screenshot attached: '+screenshot.name:'Skip screenshot'):data[field.key],'user'));
      transitioning=true;composer.replaceChildren();content.replaceChildren();const typing=bubble('Typing…');typing.classList.add('tp-chat-typing');content.append(typing);scrollChat();
      setTimeout(()=>{transitioning=false;step=editing?fields.length:step+1;editing=false;render();},350);
    });input.focus({preventScroll:true});scrollChat();
  }
  function summary(){
    const dl=document.createElement('dl');dl.className='tp-chat-summary';
    fields.slice(0,-1).forEach((field,i)=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent={license:'Customer / License ID',company:'Company',email:'Reply email',product:'Software',problem:'Problem'}[field.key];dd.textContent=data[field.key];row.append(dt,dd,button('Edit',()=>{step=i;editing=true;render();},true));dl.append(row);});content.append(dl);
    if(screenshot){const img=document.createElement('img');img.src=preview;img.alt='Your selected support screenshot';img.className='tp-chat-preview';content.append(img);}
    content.append(button(screenshot?'Change screenshot':'Add screenshot',()=>{step=5;editing=true;render();},true));
    const note=document.createElement('p');note.className='tp-chat-hint';note.textContent=endpoint?'Your details and screenshot will be sent to Magnum support. Replies will arrive at your email.':'Online submission is not connected yet. Your request has not been sent. Please use Email support below.';content.append(note);
    const actions=document.createElement('div');actions.className='tp-chat-actions';const send=button('Submit support request',()=>submit(send));send.disabled=!endpoint;actions.append(button('Start over',reset,true),send);composer.append(actions);if(!send.disabled)send.focus({preventScroll:true});scrollChat();
  }
  async function submit(send){
    if(busy||!endpoint)return;busy=true;panel.querySelectorAll('.tp-chat-content button,.tp-chat-composer button').forEach(b=>b.disabled=true);setStatus('Sending your support request…');
    try{
      let file=null;if(screenshot){const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(screenshot);});file={type:screenshot.type,base64};}
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
      let res;try{res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,screenshot:file,requestId:id}),signal:controller.signal});}finally{clearTimeout(timer);}
      const result=await res.json();if(!res.ok||!result.ok||!result.ticketId)throw Error(result.error||'Submission could not be confirmed.');
      content.replaceChildren();composer.replaceChildren();sentMessage='Your email was accepted for delivery to Magnum support. Reference: '+result.ticketId+'. The support team can reply to '+data.email+'.';content.append(bubble(sentMessage),button('New request',reset,true));setStatus('Support request submitted.');scrollChat();
    }catch(error){setStatus(error.name==='AbortError'?'Confirmation timed out. Retry with the same request, or contact Magnum by phone.':error.message||'Unable to send. Please retry or call support.');}
    finally{busy=false;content.querySelectorAll('button').forEach(b=>b.disabled=false);}
  }
})();
