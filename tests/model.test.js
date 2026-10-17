import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blankProject,addObject,removeObject,duplicateObject,wallPose,objectPose,floorElevation,validateProject,History,clone,detachObject} from '../model.js';
import {DesignRenderer} from '../renderer.js';

test('rooms create four walls that follow resizing and rotation',()=>{
 const p=blankProject(),room=addObject(p,'room',2,3);assert.equal(p.objects.length,5);
 room.w=6;room.d=4;room.rotation=90;
 const wall=p.objects.find(o=>o.side==='n');const pose=wallPose(p,wall);
 assert.equal(pose.w,6);assert.equal(pose.x,0);assert.ok(Math.abs(pose.z-3)<1e-8);
});
test('doors attach to walls, follow their movement, and can detach',()=>{
 const p=blankProject(),wall=addObject(p,'wall',0,0),door=addObject(p,'door',.5,.1);
 assert.equal(door.wallId,wall.id);wall.x=4;wall.rotation=90;
 const pose=objectPose(p,door);assert.equal(pose.x,4);assert.ok(Math.abs(pose.z+.5)<1e-8);
 detachObject(p,door);assert.equal(door.wallId,undefined);assert.equal(door.x,4);
});
test('duplicating a room copies its walls and openings with new references',()=>{
 const p=blankProject(),room=addObject(p,'room',0,0),door=addObject(p,'door',0,2);
 assert.ok(door.wallId);const next=duplicateObject(p,room.id);
 const walls=p.objects.filter(o=>o.parentRoom===next.id);assert.equal(walls.length,4);
 assert.equal(p.objects.filter(o=>walls.some(w=>w.id===o.wallId)).length,1);
 assert.notEqual(next.id,room.id);validateProject(p);
});
test('room deletion removes dependent walls and openings, keeping unrelated furniture',()=>{
 const p=blankProject(),room=addObject(p,'room',0,0);addObject(p,'window',0,2);const bed=addObject(p,'bed',0,0);
 removeObject(p,room.id);assert.deepEqual(p.objects.map(o=>o.id),[bed.id]);
});
test('floor elevations respond to floor heights',()=>{
 const p=blankProject();p.floors.push({...p.floors[0],id:'upper',name:'Upper'});assert.equal(floorElevation(p,'upper'),2.8);
 p.floors[0].height=3.4;assert.equal(floorElevation(p,'upper'),3.4);
});
test('projects round-trip and reject malformed dimensions or links',()=>{
 const p=blankProject();addObject(p,'room',0,0);addObject(p,'window',0,2);
 assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);
 const invalid=clone(p);invalid.objects[0].w=-1;assert.throws(()=>validateProject(invalid));
 const broken=clone(p);broken.objects[1].parentRoom='missing';assert.throws(()=>validateProject(broken));
});
test('undo/redo preserve materials, rotation, and object deletion',()=>{
 let p=blankProject();const item=addObject(p,'bed',0,0),history=new History();history.record(p);
 item.rotation=45;item.material='oak';const previous=history.undo(p);assert.equal(previous.objects[0].rotation,0);
 p=history.redo(previous);assert.equal(p.objects[0].rotation,45);assert.equal(p.objects[0].material,'oak');
 history.record(p);removeObject(p,item.id);assert.equal(history.undo(p).objects.length,1);
});

test('wall geometry cuts actual openings and merges overlapping cuts',()=>{
 const p=blankProject(),wall=addObject(p,'wall',0,0);wall.w=4;wall.h=3;wall.d=.2;
 for(const offset of [0,.5]){const door=addObject(p,'door',offset,0);door.w=1;door.h=2;door.offset=offset;}
 let volume=0;
 DesignRenderer.prototype.wallGeometry.call({box:(_g,w,h,d)=>{volume+=w*h*d;}},{},p,wall,wall,{});
 assert.ok(Math.abs(volume-(4*3-1.5*2)*.2)<1e-8);
});
