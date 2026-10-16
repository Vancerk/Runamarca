import test from 'node:test';
import assert from 'node:assert/strict';
import {newDb} from 'pg-mem';
import {createRoomPolicy,ROOM_IDLE_MS} from '../room-policy.mjs';
function setup(){const pg=newDb({noAstCoverageCheck:true}).adapters.createPg(),pool=new pg.Pool();let time=100000;const policy=createRoomPolicy({query:(...args)=>pool.query(...args),now:()=>time});return {pool,policy,advance:ms=>time+=ms,now:()=>time};}
test('3 criações compartilhadas, pausa, bloqueio persistente e desbloqueio auditado',async()=>{
 const f=setup();try{await assert.rejects(f.policy.check(null),{status:401});await Promise.all([1,2,3].map(()=>f.policy.check('user')));await assert.rejects(f.policy.check('user'),{status:429,code:'ROOM_CREATION_COOLDOWN'});for(let i=0;i<4;i++)await assert.rejects(f.policy.check('user'),{status:429});await assert.rejects(f.policy.check('user'),{status:403,code:'ROOM_CREATION_BLOCKED'});
 const restart=createRoomPolicy({query:(...args)=>f.pool.query(...args),now:f.now});f.advance(86400000);await assert.rejects(restart.check('user'),{status:403});assert.equal((await restart.list())[0].blocked,true);await restart.unblock('user','administrator');await restart.check('user');assert.equal((await f.pool.query('SELECT * FROM elysium_room_limit_audit')).rows[0].admin_id,'administrator');
 }finally{await f.pool.end();}
});
test('pausa legítima expira sem transformar a conta em bloqueada; outra conta é independente',async()=>{const f=setup();try{for(let i=0;i<3;i++)await f.policy.check('a');await assert.rejects(f.policy.check('a'),{status:429});await f.policy.check('b');f.advance(15*60000+1);await f.policy.check('a');assert.deepEqual(await f.policy.list(),[]);}finally{await f.pool.end();}});
test('limpeza usa presença, preserva conexões e remove salas abandonadas após 15 minutos',async()=>{const f=setup();try{const old={lastPresenceAt:f.now(),botTimer:setTimeout(()=>{},1000000)},connected={lastPresenceAt:f.now(),clients:new Set([{}])},active={lastPresenceAt:f.now()};const rooms=new Map([['old',old],['connected',connected],['active',active]]);f.policy.register('game',rooms);f.advance(ROOM_IDLE_MS-1);f.policy.sweep();assert.equal(rooms.size,3);f.policy.touch(active);f.advance(2);f.policy.sweep();assert.equal(rooms.has('old'),false);assert.equal(rooms.has('connected'),true);assert.equal(rooms.has('active'),true);connected.clients.clear();f.policy.touch(connected);f.policy.sweep();assert.equal(rooms.has('connected'),true);}finally{await f.pool.end();}});

test('limite global é conferido na inserção e não é ultrapassado por admissões concorrentes',async()=>{
 const pg=newDb({noAstCoverageCheck:true}).adapters.createPg(),pool=new pg.Pool(),policy=createRoomPolicy({query:(...args)=>pool.query(...args),maxRooms:1});const rooms=new Map();policy.register('test',rooms);try{await Promise.all([policy.check('a'),policy.check('b')]);policy.store(rooms,'a',{lastPresenceAt:Date.now()});assert.throws(()=>policy.store(rooms,'b',{lastPresenceAt:Date.now()}),{status:503});assert.equal(rooms.size,1);}finally{await pool.end();}
});
