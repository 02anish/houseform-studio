// Runs against the local dev server using an isolated headless Chrome profile.
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const output=path.resolve('.test-artifacts');await mkdir(output,{recursive:true});
const port=10000+Math.floor(Math.random()*20000);
const browser=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${port}`,'--remote-allow-origins=*',`--user-data-dir=${path.join(output,'chrome-profile-'+Date.now())}`,'--use-angle=swiftshader','--enable-unsafe-swiftshader','--window-size=1440,1000','about:blank'],{windowsHide:true,stdio:'ignore'});
let socket,cdpCall;let count=0;const pending=new Map(),errors=[];
try{
 let targets;for(let i=0;i<60;i++){try{targets=await(await fetch(`http://127.0.0.1:${port}/json`)).json();if(targets.length)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 if(!targets?.length)throw Error('Headless Chrome did not start.');
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const item=pending.get(message.id);pending.delete(message.id);message.error?item.reject(Error(message.error.message)):item.resolve(message.result);}if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text+': '+(message.params.exceptionDetails.exception?.description||''));};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++count;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 cdpCall=call;
 const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression:`eval(${JSON.stringify(expression)})`,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||'Evaluation failed');return result.result.value;};
 await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:'http://localhost:5173/'});
 for(let i=0;i<60;i++){if(await evaluate(`!!document.querySelector('#viewport canvas') && document.querySelectorAll('[data-tool]').length>0`))break;await new Promise(r=>setTimeout(r,250));}
 const assert=async(expression,message)=>{if(!await evaluate(expression))throw Error(message);};
 await assert(`!!document.querySelector('#viewport canvas')`,'Canvas did not initialize: '+JSON.stringify(await evaluate(`({url:location.href,text:document.body?.innerText.slice(0,500)})`))+' '+errors.join('\n'));
 // Use a fresh design only in this isolated browser profile.
 await evaluate(`document.querySelector('#new-project').click()`);await evaluate(`document.querySelector('#confirm-ok').click()`);
 for(let i=0;i<40;i++){if(await evaluate(`JSON.parse(localStorage.getItem('houseform-project-v1'))?.objects?.length===0`))break;await new Promise(r=>setTimeout(r,50));}
 const clickCanvas=async(xFraction=.50,yFraction=.52)=>{const rect=await evaluate(`(()=>{const r=document.querySelector('#viewport canvas').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};})()`);const x=rect.x+rect.w*xFraction,y=rect.y+rect.h*yFraction;await call('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});await call('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await new Promise(r=>setTimeout(r,80));await call('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});await new Promise(r=>setTimeout(r,80));};
 await evaluate(`document.querySelector('[data-tool="room"]').click()`);await clickCanvas();
 await assert(`document.querySelectorAll('[data-object]').length===5`,'Room did not create four walls');
 await evaluate(`document.querySelector('[data-tab="furnish"]').click();document.querySelector('[data-tool="bed"]').click()`);await clickCanvas(.57,.58);
 await assert(`document.querySelectorAll('[data-object]').length===6`,'Furniture placement failed: '+await evaluate(`JSON.stringify({objects:JSON.parse(localStorage.getItem('houseform-project-v1')).objects.map(o=>o.type),banner:document.querySelector('#placement-text').textContent})`));
 await evaluate(`document.querySelector('#rotate-object').click()`);
 await assert(`document.querySelector('#properties [data-field="rotation"]').value==='15'`,'Rotation failed');
 await evaluate(`document.querySelector('#duplicate-object').click()`);
 await assert(`document.querySelectorAll('[data-object]').length===7`,'Duplicate failed: '+await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('houseform-project-v1')).objects.map(o=>o.type))`));
 await evaluate(`document.querySelector('#delete-object').click();document.querySelector('#undo').click()`);
 await assert(`document.querySelectorAll('[data-object]').length===7`,'Undo failed');
 await evaluate(`document.querySelectorAll('[data-object]')[6].click();document.querySelector('[data-tab="materials"]').click();document.querySelector('[data-material="oak"]').click()`);
 await assert(`JSON.parse(localStorage.getItem('houseform-project-v1')).objects.at(-1).material==='oak'`,'Material application failed');
 await evaluate(`document.querySelector('#create-material').click();const f=document.querySelector('#material-form');f.elements.name.value='Custom sage';f.elements.color.value='#89a47c';f.elements.pattern.value='fabric';f.requestSubmit()`);
 await assert(`JSON.parse(localStorage.getItem('houseform-project-v1')).materials.at(-1).name==='Custom sage'`,'Custom material creation failed');
 await evaluate(`document.querySelectorAll('[data-edit-material]')[13].click();const f=document.querySelector('#material-form');f.elements.color.value='#779966';f.requestSubmit()`);
 await assert(`JSON.parse(localStorage.getItem('houseform-project-v1')).materials.at(-1).color==='#779966'`,'Material editing failed');
 // Import the current design through a real file-input change, then test rejection.
 await evaluate(`window.testBackup=localStorage.getItem('houseform-project-v1');const input=document.querySelector('#import-file'),dt=new DataTransfer();dt.items.add(new File([window.testBackup],'backup.json',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}))`);
 for(let i=0;i<40;i++){if(await evaluate(`document.querySelector('#confirm-dialog').open`))break;await new Promise(r=>setTimeout(r,50));}
 await evaluate(`document.querySelector('#confirm-ok').click()`);await new Promise(r=>setTimeout(r,150));
 await assert(`JSON.parse(localStorage.getItem('houseform-project-v1')).objects.length===7`,'Project import failed');
 await evaluate(`const input=document.querySelector('#import-file'),dt=new DataTransfer();dt.items.add(new File(['{"version":999}'],'invalid.json'));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}))`);await new Promise(r=>setTimeout(r,100));
 await assert(`document.querySelector('#toast').textContent.includes('Could not import')`,'Malformed import not rejected');
 await evaluate(`document.querySelector('#add-floor').click();document.querySelector('#view-3d').click();document.querySelector('#all-floors').click()`);
 await assert(`document.querySelectorAll('[data-floor]').length===2`,'Floor creation failed');
 await evaluate(`document.querySelector('[data-floor="ground"]').click()`);
 await evaluate(`document.querySelector('#cutaway').click();document.querySelector('#cutaway').click()`);
 await assert(`document.querySelector('#cutaway').checked && !document.querySelector('#cutaway').disabled`,'Cutaway control did not enable in 3D');
 await new Promise(r=>setTimeout(r,600));
 const screenshot=await call('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,'studio-desktop.png'),Buffer.from(screenshot.data,'base64'));
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await new Promise(r=>setTimeout(r,400));
 await assert(`document.documentElement.scrollWidth<=390`,'Mobile page has horizontal overflow');
 const mobile=await call('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,'studio-mobile.png'),Buffer.from(mobile.data,'base64'));
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Browser passed: canvas, room/walls, furniture, rotation, duplicate/delete, undo, materials/create/edit, import/validation, multiple floors, 3D, mobile layout; no runtime exceptions.');
}catch(e){if(cdpCall){try{const shot=await cdpCall('Page.captureScreenshot',{format:'png'});await writeFile(path.join(output,'failure.png'),Buffer.from(shot.data,'base64'));}catch{}}throw Error(e.message+(errors.length?'\n'+errors.join('\n'):''));}
finally{if(cdpCall)try{await cdpCall('Browser.close');}catch{}socket?.close();browser.kill();}
