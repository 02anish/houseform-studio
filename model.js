export const VERSION=1;
export const uid=()=>globalThis.crypto.randomUUID();
export const clone=value=>JSON.parse(JSON.stringify(value));
export const MATERIALS=[
 ['plaster','Warm plaster','#e8e5d9','plain',.9,0,1],['oak','Natural oak','#bd986e','wood',.65,0,1],['walnut','Dark walnut','#6c4b37','wood',.6,0,1],
 ['concrete','Concrete','#a1a79d','plain',.95,0,1],['tile','Porcelain tile','#d8dfd5','tile',.35,0,1],['brick','Terracotta brick','#b67b60','brick',.9,0,1],
 ['fabric','Linen fabric','#b4bfa0','fabric',1,0,1],['navy','Indigo fabric','#4f6674','fabric',1,0,1],['metal','Brushed steel','#a3b3b0','plain',.3,.85,1],
 ['glass','Clear glass','#b0d8d2','plain',.12,.05,.28],['ceramic','White ceramic','#f3f2e9','plain',.23,0,1],['grass','Garden green','#7c9a59','fabric',1,0,1],['roof','Slate roofing','#586263','tile',.85,0,1]
].map(([id,name,color,pattern,roughness,metalness,opacity])=>({id,name,color,pattern,roughness,metalness,opacity,builtin:true}));
export const CATALOG=[
 ['room','Room','build','Structure',4,.12,4,'oak','room'],['wall','Wall','build','Structure',4,2.8,.16,'plaster','wall'],['surface','Floor surface','build','Structure',4,.08,4,'tile','room'],
 ['door','Door','build','Openings',.9,2.1,.08,'walnut','door'],['window','Window','build','Openings',1.4,1.2,.10,'glass','window'],
 ['stairs','Stairs','build','Structure',1,2.8,3.4,'oak','stairs'],['roof','Pitched roof','build','Structure',5,1.4,5,'roof','roof'],['column','Column','build','Structure',.3,2.8,.3,'concrete','wall'],
 ['bed','Bed','furnish','Living & sleeping',1.8,.65,2.1,'fabric','bed'],['sofa','Sofa','furnish','Living & sleeping',2.2,.85,.85,'navy','sofa'],['daybed','Backless daybed','furnish','Living & sleeping',2,.45,.8,'fabric','sofa'],
 ['chair','Chair','furnish','Tables & seating',.5,.9,.5,'oak','chair'],['table','Table / desk','furnish','Tables & seating',1.4,.75,.75,'oak','table'],['round-table','Round table','furnish','Tables & seating',1,.75,1,'walnut','table'],
 ['wardrobe','Wardrobe / daraz','furnish','Storage',1.3,2,.6,'walnut','wardrobe'],['shelf','Bookshelf','furnish','Storage',1,1.8,.35,'oak','wardrobe'],['rack','Clothing rack','furnish','Storage',1.3,1.7,.45,'metal','rack'],
 ['counter','Kitchen counter','furnish','Kitchen & utility',1.5,.9,.65,'oak','table'],['sink','Sink','furnish','Kitchen & utility',.7,.9,.55,'ceramic','sink'],['fridge','Refrigerator','furnish','Kitchen & utility',.7,1.8,.7,'metal','wardrobe'],['stove','Cooker','furnish','Kitchen & utility',.65,.9,.65,'metal','table'],['washer','Washing machine','furnish','Kitchen & utility',.6,.85,.6,'ceramic','wardrobe'],
 ['toilet','Toilet / commode','furnish','Bathroom',.45,.8,.75,'ceramic','toilet'],['shower','Shower','furnish','Bathroom',.9,2.1,.9,'glass','shower'],['bathtub','Bathtub','furnish','Bathroom',.8,.55,1.7,'ceramic','sink'],
 ['rug','Carpet / rug','furnish','Finishing touches',2,.02,3,'navy','room'],['plant','Plant','furnish','Finishing touches',.45,.9,.45,'grass','plant'],['light','Ceiling light','furnish','Finishing touches',.4,.15,.4,'ceramic','light'],['tv','TV / screen','furnish','Finishing touches',1.2,.75,.12,'metal','window'],['block','Custom block','build','Structure',1,1,1,'concrete','wall']
].map(([type,name,tab,category,w,h,d,material,icon])=>({type,name,tab,category,w,h,d,material,icon}));
export const definition=type=>CATALOG.find(item=>item.type===type);
export const blankProject=()=>({version:VERSION,name:'Untitled house',activeFloor:'ground',floors:[{id:'ground',name:'Ground floor',height:2.8,width:16,depth:16,material:'concrete',slab:false}],materials:clone(MATERIALS),objects:[]});
export function floorElevation(project,id){let elevation=0;for(const floor of project.floors){if(floor.id===id)return elevation;elevation+=floor.height;}return 0;}
export function wallPose(project,wall){
 const room=project.objects.find(item=>item.id===wall.parentRoom);
 if(!room)return wall;
 const offsets={n:[0,-room.d/2,0,room.w],s:[0,room.d/2,0,room.w],e:[room.w/2,0,90,room.d],w:[-room.w/2,0,90,room.d]};
 const [x,z,angle,width]=offsets[wall.side];const r=room.rotation*Math.PI/180;
 return {...wall,x:room.x+x*Math.cos(r)+z*Math.sin(r),z:room.z-x*Math.sin(r)+z*Math.cos(r),rotation:room.rotation+angle,w:width,h:wall.h,y:room.y};
}
export function objectPose(project,item){
 if(item.type==='wall')return wallPose(project,item);
 const wall=project.objects.find(w=>w.id===item.wallId&&w.type==='wall');if(!wall)return item;
 const pose=wallPose(project,wall),r=pose.rotation*Math.PI/180;
 return {...item,x:pose.x+item.offset*Math.cos(r),z:pose.z-item.offset*Math.sin(r),rotation:pose.rotation,y:pose.y+(item.sill||0)};
}
export function addObject(project,type,x,z){
 const def=definition(type);if(!def)throw Error('Unknown object type');
 const item={id:uid(),type,name:def.name,floorId:project.activeFloor,x,z,y:type==='window'?1:type==='roof'?project.floors.find(f=>f.id===project.activeFloor).height:type==='light'?2.6:0,w:def.w,h:def.h,d:def.d,rotation:0,material:def.material};
 project.objects.push(item);
 if(type==='room')for(const side of ['n','s','e','w'])project.objects.push({id:uid(),type:'wall',name:`Room wall · ${side.toUpperCase()}`,floorId:item.floorId,parentRoom:item.id,side,x:0,z:0,y:0,w:item.w,h:project.floors.find(f=>f.id===item.floorId).height,d:.16,rotation:0,material:'plaster'});
 if(type==='door'||type==='window')attachOpening(project,item);
 return item;
}
export function attachOpening(project,item){
 let nearest=null;
 for(const raw of project.objects.filter(o=>o.type==='wall'&&o.floorId===item.floorId)){
  const wall=wallPose(project,raw),r=wall.rotation*Math.PI/180,dx=item.x-wall.x,dz=item.z-wall.z;
  const offset=dx*Math.cos(r)-dz*Math.sin(r),distance=Math.abs(dx*Math.sin(r)+dz*Math.cos(r));
  if(distance<.55&&Math.abs(offset)<wall.w/2 && (!nearest||distance<nearest.distance)&&wall.w>item.w+.08)nearest={raw,wall,offset,distance};
 }
 if(nearest){item.wallId=nearest.raw.id;item.offset=Math.max(-nearest.wall.w/2+item.w/2+.03,Math.min(nearest.wall.w/2-item.w/2-.03,nearest.offset));item.sill=item.type==='window'?1:0;item.y=item.sill;}
}
export function detachObject(project,item){const pose=objectPose(project,item);Object.assign(item,{x:pose.x,z:pose.z,y:pose.y,rotation:pose.rotation,w:pose.w});delete item.wallId;delete item.offset;delete item.sill;delete item.parentRoom;delete item.side;}
export function removeObject(project,id){
 const ids=new Set([id]);let change=true;
 while(change){change=false;for(const o of project.objects)if((ids.has(o.parentRoom)||ids.has(o.wallId))&&!ids.has(o.id)){ids.add(o.id);change=true;}}
 project.objects=project.objects.filter(o=>!ids.has(o.id));
}
export function duplicateObject(project,id){
 const original=project.objects.find(o=>o.id===id);if(!original)return null;
 const copy=clone(original);copy.id=uid();copy.name=`${original.name} copy`;
 if(copy.parentRoom||copy.wallId)detachObject(project,copy);
 copy.x+=.5;copy.z+=.5;project.objects.push(copy);
 if(original.type==='room'){
  const mapping=new Map();for(const wall of project.objects.filter(o=>o.parentRoom===id)){const next={...clone(wall),id:uid(),parentRoom:copy.id};mapping.set(wall.id,next.id);project.objects.push(next);}
  for(const opening of project.objects.filter(o=>mapping.has(o.wallId)))project.objects.push({...clone(opening),id:uid(),wallId:mapping.get(opening.wallId)});
 }
 return copy;
}
const finite=(value,min,max,label)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error(`Invalid ${label}.`);return value;};
const text=(value,label,max=100)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(`Invalid ${label}.`);return value;};
export function validateProject(data){
 if(!data||data.version!==VERSION)throw Error('This is not a supported Houseform project.');
 if(!Array.isArray(data.floors)||data.floors.length<1||data.floors.length>20)throw Error('A project needs 1–20 floors.');
 if(!Array.isArray(data.objects)||data.objects.length>1500||!Array.isArray(data.materials)||data.materials.length<1||data.materials.length>150)throw Error('Project library is missing or too large.');
 const ids=new Set();const id=(v)=>{text(v,'identifier',100);if(ids.has(v))throw Error('Duplicate identifier.');ids.add(v);return v;};
 const materials=data.materials.map(m=>({id:id(m.id),name:text(m.name,'material name',60),color:/^#[0-9a-f]{6}$/i.test(m.color)?m.color:(()=>{throw Error('Invalid color.');})(),pattern:['plain','wood','tile','brick','fabric'].includes(m.pattern)?m.pattern:'plain',roughness:finite(m.roughness,0,1,'roughness'),metalness:finite(m.metalness,0,1,'metalness'),opacity:finite(m.opacity,.05,1,'opacity'),builtin:!!m.builtin}));
 const materialIds=new Set(materials.map(m=>m.id));
 const floors=data.floors.map(f=>({id:id(f.id),name:text(f.name,'floor name',60),height:finite(f.height,.5,10,'floor height'),width:finite(f.width,1,100,'floor width'),depth:finite(f.depth,1,100,'floor depth'),material:materialIds.has(f.material)?f.material:materials[0].id,slab:!!f.slab}));
 const floorIds=new Set(floors.map(f=>f.id));
 const objects=data.objects.map(o=>{
  if(!definition(o.type)||!floorIds.has(o.floorId))throw Error('Object has an unknown type or floor.');
  const next={id:id(o.id),type:o.type,name:text(o.name,'object name'),floorId:o.floorId,material:materialIds.has(o.material)?o.material:materials[0].id};
  for(const key of ['x','z','y','rotation'])next[key]=finite(o[key],-1000,1000,key);
  for(const key of ['w','h','d'])next[key]=finite(o[key],.01,100,key);
  if(o.parentRoom){next.parentRoom=text(o.parentRoom,'parent room');if(!['n','s','e','w'].includes(o.side))throw Error('Invalid wall side.');next.side=o.side;}
  if(o.wallId){next.wallId=text(o.wallId,'wall reference');next.offset=finite(o.offset,-100,100,'opening offset');next.sill=finite(o.sill||0,0,10,'window sill');}
  return next;
 });
 for(const o of objects){if(o.parentRoom&&!objects.some(r=>r.id===o.parentRoom&&r.type==='room'&&r.floorId===o.floorId))throw Error('Wall references a missing room.');if(o.wallId&&(!['door','window'].includes(o.type)||!objects.some(w=>w.id===o.wallId&&w.type==='wall'&&w.floorId===o.floorId)))throw Error('Opening references a missing wall.');}
 return {version:VERSION,name:text(data.name,'project name',80),activeFloor:floorIds.has(data.activeFloor)?data.activeFloor:floors[0].id,materials,floors,objects};
}
export class History{
 constructor(){this.past=[];this.future=[];}
 record(project){this.past.push(clone(project));if(this.past.length>60)this.past.shift();this.future=[];}
 undo(project){if(!this.past.length)return null;this.future.push(clone(project));return this.past.pop();}
 redo(project){if(!this.future.length)return null;this.past.push(clone(project));return this.future.pop();}
}
