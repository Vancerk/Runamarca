import {randomUUID} from 'node:crypto';
export const ROOM_IDLE_MS=15*60_000;
const WINDOW=10*60_000,COOLDOWN=15*60_000;
const failure=(message,status,extra={})=>Object.assign(Error(message),{status,...extra});
export function createRoomPolicy({query,transaction=job=>job(query),now=Date.now,maxRooms=300}){
 const groups=new Map(),tails=new Map();let ready;
 const init=()=>ready??=query(`CREATE TABLE IF NOT EXISTS elysium_room_limits(discord_id TEXT PRIMARY KEY,events JSONB NOT NULL,cooldown_until BIGINT NOT NULL,violations INTEGER NOT NULL,blocked BOOLEAN NOT NULL,updated_at BIGINT NOT NULL)`).catch(error=>{ready=null;throw error;});
 const save=(row,execute=query)=>execute(`INSERT INTO elysium_room_limits(discord_id,events,cooldown_until,violations,blocked,updated_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(discord_id) DO UPDATE SET events=EXCLUDED.events,cooldown_until=EXCLUDED.cooldown_until,violations=EXCLUDED.violations,blocked=EXCLUDED.blocked,updated_at=EXCLUDED.updated_at`,[row.discord_id,JSON.stringify(row.events),row.cooldown_until,row.violations,row.blocked,now()]);
 function sweep(){for(const rooms of groups.values())for(const [key,room]of rooms){if(room.clients?.size||now()-(room.lastPresenceAt||room.updatedAt||room.createdAt||now())<ROOM_IDLE_MS)continue;clearTimeout(room.botTimer);room.revision=(room.revision||0)+1;rooms.delete(key);}}
 function serial(id,job){const result=(tails.get(id)||Promise.resolve()).then(job);const tail=result.catch(()=>{});tails.set(id,tail);void tail.then(()=>{if(tails.get(id)===tail)tails.delete(id);});return result;}
 return {
  register(name,rooms){groups.set(name,rooms);},sweep,
  store(rooms,key,room){sweep();if([...groups.values()].reduce((n,group)=>n+group.size,0)>=maxRooms)throw failure('O limite de salas simultâneas foi atingido. Tente mais tarde.',503);rooms.set(key,room);},
  touch(room){room.lastPresenceAt=now();room.createdAt??=now();},
  async check(id){if(!id)throw failure('Entre com Discord para criar uma sala.',401);return serial(id,async()=>{
   await init();const {rows}=await query('SELECT * FROM elysium_room_limits WHERE discord_id=$1',[id]);const row=rows[0]?{...rows[0],events:typeof rows[0].events==='string'?JSON.parse(rows[0].events):rows[0].events}:{discord_id:id,events:[],cooldown_until:0,violations:0,blocked:false};
   if(row.blocked)throw failure('A criação de salas está bloqueada para sua conta. Peça revisão ao administrador.',403,{code:'ROOM_CREATION_BLOCKED'});
   if(Number(row.cooldown_until)>now()){row.violations++;if(row.violations>=5)row.blocked=true;await save(row);throw failure(row.blocked?'A criação de salas foi bloqueada. Peça revisão ao administrador.':`Você está em pausa por mais ${Math.ceil((Number(row.cooldown_until)-now())/60000)} minuto(s). Novas tentativas repetidas podem bloquear a criação de salas.`,row.blocked?403:429,{retryAfter:Math.ceil((Number(row.cooldown_until)-now())/1000),code:row.blocked?'ROOM_CREATION_BLOCKED':'ROOM_CREATION_COOLDOWN'});}
   row.violations=0;row.events=row.events.filter(t=>now()-t<WINDOW);sweep();
   if([...groups.values()].reduce((n,rooms)=>n+rooms.size,0)>=maxRooms)throw failure('O limite de salas simultâneas foi atingido. Tente mais tarde.',503);
   if(row.events.length>=3){row.cooldown_until=now()+COOLDOWN;await save(row);throw failure('Você já criou 3 salas em 10 minutos. Aguarde 15 minutos para criar outra.',429,{retryAfter:900,code:'ROOM_CREATION_COOLDOWN'});}
   row.events.push(now());row.cooldown_until=0;await save(row);return id;
  }).catch(error=>{if(error.status)throw error;throw failure('Não foi possível conferir o limite de salas. Tente mais tarde.',503);});},
  async list(){await init();return (await query('SELECT discord_id,cooldown_until,violations,blocked,updated_at FROM elysium_room_limits WHERE blocked=true OR cooldown_until>$1 ORDER BY updated_at DESC',[now()])).rows;},
  async unblock(id,admin){return serial(id,async()=>{await init();await query(`CREATE TABLE IF NOT EXISTS elysium_room_limit_audit(id TEXT PRIMARY KEY,admin_id TEXT NOT NULL,target_id TEXT NOT NULL,created_at BIGINT NOT NULL)`);await transaction(async execute=>{await save({discord_id:id,events:[],cooldown_until:0,violations:0,blocked:false},execute);await execute('INSERT INTO elysium_room_limit_audit(id,admin_id,target_id,created_at) VALUES($1,$2,$3,$4)',[randomUUID(),admin,id,now()]);});});}
 };
}
