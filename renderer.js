import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { objectPose,wallPose,floorElevation } from './model.js';

export class DesignRenderer{
 constructor(viewport){
  this.viewport=viewport;this.mode='2d';this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#e9eee5');
  this.renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:false});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;viewport.append(this.renderer.domElement);
  this.plan=new THREE.OrthographicCamera(-8,8,8,-8,.01,500);this.perspective=new THREE.PerspectiveCamera(42,1,.1,500);this.camera=this.plan;
  this.plan.position.set(0,40,0);this.plan.up.set(0,0,-1);this.plan.lookAt(0,0,0);this.perspective.position.set(12,14,15);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.enableRotate=false;this.controls.screenSpacePanning=true;this.controls.maxPolarAngle=Math.PI*.48;this.controls.minDistance=2;this.controls.maxDistance=150;this.controls.minZoom=.08;this.controls.maxZoom=15;this.controls.mouseButtons.LEFT=THREE.MOUSE.PAN;
  this.scene.add(new THREE.HemisphereLight('#fbffef','#829574',2.4));const sun=new THREE.DirectionalLight('#fff2dc',3);sun.position.set(-8,18,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,far:100});sun.shadow.normalBias=.04;this.scene.add(sun);
  this.grid=new THREE.GridHelper(100,400,'#b6c4a9','#d4ddcd');this.grid.position.y=-.022;this.scene.add(this.grid);
  this.content=new THREE.Group();this.scene.add(this.content);this.objectGroups=new Map();this.materialCache=new Map();this.ray=new THREE.Raycaster();this.mouse=new THREE.Vector2();this.floorY=0;this.selected=null;
  this.fixed={white:new THREE.MeshStandardMaterial({color:'#f2f0e5',roughness:.7}),dark:new THREE.MeshStandardMaterial({color:'#49524a',roughness:.6}),metal:new THREE.MeshStandardMaterial({color:'#a1ada6',metalness:.7,roughness:.3}),green:new THREE.MeshStandardMaterial({color:'#6c935b',roughness:1}),black:new THREE.MeshStandardMaterial({color:'#222e2a',roughness:.4}),glass:new THREE.MeshPhysicalMaterial({color:'#add1c4',transparent:true,opacity:.26,roughness:.15,depthWrite:false})};
  this.selectionBox=new THREE.BoxHelper(new THREE.Object3D(),0x507f48);this.selectionBox.material.depthTest=false;this.selectionBox.material.transparent=true;this.selectionBox.material.opacity=.85;this.selectionBox.renderOrder=999;this.selectionBox.visible=false;this.scene.add(this.selectionBox);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(viewport);this.resize();
  this.renderer.setAnimationLoop(()=>{this.controls.update();this.renderer.render(this.scene,this.camera);});
 }
 resize(){const {clientWidth:w,clientHeight:h}=this.viewport;if(!w||!h)return;this.renderer.setSize(w,h);this.perspective.aspect=w/h;this.perspective.updateProjectionMatrix();const span=8;this.plan.left=-span*w/h;this.plan.right=span*w/h;this.plan.top=span;this.plan.bottom=-span;this.plan.updateProjectionMatrix();}
 setMode(mode){
  const target=this.controls.target.clone();this.mode=mode;this.camera=mode==='2d'?this.plan:this.perspective;this.controls.object=this.camera;
  if(mode==='2d'){this.plan.position.set(target.x,Math.max(40,target.y+40),target.z);this.plan.up.set(0,0,-1);this.plan.lookAt(target);}
  else if(this.perspective.position.distanceTo(target)<3)this.perspective.position.set(target.x+12,target.y+14,target.z+15);
  this.controls.enableRotate=mode==='3d';this.controls.screenSpacePanning=mode==='2d';this.controls.mouseButtons.LEFT=mode==='2d'?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE;this.controls.update();
 }
 clear(){
  this.content.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.userData.labelTexture){o.userData.labelTexture.dispose();o.material.dispose();}});this.content.clear();this.objectGroups.clear();
 }
 material(def){
  const signature=JSON.stringify(def);if(this.materialCache.has(signature))return this.materialCache.get(signature);
  const material=new THREE.MeshStandardMaterial({color:def.color,roughness:def.roughness,metalness:def.metalness,transparent:def.opacity<1,opacity:def.opacity,depthWrite:def.opacity>.5});
  if(def.pattern!=='plain'){
   const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.fillStyle=def.color;c.fillRect(0,0,256,256);
   if(def.pattern==='wood'){for(let i=0;i<32;i++){c.strokeStyle=i%2?'#ffffff18':'#00000012';c.lineWidth=1+(i%3);c.beginPath();c.moveTo(0,i*8);c.bezierCurveTo(80,i*8-8,180,i*8+9,256,i*8);c.stroke();}}
   if(def.pattern==='tile'||def.pattern==='brick'){c.strokeStyle=def.pattern==='tile'?'#ffffff88':'#ead9bbaa';c.lineWidth=3;for(let y=0;y<=256;y+=64){c.beginPath();c.moveTo(0,y);c.lineTo(256,y);c.stroke();for(let x=def.pattern==='brick'&&(y/64)%2?-64:0;x<=256;x+=128)c.strokeRect(x,y,128,64);}}
   if(def.pattern==='fabric'){for(let i=0;i<256;i+=4){c.fillStyle='#ffffff12';c.fillRect(i,0,1,256);c.fillStyle='#0000000b';c.fillRect(0,i,256,1);}}
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;material.map=texture;
  }
  this.materialCache.set(signature,material);return material;
 }
 box(g,w,h,d,x,y,z,mat){const mesh=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.001,w),Math.max(.001,h),Math.max(.001,d)),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;}
 cylinder(g,r,h,x,y,z,mat){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,32),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;}
 sphere(g,r,x,y,z,mat,scale=[1,1,1]){const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,20,12),mat);mesh.position.set(x,y,z);mesh.scale.set(...scale);mesh.castShadow=true;g.add(mesh);return mesh;}
 wallGeometry(g,project,pose,item,mat){
  const openings=project.objects.filter(o=>o.wallId===item.id).map(o=>({o,left:Math.max(-pose.w/2,o.offset-o.w/2),right:Math.min(pose.w/2,o.offset+o.w/2)})).filter(o=>o.right>o.left).sort((a,b)=>a.left-b.left);
  const boundaries=[-pose.w/2,pose.w/2,...openings.flatMap(o=>[o.left,o.right])].sort((a,b)=>a-b);
  for(let i=0;i<boundaries.length-1;i++){
   const a=boundaries[i],b=boundaries[i+1];if(b-a<.001)continue;const center=(a+b)/2;
   const gaps=openings.filter(o=>center>o.left&&center<o.right).map(({o})=>[Math.max(0,o.sill||0),Math.min(pose.h,(o.sill||0)+o.h)]).filter(([lo,hi])=>hi>lo).sort((u,v)=>u[0]-v[0]);
   let bottom=0;for(const [lo,hi] of gaps){if(lo>bottom)this.box(g,b-a,lo-bottom,item.d,center,(bottom+lo)/2,0,mat);bottom=Math.max(bottom,hi);}if(bottom<pose.h)this.box(g,b-a,pose.h-bottom,item.d,center,(bottom+pose.h)/2,0,mat);
  }
 }
 buildModel(g,item,mat){
  const {white,dark,metal,green,black,glass}=this.fixed;
  const box=(w,h,d,x,y,z,m=mat)=>this.box(g,w,h,d,x,y,z,m),cyl=(r,h,x,y,z,m=mat)=>this.cylinder(g,r,h,x,y,z,m);
  const legs=(top=.85)=>{for(const x of [-.40,.40])for(const z of [-.38,.38])box(.06,top,.06,x,top/2,z);};
  switch(item.type){
   case 'room':case 'surface':case 'rug':box(1,1,1,0,.5,0);break;
   case 'door':box(.86,.96,.50,0,.48,0);for(const x of [-.47,.47])box(.06,1,1,x,.5,0,dark);box(1,.045,1,0,.98,0,dark);this.sphere(g,.025,.33,.48,-.35,metal);break;
   case 'window':box(.92,.91,.14,0,.5,0);for(const x of [-.47,.47])box(.06,1,1,x,.5,0,white);for(const y of [.025,.975])box(1,.05,1,0,y,0,white);break;
   case 'bed':box(.98,.32,.94,0,.20,0,dark);box(1,.29,.97,0,.48,0);box(.98,.06,.97,0,.65,0,white);box(1,.75,.06,0,.60,-.48);for(const x of [-.25,.25])box(.42,.10,.19,x,.76,-.31,white);box(1,.075,.34,0,.73,.28);break;
   case 'sofa':case 'daybed':legs(.22);box(1,.25,1,0,.36,0);box(.96,.22,.90,0,.58,0);if(item.type==='sofa'){box(1,.55,.18,0,.70,-.41);for(const x of [-.45,.45])box(.1,.55,1,x,.53,0);}break;
   case 'chair':legs(.47);box(1,.10,1,0,.52,0);box(1,.45,.12,0,.78,-.42);break;
   case 'table':legs(.90);box(1,.10,1,0,.95,0);break;
   case 'round-table':cyl(.5,.10,0,.95,0);cyl(.065,.87,0,.48,0);cyl(.33,.055,0,.04,0);break;
   case 'wardrobe':case 'fridge':box(1,1,1,0,.5,0);for(const x of [-.24,.24]){box(.46,.88,.04,x,.5,.52,item.type==='fridge'?mat:dark);box(.023,.15,.028,x<0?-.04:.04,.55,.56,metal);}break;
   case 'shelf':for(const x of [-.47,.47])box(.06,1,1,x,.5,0);for(let i=0;i<5;i++){box(1,.025,1,0,i*.24,0);for(let j=0;j<5;j++)box(.09,.16,.70,-.32+j*.14,i*.24+.10,0,j%2?mat:dark);}break;
   case 'rack':for(const x of [-.46,.46]){box(.025,.94,.035,x,.49,0);box(.15,.03,.95,x,.025,0);}box(.94,.025,.04,0,.95,0);for(let i=0;i<7;i++)box(.09,.45,.66,-.33+i*.11,.70,0,i%2?mat:dark);break;
   case 'counter':box(1,.92,1,0,.46,0);box(1.03,.08,1.03,0,.96,0,white);break;
   case 'stove':box(1,.92,1,0,.46,0);box(1,.06,1,0,.96,0,black);for(const x of [-.25,.25])for(const z of [-.25,.25])cyl(.14,.012,x,1,z,dark);box(.72,.5,.025,0,.45,.515,black);break;
   case 'sink':case 'bathtub':{
    box(1,.8,1,0,.40,0);box(.88,.12,.85,0,.85,0,dark);for(const x of [-.46,.46])box(.08,.22,1,x,.87,0);for(const z of [-.46,.46])box(.86,.22,.08,0,.87,z);box(.03,.24,.035,.25,1.04,-.38,metal);box(.03,.035,.16,.25,1.15,-.30,metal);break;
   }
   case 'washer':box(1,1,1,0,.5,0);{const ring=cyl(.32,.03,0,.43,.51,dark);ring.rotation.x=Math.PI/2;const inner=cyl(.24,.035,0,.43,.54,glass);inner.rotation.x=Math.PI/2;}box(.90,.11,.02,0,.88,.51,metal);break;
   case 'toilet':box(.55,.35,.45,0,.20,.04);this.sphere(g,.39,0,.44,-.12,mat,[1,.40,1]);{const seat=new THREE.Mesh(new THREE.TorusGeometry(.30,.048,12,36),white);seat.rotation.x=-Math.PI/2;seat.position.set(0,.61,-.13);g.add(seat);}box(.88,.45,.25,0,.73,.34);box(.91,.04,.28,0,.98,.34);break;
   case 'shower':box(1,.06,1,0,.03,0,white);box(.015,.9,1,-.49,.51,0,glass);box(1,.9,.015,0,.51,-.49,glass);box(.025,.9,.025,-.49,.51,.49,metal);box(.025,.65,.03,.35,.63,-.45,metal);box(.03,.025,.25,.35,.95,-.34,metal);cyl(.12,.012,.35,.93,-.23,metal);break;
   case 'stairs':for(let i=0;i<14;i++){const h=(i+1)/14;box(1,h,1/14,0,h/2,.5-(i+.5)/14);}for(const x of [-.47,.47])for(let i=1;i<14;i+=3)box(.025,.32,.025,x,i/14+.16,.5-i/14,metal);break;
   case 'roof':{
    const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute([-.5,0,-.5,.5,0,-.5,0,1,-.5,-.5,0,.5,.5,0,.5,0,1,.5],3));geom.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,2,5,4,2,4,1,0,1,4,0,4,3]);geom.computeVertexNormals();const mesh=new THREE.Mesh(geom,mat);mesh.castShadow=true;g.add(mesh);break;
   }
   case 'plant':cyl(.32,.30,0,.15,0,dark);box(.045,.50,.045,0,.47,0,green);for(const [x,y,z] of [[-.18,.55,0],[.17,.65,.05],[0,.82,-.08]])this.sphere(g,.25,x,y,z,mat,[1,1.1,1]);break;
   case 'light':cyl(.48,.65,0,.40,0);cyl(.32,.2,0,.08,0,white);break;
   case 'tv':box(1,1,.7,0,.5,0,black);box(.92,.87,.05,0,.5,.38,dark);break;
   default:box(1,1,1,0,.5,0);
  }
 }
 rebuild(project,allFloors=false,selectedId=null,cutaway=false){
  this.project=project;this.clear();this.floorY=floorElevation(project,project.activeFloor);this.grid.position.y=this.floorY-.022;
  const materialById=new Map(project.materials.map(m=>[m.id,this.material(m)]));
  // Dispose stale finishes after rebuilding so repeated custom material edits stay bounded.
  const signatures=new Set(project.materials.map(m=>JSON.stringify(m)));for(const [key,mat] of this.materialCache)if(!signatures.has(key)){mat.map?.dispose();mat.dispose();this.materialCache.delete(key);}
  for(const floor of project.floors){if(!allFloors&&floor.id!==project.activeFloor)continue;const y=floorElevation(project,floor.id);if(floor.slab)this.box(this.content,floor.width,.12,floor.depth,0,y-.075,0,materialById.get(floor.material));}
  for(const item of project.objects){
   if(!allFloors&&item.floorId!==project.activeFloor)continue;
   const pose=objectPose(project,item),group=new THREE.Group();group.userData.objectId=item.id;group.position.set(pose.x,floorElevation(project,item.floorId)+pose.y,pose.z);group.rotation.y=pose.rotation*Math.PI/180;this.content.add(group);this.objectGroups.set(item.id,group);
   const mat=materialById.get(item.material)||this.fixed.white;
   if(item.type==='wall')this.wallGeometry(group,project,cutaway&&this.mode==='3d'?{...pose,h:Math.min(pose.h,.85)}:pose,item,mat);
   else{group.scale.set(item.w,item.h,item.d);this.buildModel(group,item,mat);}
  }
  this.select(selectedId);
 }
 select(id){this.selected=id;const group=this.objectGroups.get(id);this.selectionBox.visible=!!group;if(group){group.updateWorldMatrix(true,true);this.selectionBox.setFromObject(group);}}
 point(event,y=this.floorY){const rect=this.renderer.domElement.getBoundingClientRect();this.mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.mouse,this.camera);const hit=new THREE.Vector3();return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-y),hit);}
 pick(event){this.point(event);for(const hit of this.ray.intersectObjects([...this.objectGroups.values()],true)){let obj=hit.object;while(obj&&!obj.userData.objectId)obj=obj.parent;const item=this.project.objects.find(o=>o.id===obj?.userData.objectId);if(item?.floorId===this.project.activeFloor)return item.id;}return null;}
 fit(project){
  const items=project.objects.filter(o=>o.floorId===project.activeFloor);const poses=items.map(o=>({...objectPose(project,o),d:o.d}));
  let minX=-5,maxX=5,minZ=-5,maxZ=5;
  if(poses.length){minX=Math.min(...poses.map(p=>p.x-Math.max(p.w,p.d)/2));maxX=Math.max(...poses.map(p=>p.x+Math.max(p.w,p.d)/2));minZ=Math.min(...poses.map(p=>p.z-Math.max(p.w,p.d)/2));maxZ=Math.max(...poses.map(p=>p.z+Math.max(p.w,p.d)/2));}
  const x=(minX+maxX)/2,z=(minZ+maxZ)/2,y=floorElevation(project,project.activeFloor),span=Math.max(maxX-minX,maxZ-minZ,5)*1.5;
  this.controls.target.set(x,y,z);this.plan.position.set(x,y+60,z);this.plan.zoom=Math.min(16/((maxZ-minZ+3)||10),(this.plan.right-this.plan.left)/(maxX-minX+3));this.plan.updateProjectionMatrix();this.perspective.position.set(x+span*.7,y+span*.85,z+span*.85);this.controls.update();
 }
}
