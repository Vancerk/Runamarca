import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {accountDatabase} from '../../accounts.mjs';
import {openTutorialStore} from './tutorial-store.mjs';

export function validateStoredTutorial(data,build){
 if(data?.schema!==1||data.build!==build||!/^[a-f0-9]{24}$/.test(data.id)||!/^[a-f0-9]{64}$/.test(data.tokenHash)||![1,2,3].includes(data.activeDuel)||!data.duels?.[data.activeDuel]||!data.progress)throw Error('Checkpoint incompatível; preservado sem alterações.');
 if(Buffer.byteLength(JSON.stringify(data))>2*1024*1024)throw Error('Checkpoint acima do limite.');
 for(const [duel,s] of Object.entries(data.duels))if(!['1','2','3'].includes(duel)||s?.schema!==2||s.duel!==Number(duel)||s.control?.schema!==1||s.room?.simulation!=='tutorial'||s.room.players?.length!==2||!Array.isArray(s.receipts)||s.receipts.length>128)throw Error('Checkpoint inválido; preservado sem alterações.');
 return data;
}
export async function openProductionTutorialStore({build,database,directory}={}){
 if(database||process.env.DATABASE_URL){
  const db=database||accountDatabase();
  await db.query('CREATE TABLE IF NOT EXISTS runamarca_tutorial_saves (token_hash TEXT PRIMARY KEY, payload JSONB NOT NULL, revision INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  const revisions=new Map();
  return {kind:'postgres',async get(tokenHash){const {rows}=await db.query('SELECT payload,revision FROM runamarca_tutorial_saves WHERE token_hash=$1',[tokenHash]);if(!rows[0])return null;const data=validateStoredTutorial(rows[0].payload,build);revisions.set(tokenHash,rows[0].revision);return data;},async write(data){
   validateStoredTutorial(data,build);const expected=revisions.get(data.tokenHash)||0;
   const {rows}=expected?await db.query('UPDATE runamarca_tutorial_saves SET payload=$2,revision=revision+1,updated_at=NOW() WHERE token_hash=$1 AND revision=$3 RETURNING revision',[data.tokenHash,JSON.stringify(data),expected]):await db.query('INSERT INTO runamarca_tutorial_saves(token_hash,payload,revision,updated_at) VALUES($1,$2,1,NOW()) ON CONFLICT(token_hash) DO NOTHING RETURNING revision',[data.tokenHash,JSON.stringify(data)]);
   if(rows.length!==1)throw Error('Outro processo atualizou este salvamento. O estado anterior não será sobrescrito.');revisions.set(data.tokenHash,rows[0].revision);
  },async close(){}};
 }
 // Render's filesystem is ephemeral: never silently advertise durable saves there.
 if(process.env.RENDER||process.env.RENDER_SERVICE_ID)throw Error('O tutorial precisa do banco persistente já usado pelo portal.');
 const folder=directory||process.env.RUNAMARCA_TUTORIAL_DIR||fileURLToPath(new URL('../../runtime/tutorial',import.meta.url));
 const local=openTutorialStore(path.resolve(folder),{build});
 return {kind:'local',async get(tokenHash){return local.readAll().find(d=>d.tokenHash===tokenHash)||null;},async write(data){local.write(data);},async close(){local.close();}};
}
