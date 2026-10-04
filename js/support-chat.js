(() => {
  if (document.getElementById('tp-support-widget')) return;
  // Set to your deployed HTTPS backend URL to enable in-page email submission.
  const endpoint = window.TAXPOWER_SUPPORT_ENDPOINT || '';
  const email = 'info@magnuminfosystem.com';
  const root = document.createElement('div');
  root.id = 'tp-support-widget';
  root.innerHTML = `<button class="tp-chat-launch" type="button" aria-expanded="false" aria-controls="tp-chat-panel"><span aria-hidden="true">☏</span> Technical support</button>
  <section id="tp-chat-panel" class="tp-chat-panel" role="dialog" aria-modal="true" aria-labelledby="tp-chat-title" hidden>
  <header><div><strong id="tp-chat-title">TaxPower technical support</strong><small>Guided enquiry · Magnum Infosystem</small></div><button type="button" class="tp-chat-close" aria-label="Close support assistant">×</button></header>
  <div class="tp-chat-body"><div class="tp-chat-greeting">Hello! Let’s prepare your support request. This assistant collects details for the support team; it is not a live chat.</div><p class="tp-chat-progress"></p><div class="tp-chat-content"></div><p class="tp-chat-status" role="status" aria-live="polite"></p></div>
  <footer><a href="tel:+919811881661">Call +91 9811881661</a><a href="mailto:info@magnuminfosystem.com">Email support</a></footer></section>`;
  document.body.appendChild(root);
  const panel=root.querySelector('.tp-chat-panel'), content=root.querySelector('.tp-chat-content'), status=root.querySelector('.tp-chat-status'), launch=root.querySelector('.tp-chat-launch');
  const fields=[
    {key:'license',label:'What is your Customer / License ID?',hint:'You can find it in your TaxPower licence or registration details.',max:100},
    {key:'company',label:'What is your company name?',max:160},
    {key:'email',label:'Which email can the team reply to?',type:'email',max:254},
    {key:'product',label:'Which software do you need help with?',type:'select'},
    {key:'problem',label:'What problem are you facing?',hint:'Include the error message and what you were doing when it occurred.',type:'textarea',max:4000},
    {key:'screenshot',label:'Add an error screenshot',hint:'Optional: PNG or JPEG, up to 2 MB. Hide passwords, OTPs and unrelated customer data.',type:'file'}
  ];
  let step=0, data={}, screenshot=null, preview='', busy=false, returnFocus=null, editing=false;
  const requestId=()=>globalThis.crypto?.randomUUID?.() || Date.now()+'-'+Math.random().toString(16).slice(2);
  let id=requestId();
  const setStatus=message=>status.textContent=message;
  function show(){returnFocus=document.activeElement;panel.hidden=false;launch.setAttribute('aria-expanded','true');render();}
  function hide(){panel.hidden=true;launch.setAttribute('aria-expanded','false');(returnFocus?.isConnected?returnFocus:launch).focus();}
  launch.addEventListener('click',()=>panel.hidden?show():hide());
  root.querySelector('.tp-chat-close').addEventListener('click',hide);
  document.addEventListener('click',e=>{if(e.target.closest('[data-support-chat]')){e.preventDefault();show();}});
  panel.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();hide();}
    if(e.key==='Tab') {const items=[...panel.querySelectorAll('button:not(:disabled),a,input,select,textarea')].filter(el=>el.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
  function button(text,fn,secondary=false){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=secondary?'tp-chat-secondary':'tp-chat-primary';b.addEventListener('click',fn);return b;}
  function reset(){if(preview)URL.revokeObjectURL(preview);preview='';data={};screenshot=null;step=0;editing=false;id=requestId();render();}
  function render(){
    content.replaceChildren();setStatus('');root.querySelector('.tp-chat-progress').textContent=step<fields.length?`Step ${step+1} of ${fields.length}`:'Review your request';
    if(step===fields.length){summary();return;}
    const field=fields[step], form=document.createElement('form'), label=document.createElement('label');label.htmlFor='tp-chat-answer';label.textContent=field.label;form.append(label);
    let input=document.createElement(field.type==='textarea'?'textarea':field.type==='select'?'select':'input');input.id='tp-chat-answer';input.name=field.key;
    if(field.type==='select'){for(const text of ['TaxPower GST','TaxPower GST Billing','TaxPower TDS']){const o=document.createElement('option');o.value=text;o.textContent=text;input.append(o);}}
    else if(field.type==='file'){input.type='file';input.accept='image/png,image/jpeg';}
    else {if(field.type!=='textarea')input.type=field.type||'text';input.maxLength=field.max;input.required=true;}
    if(field.type!=='file')input.value=data[field.key]||(field.type==='select'?'TaxPower GST':'');
    if(field.key==='email')input.autocomplete='email';if(field.key==='company')input.autocomplete='organization';
    form.append(input);
    const hint=document.createElement('p');hint.className='tp-chat-hint';hint.id='tp-chat-hint';hint.textContent=field.hint||'';input.setAttribute('aria-describedby',hint.id);form.append(hint);
    if(field.type==='file'&&screenshot){const selected=document.createElement('p');selected.textContent='Selected: '+screenshot.name;form.append(selected,button('Remove screenshot',()=>{URL.revokeObjectURL(preview);preview='';screenshot=null;render();},true));}
    const actions=document.createElement('div');actions.className='tp-chat-actions';if(step>0)actions.append(button('Back',()=>{if(field.type!=='file')data[field.key]=input.value.trim();step--;render();},true));
    const next=button(editing?'Save & review':step===fields.length-1?'Review request':'Continue',()=>{});next.type='submit';actions.append(next);form.append(actions);content.append(form);
    form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;setStatus('');
      if(field.type==='file'&&input.files[0]){
        const f=input.files[0];if(f.size>2*1024*1024||!['image/png','image/jpeg'].includes(f.type)){setStatus('Choose a PNG or JPEG screenshot smaller than 2 MB.');return;}
        const bytes=new Uint8Array(await f.slice(0,8).arrayBuffer());const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
        if((f.type==='image/png'&&!png)||(f.type==='image/jpeg'&&!jpg)){setStatus('This file is not a valid PNG or JPEG image.');return;}
        if(preview)URL.revokeObjectURL(preview);screenshot=f;preview=URL.createObjectURL(f);
      }else if(field.type!=='file'){if(!input.value.trim()){setStatus('Please enter this detail.');input.focus();return;}data[field.key]=input.value.trim();}
      id=requestId();step=editing?fields.length:step+1;editing=false;render();
    });input.focus();
  }
  function summary(){
    const dl=document.createElement('dl');dl.className='tp-chat-summary';
    fields.slice(0,-1).forEach((field,i)=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent={license:'Customer / License ID',company:'Company',email:'Reply email',product:'Software',problem:'Problem'}[field.key];dd.textContent=data[field.key];row.append(dt,dd,button('Edit',()=>{step=i;editing=true;render();},true));dl.append(row);});content.append(dl);
    if(screenshot){const img=document.createElement('img');img.src=preview;img.alt='Your selected support screenshot';img.className='tp-chat-preview';content.append(img);}
    content.append(button(screenshot?'Change screenshot':'Add screenshot',()=>{step=5;editing=true;render();},true));
    const note=document.createElement('p');note.className='tp-chat-hint';note.textContent=endpoint?'Submitting sends these details and the screenshot to Magnum Infosystem at '+email+'.':'Email-app mode: this opens a draft; it does not send automatically. Attach your screenshot manually in your email app.';content.append(note);
    const actions=document.createElement('div');actions.className='tp-chat-actions';const send=button(endpoint?'Submit support request':'Open email draft',()=>endpoint?submit(send):emailDraft());actions.append(button('Start over',reset,true),send);content.append(actions);send.focus();
  }
  function emailDraft(){const body=['Hello Magnum Support,','',...Object.entries(data).map(([k,v])=>`${k}: ${v}`),'',screenshot?'Screenshot: '+screenshot.name+' (attach manually)':'No screenshot attached.'].join('\n');
    const a=document.createElement('a');a.href=`mailto:${email}?subject=${encodeURIComponent('TaxPower support — '+data.company)}&body=${encodeURIComponent(body)}`;a.click();setStatus('Email draft requested. Review it, attach your screenshot if selected, and press Send in your email app.');
  }
  async function submit(send){
    if(busy)return;busy=true;content.querySelectorAll('button').forEach(b=>b.disabled=true);setStatus('Sending your support request…');
    try{
      let file=null;if(screenshot){const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(screenshot);});file={type:screenshot.type,base64};}
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
      let res;try{res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,screenshot:file,requestId:id}),signal:controller.signal});}finally{clearTimeout(timer);}
      const result=await res.json();if(!res.ok||!result.ok||!result.ticketId)throw Error(result.error||'Submission could not be confirmed.');
      content.replaceChildren();const p=document.createElement('p');p.textContent='Your email was accepted for delivery to Magnum support. Reference: '+result.ticketId+'. The support team can reply to '+data.email+'.';content.append(p,button('New request',reset,true));setStatus('Support request submitted.');
    }catch(error){setStatus(error.name==='AbortError'?'Confirmation timed out. Retry with the same request, or contact Magnum by phone.':error.message||'Unable to send. Please retry or call support.');}
    finally{busy=false;content.querySelectorAll('button').forEach(b=>b.disabled=false);}
  }
})();
