import {blankProject,validateProject,clone,uid,definition,CATALOG,History,addObject,removeObject,duplicateObject,objectPose,wallPose,detachObject,floorElevation} from './model.js';
import {DesignRenderer} from './renderer.js';

const $=id=>document.getElementById(id),KEY='houseform-project-v1',history=new History();
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let project=blankProject(),selectedId=null,tab='build',tool=null,mode='2d',materialEditId=null;
let storageProblem=false;
try{const saved=localStorage.getItem(KEY);if(saved)project=validateProject(JSON.parse(saved));}catch(e){storageProblem=true;}
let view;
try{view=new DesignRenderer($('viewport'));}catch(e){$('viewport').innerHTML='<div class="error-screen"><h2>The 3D canvas could not start.</h2><p>Enable hardware acceleration or use a browser with WebGL support, then refresh. Your saved project has not been changed.</p></div>';throw e;}
const selected=()=>project.objects.find(o=>o.id===selectedId);
const activeFloor=()=>project.floors.find(f=>f.id===project.activeFloor);
const snap=value=>$('snap').checked?Math.round(value*4)/4:Math.round(value*100)/100;
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),3000);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(project));$('save-status').textContent='Saved on this device';}catch(e){$('save-status').textContent='Storage unavailable — export to save';}}
function commit(change,{fit=false}={}){history.record(project);change();persist();render();if(fit)view.fit(project);}
function options(value){return project.materials.map(m=>`<option value="${escape(m.id)}" ${m.id===value?'selected':''}>${escape(m.name)}</option>`).join('');}
function field(label,key,value,{min=-1000,max=1000,step=.05,text=false,disabled=false}={}){return `<label class="field">${label}<input data-field="${key}" type="${text?'text':'number'}" value="${escape(value)}" ${text?'maxlength="100"':`min="${min}" max="${max}" step="${step}"`} ${disabled?'disabled':''}/></label>`;}
const ICONS={room:'<path d="M12 36V15l23-8 21 10v21l-23 7Z"/><path d="m12 15 21 10 23-8M33 25v20"/>',wall:'<path d="M14 36V9l41 8v27Z"/><path d="M14 18l41 8M14 27l41 8M29 12v9M41 25v9M29 30v9"/>',door:'<path d="M18 41V8h33v33M23 40V13l22 3v28Z"/><circle cx="40" cy="28" r="1"/>',window:'<path d="M15 10h40v30H15ZM19 14h32v22H19Z"/>',bed:'<path d="M12 34V15h40v24M12 26l36 5 12-6v15l-12 6-36-5ZM15 19h14v8H15ZM32 19h14v8H32"/>',sofa:'<path d="M16 25V13h35v13M10 23h9v12h31V23h9v17H10ZM19 28h31M16 41v4m36-4v4"/>',chair:'<path d="M22 27V9h25v20M17 28h36v7H17ZM20 35v10m29-10v10M24 13h19v12H24Z"/>',table:'<path d="m10 19 27-9 24 9-27 10ZM14 22v18m20-11v15m22-21v17"/>',wardrobe:'<path d="M17 8h35v36H17ZM35 8v36M30 23v6m10-6v6M17 37h35"/>',stairs:'<path d="M13 39h9v-8h9v-8h9v-8h10V7h9v34H13Z"/>',roof:'<path d="m9 32 24-25 29 25-10 7-19-22-14 22ZM19 36v8h33v-8"/>',rack:'<path d="M14 41V9h40v32M9 42h11m29 0h11M19 13l5 4h12l5-4M22 17v19h18V17"/>',toilet:'<path d="M40 10h14v21H40ZM15 28h30l-4 8H20ZM25 36v9h14v-9M40 14h14"/>',shower:'<path d="M15 41V9h37v32ZM24 12v8h12M32 20h9m-7 4v4m5-4v4M15 37h37"/>',sink:'<path d="M12 23h47l-7 18H19ZM40 23V9h8v9M17 27h37"/>',plant:'<path d="m24 29 3 15h17l3-15ZM35 29V12M35 22C16 22 18 9 20 9c9 0 15 13 15 13ZM35 17C51 17 53 6 50 6c-10 0-15 11-15 11Z"/>',light:'<path d="M35 7v8M25 15h20l12 20H13ZM19 39h33M30 39v4h10v-4"/>'};
const icon=key=>`<svg viewBox="0 0 70 50" aria-hidden="true">${ICONS[key]||ICONS.room}</svg>`;
function renderCatalog(){
 const query=$('library-search').value.toLowerCase().trim();
 if(tab==='materials'){
  const materials=project.materials.filter(m=>m.name.toLowerCase().includes(query));
  $('catalog').innerHTML=`<div class="material-actions"><button id="create-material" class="small-btn">+ Create a finish</button></div><div class="catalog-heading">SELECT TO APPLY A FINISH</div>`+materials.map(m=>{
   const pattern=m.pattern==='wood'?'background-image:repeating-linear-gradient(5deg,transparent,transparent 7px,#00000015 8px,#ffffff18 9px)':m.pattern==='tile'||m.pattern==='brick'?'background-image:linear-gradient(#ffffff60 1px,transparent 1px),linear-gradient(90deg,#ffffff60 1px,transparent 1px);background-size:22px 22px':m.pattern==='fabric'?'background-image:repeating-linear-gradient(90deg,#ffffff10,#ffffff10 1px,transparent 1px,transparent 3px)':'';
   return `<div><button class="catalog-card" data-material="${escape(m.id)}"><span class="material-swatch" style="background-color:${m.color};${pattern}"></span><strong>${escape(m.name)}</strong><small>${m.opacity<1?'Transparent':m.pattern==='plain'?'Solid finish':escape(m.pattern)}</small></button><div class="material-controls"><button data-edit-material="${escape(m.id)}">Edit</button><button data-delete-material="${escape(m.id)}" aria-label="Delete ${escape(m.name)}">Delete</button></div></div>`;
  }).join('')+(materials.length?'':'<p class="no-results">No matching materials.</p>');return;
 }
 const items=CATALOG.filter(i=>i.tab===tab&&`${i.name} ${i.category}`.toLowerCase().includes(query));let category='';
 $('catalog').innerHTML=items.map(i=>{let heading='';if(i.category!==category){category=i.category;heading=`<div class="catalog-heading">${escape(category.toUpperCase())}</div>`;}return `${heading}<button class="catalog-card ${tool===i.type?'active':''}" data-tool="${i.type}"><span class="catalog-illustration">${icon(i.icon)}</span><strong>${escape(i.name)}</strong><small>${i.w} × ${i.d} m</small></button>`;}).join('')||( '<p class="no-results">No matching items.</p>');
}
function renderFloors(){
 $('floor-list').innerHTML=project.floors.map((f,i)=>`<div class="floor-row ${f.id===project.activeFloor?'active':''}"><button class="floor-select" data-floor="${escape(f.id)}"><span class="floor-number">${String(i).padStart(2,'0')}</span>${escape(f.name)}</button><button class="floor-delete" data-delete-floor="${escape(f.id)}" title="Delete floor" ${project.floors.length===1?'disabled':''}>×</button></div>`).join('');
 const f=activeFloor();$('floor-properties').innerHTML=`${field('Floor name','name',f.name,{text:true})}<div class="field-row">${field('Height (m)','height',f.height,{min:.5,max:10})}<label class="field">Elevation (m)<input disabled value="${floorElevation(project,f.id).toFixed(2)}" /></label></div><div class="field-row">${field('Width (m)','width',f.width,{min:1,max:100})}${field('Depth (m)','depth',f.depth,{min:1,max:100})}</div><label class="field">Floor finish<select data-field="material">${options(f.material)}</select></label><label class="field"><span><input data-field="slab" type="checkbox" ${f.slab?'checked':''} /> Show full floor slab</span></label>`;
}
function renderProperties(){
 const item=selected();$('selection-tag').textContent=item?item.type.toUpperCase():'NO SELECTION';
 if(!item){$('properties').innerHTML='<div class="inspector-empty"><span>↖</span><h3>A place for every detail.</h3><p>Select an item to adjust its size, position, rotation, and material.</p></div>';return;}
 const pose=objectPose(project,item),linked=!!(item.parentRoom||item.wallId);
 $('properties').innerHTML=`<h2 class="object-title">${escape(definition(item.type).name)}</h2>${field('Name','name',item.name,{text:true})}<label class="field">Floor<select data-field="floorId">${project.floors.map(f=>`<option value="${escape(f.id)}" ${f.id===item.floorId?'selected':''}>${escape(f.name)}</option>`).join('')}</select></label><div class="field-row">${field('X position (m)','x',pose.x.toFixed(2),{disabled:linked})}${field('Z position (m)','z',pose.z.toFixed(2),{disabled:linked})}</div><div class="field-row three">${field('Width (m)','w',pose.w.toFixed(2),{min:.05,max:100,disabled:!!item.parentRoom})}${field('Height (m)','h',item.h,{min:.01,max:100})}${field('Depth (m)','d',item.d,{min:.01,max:100})}</div><div class="field-row">${field('Elevation (m)','y',pose.y.toFixed(2),{min:0,max:100,disabled:linked})}${field('Rotation (°)','rotation',pose.rotation,{step:15,disabled:linked})}</div>${item.wallId?`<div class="field-row">${field('Along wall (m)','offset',item.offset.toFixed(2),{min:-100,max:100})}${field('Sill height (m)','sill',item.sill||0,{min:0,max:10})}</div>`:''}<label class="field">Material<select data-field="material">${options(item.material)}</select></label>${linked?'<p class="properties-note">Attached to '+(item.parentRoom?'a room. Its dimensions and position follow the room.':'a wall. It creates an opening and moves with the wall.')+'</p><button id="detach-object" class="small-btn">Detach to edit independently</button>':''}<div class="object-actions"><button id="rotate-object" ${linked?'disabled':''}>↻ Rotate 15°</button><button id="duplicate-object">Duplicate</button></div><div class="object-actions"><button id="delete-object" class="danger-btn">Delete ${item.type==='room'?'room & walls':'item'}</button></div>`;
}
function renderObjectList(){const objects=project.objects.filter(o=>o.floorId===project.activeFloor);$('object-count').textContent=objects.length;$('object-list').innerHTML=objects.length?objects.map(o=>`<button class="object-list-row ${o.id===selectedId?'active':''}" data-object="${escape(o.id)}"><span class="type-icon">${o.type==='wall'?'▥':o.type==='room'?'▦':o.type==='window'?'▣':'◇'}</span><span class="object-list-name">${escape(o.name)}</span><small>${o.type}</small></button>`).join(''):'<p class="no-results">Your objects will appear here.</p>';}
function render(){
 if(!selected())selectedId=null;
 view.rebuild(project,$('all-floors').checked&&mode==='3d',selectedId,$('cutaway').checked);
 $('project-name').value=project.name;$('undo').disabled=!history.past.length;$('redo').disabled=!history.future.length;
 $('view-caption').textContent=`${activeFloor().name.toUpperCase()} / ${mode==='2d'?'PLAN':'3D'}`;
 $('empty-hint').hidden=project.objects.some(o=>o.floorId===project.activeFloor)||!!tool;
 $('project-summary').textContent=`${project.floors.length} ${project.floors.length===1?'floor':'floors'} · ${project.objects.length} objects`;
 renderFloors();renderProperties();renderObjectList();renderCatalog();
}
function select(id){selectedId=id;view.select(id);renderProperties();renderObjectList();}
function chooseTool(type){tool=type;$('placement-banner').hidden=!type;$('placement-text').textContent=type?`Place ${definition(type).name.toLowerCase()} · click canvas · Esc to cancel`:'';$('empty-hint').hidden=!!type||project.objects.some(o=>o.floorId===project.activeFloor);view.renderer.domElement.style.cursor=type?'crosshair':'default';renderCatalog();}
function setTab(next){tab=next;chooseTool(null);$('library-search').value='';document.querySelectorAll('[data-tab]').forEach(button=>{button.classList.toggle('active',button.dataset.tab===tab);button.setAttribute('aria-selected',String(button.dataset.tab===tab));});renderCatalog();}
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>setTab(button.dataset.tab)));
$('library-search').addEventListener('input',renderCatalog);
$('cancel-placement').addEventListener('click',()=>chooseTool(null));$('start-room').addEventListener('click',()=>{setTab('build');chooseTool('room');});
$('catalog').addEventListener('click',async event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.tool){chooseTool(button.dataset.tool);return;}
 if(button.id==='create-material'){openMaterial();return;}
 if(button.dataset.editMaterial){openMaterial(button.dataset.editMaterial);return;}
 if(button.dataset.deleteMaterial){const id=button.dataset.deleteMaterial;if(project.materials.length===1){toast('Keep at least one material in the project.');return;}const material=project.materials.find(m=>m.id===id);if(await confirmAction('Delete this material?',`${material.name} will be replaced with the first remaining finish wherever it is used.`)){commit(()=>{project.materials=project.materials.filter(m=>m.id!==id);for(const object of [...project.objects,...project.floors])if(object.material===id)object.material=project.materials[0].id;});}return;}
 if(button.dataset.material){commit(()=>{const item=selected();if(item)item.material=button.dataset.material;else activeFloor().material=button.dataset.material;});toast(selected()?'Material applied to selection.':'Floor finish updated. Enable the floor slab to show it.');}
});
$('properties').addEventListener('change',event=>{
 const input=event.target,item=selected(),key=input.dataset.field;if(!key||!item)return;
 const textKeys=['name','material','floorId'];const value=textKeys.includes(key)?input.value:Number(input.value);
 if(key==='name'&&!value.trim()){renderProperties();return;}
 if(!textKeys.includes(key)&&(!Number.isFinite(value)||value<Number(input.min)||value>Number(input.max))){toast('Enter a value within the field limits.');renderProperties();return;}
 commit(()=>{
  if(key==='floorId'){
   if(item.parentRoom||item.wallId)detachObject(project,item);item.floorId=value;
   const walls=project.objects.filter(o=>o.parentRoom===item.id);for(const wall of walls)wall.floorId=value;
   const wallIds=new Set([item.id,...walls.map(w=>w.id)]);for(const o of project.objects)if(wallIds.has(o.wallId))o.floorId=value;
   project.activeFloor=value;
  }else item[key]=value;
  constrainOpenings();
 });
});
function constrainOpenings(){for(const item of project.objects.filter(o=>o.wallId)){const raw=project.objects.find(w=>w.id===item.wallId);if(!raw)continue;const wall=wallPose(project,raw);item.w=Math.min(item.w,Math.max(.05,wall.w-.08));const limit=Math.max(0,(wall.w-item.w)/2-.02);item.offset=Math.max(-limit,Math.min(limit,item.offset));item.sill=Math.min(item.sill||0,Math.max(0,wall.h-.05));item.h=Math.min(item.h,Math.max(.01,wall.h-item.sill));}}
$('properties').addEventListener('click',event=>{const id=event.target.closest('button')?.id;if(id==='delete-object')deleteSelected();if(id==='duplicate-object')duplicateSelected();if(id==='rotate-object'&&selected()&&!selected().parentRoom&&!selected().wallId)commit(()=>{selected().rotation=(selected().rotation+15)%360;});if(id==='detach-object'&&selected())commit(()=>detachObject(project,selected()));});
function deleteSelected(){if(!selected())return;commit(()=>{removeObject(project,selectedId);selectedId=null;});}
function duplicateSelected(){if(!selected())return;if(project.objects.length>1490){toast('This project has reached the object limit.');return;}commit(()=>{selectedId=duplicateObject(project,selectedId).id;});}
$('floor-properties').addEventListener('change',event=>{const input=event.target,key=input.dataset.field;if(!key)return;const f=activeFloor();let value=key==='slab'?input.checked:['name','material'].includes(key)?input.value:Number(input.value);if(key==='name'&&(!value.trim()||value.length>60)){renderFloors();return;}if(['height','width','depth'].includes(key)&&(!Number.isFinite(value)||value<Number(input.min)||value>Number(input.max))){renderFloors();return;}commit(()=>{const oldHeight=f.height;f[key]=value;if(key==='height')for(const wall of project.objects.filter(o=>o.type==='wall'&&o.floorId===f.id&&Math.abs(o.h-oldHeight)<.01))wall.h=value;constrainOpenings();});});
$('floor-list').addEventListener('click',async event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.floor){project.activeFloor=button.dataset.floor;selectedId=null;chooseTool(null);persist();render();view.fit(project);}if(button.dataset.deleteFloor){const id=button.dataset.deleteFloor,floor=project.floors.find(f=>f.id===id);if(project.floors.length<2)return;if(await confirmAction('Delete this floor?',`${floor.name} and all its objects will be removed. You can undo this change.`))commit(()=>{project.floors=project.floors.filter(f=>f.id!==id);project.objects=project.objects.filter(o=>o.floorId!==id);if(project.activeFloor===id)project.activeFloor=project.floors[0].id;selectedId=null;},{fit:true});}});
$('add-floor').addEventListener('click',()=>{if(project.floors.length>=20){toast('A project supports up to 20 floors.');return;}commit(()=>{const f={...clone(activeFloor()),id:uid(),name:`Floor ${project.floors.length}`,slab:false};project.floors.push(f);project.activeFloor=f.id;selectedId=null;},{fit:true});chooseTool(null);});
$('object-list').addEventListener('click',event=>{const id=event.target.closest('[data-object]')?.dataset.object;if(id){chooseTool(null);select(id);}});
$('project-name').addEventListener('change',event=>commit(()=>project.name=event.target.value.trim()||'Untitled house'));
function undo(){const previous=history.undo(project);if(previous){project=previous;selectedId=null;persist();render();view.fit(project);}}
function redo(){const next=history.redo(project);if(next){project=next;selectedId=null;persist();render();view.fit(project);}}
$('undo').addEventListener('click',undo);$('redo').addEventListener('click',redo);
function setView(next){mode=next;view.setMode(next);$('view-2d').classList.toggle('active',next==='2d');$('view-3d').classList.toggle('active',next==='3d');$('view-2d').setAttribute('aria-pressed',String(next==='2d'));$('view-3d').setAttribute('aria-pressed',String(next==='3d'));$('all-floors').disabled=next==='2d';$('cutaway').disabled=next==='2d';render();view.fit(project);}
$('view-2d').addEventListener('click',()=>setView('2d'));$('view-3d').addEventListener('click',()=>setView('3d'));$('all-floors').addEventListener('change',render);$('cutaway').addEventListener('change',render);$('fit-view').addEventListener('click',()=>view.fit(project));
let drag=null;
const canvas=view.renderer.domElement;
canvas.addEventListener('pointerdown',event=>{
 if(event.button!==0||event.isPrimary===false)return;
 if(tool){event.stopImmediatePropagation();view.controls.enabled=false;drag={placement:true,startX:event.clientX,startY:event.clientY,pointerId:event.pointerId};canvas.setPointerCapture(event.pointerId);return;}
 const id=view.pick(event);if(!id){select(null);return;}
 const item=project.objects.find(o=>o.id===id),pose=objectPose(project,item),point=view.point(event);select(id);if(!point)return;
 event.stopImmediatePropagation();view.controls.enabled=false;canvas.setPointerCapture(event.pointerId);drag={id,startX:event.clientX,startY:event.clientY,pointerId:event.pointerId,startPoint:point.clone(),startXWorld:pose.x,startZWorld:pose.z,recorded:false,before:clone(project)};
},true);
canvas.addEventListener('pointermove',event=>{
 if(!drag||drag.placement||event.pointerId!==drag.pointerId)return;
 const item=project.objects.find(o=>o.id===drag.id);if(!item)return;
 if(!drag.recorded&&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<5)return;
 const point=view.point(event);if(!point)return;
 if(!drag.recorded){history.record(drag.before);drag.recorded=true;if(item.parentRoom)detachObject(project,item);}
 if(item.wallId){const raw=project.objects.find(w=>w.id===item.wallId),wall=wallPose(project,raw),r=wall.rotation*Math.PI/180;item.offset=snap((point.x-wall.x)*Math.cos(r)-(point.z-wall.z)*Math.sin(r));constrainOpenings();}
 else{item.x=snap(drag.startXWorld+point.x-drag.startPoint.x);item.z=snap(drag.startZWorld+point.z-drag.startPoint.z);}
 view.rebuild(project,$('all-floors').checked&&mode==='3d',selectedId,$('cutaway').checked);
},true);
function finishDrag(event,cancel=false){
 if(!drag||event.pointerId!==drag.pointerId)return;
 const current=drag;drag=null;view.controls.enabled=true;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
 if(current.placement&&!cancel&&Math.hypot(event.clientX-current.startX,event.clientY-current.startY)<8){const point=view.point(event);if(point){if(project.objects.length>1490){toast('Object limit reached.');return;}const type=tool;commit(()=>{selectedId=addObject(project,type,snap(point.x),snap(point.z)).id;constrainOpenings();});chooseTool(null);toast('Added. Drag to move or edit its properties.');}}
 if(current.recorded){persist();render();}
}
canvas.addEventListener('pointerup',event=>finishDrag(event),true);canvas.addEventListener('pointercancel',event=>finishDrag(event,true),true);
window.addEventListener('keydown',event=>{
 if(event.target.closest('input,select,textarea')||document.querySelector('dialog[open]'))return;
 if(event.key==='Escape'){chooseTool(null);select(null);}
 if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();deleteSelected();}
 if(event.ctrlKey||event.metaKey){if(event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redo():undo();}if(event.key.toLowerCase()==='y'){event.preventDefault();redo();}if(event.key.toLowerCase()==='d'){event.preventDefault();duplicateSelected();}}
});
function confirmAction(title,message){$('confirm-title').textContent=title;$('confirm-text').textContent=message;$('confirm-dialog').showModal();return new Promise(resolve=>{const dialog=$('confirm-dialog');dialog.onclose=()=>{resolve(dialog.returnValue==='ok');dialog.onclose=null;};dialog.returnValue='';$('confirm-ok').onclick=()=>dialog.close('ok');$('confirm-cancel').onclick=()=>dialog.close('cancel');});}
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.close).close()));$('help').addEventListener('click',()=>$('help-dialog').showModal());
function openMaterial(id=null){materialEditId=id;const form=$('material-form');form.reset();if(id){const material=project.materials.find(m=>m.id===id);for(const key of ['name','color','pattern','roughness','metalness','opacity'])form.elements.namedItem(key).value=material[key];}$('material-dialog').querySelector('h2').textContent=id?'Edit material':'Create a material';$('material-dialog').showModal();}
$('material-form').addEventListener('submit',event=>{event.preventDefault();if(project.materials.length>=150&&!materialEditId){toast('Material limit reached.');return;}const data=new FormData(event.target);const material={id:materialEditId||uid(),name:String(data.get('name')).trim(),color:data.get('color'),pattern:data.get('pattern'),roughness:Number(data.get('roughness')),metalness:Number(data.get('metalness')),opacity:Number(data.get('opacity')),builtin:false};if(!material.name)return;commit(()=>{const index=project.materials.findIndex(m=>m.id===material.id);if(index>=0)project.materials[index]=material;else project.materials.push(material);});$('material-dialog').close();toast('Material saved. Select it to apply.');});
$('export-project').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${project.name.replace(/[^a-z0-9_-]+/gi,'-')||'houseform'}.houseform.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Project exported. Keep the file as your backup.');});
$('import-project').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;if(file.size>5*1024*1024){toast('Choose a project smaller than 5 MB.');return;}let next;try{next=validateProject(JSON.parse(await file.text()));}catch(e){toast(`Could not import: ${e.message}`);return;}if(await confirmAction('Open this project?',`${next.name} will replace the current design. Export your current project first if you want a separate backup.`)){commit(()=>{project=next;selectedId=null;},{fit:true});chooseTool(null);toast('Project imported.');}});
$('new-project').addEventListener('click',async()=>{if(await confirmAction('Start with a blank canvas?','The current design will be cleared. You can undo this, or export it first to keep a backup.')){commit(()=>{project=blankProject();selectedId=null;},{fit:true});chooseTool(null);}});
$('all-floors').disabled=true;$('cutaway').disabled=true;render();view.fit(project);
if(storageProblem)toast('A saved project could not be loaded. Use Import to open a backup.');
