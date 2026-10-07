import {accountDatabase,accountsConfigured,publicOrigin} from '../accounts.mjs';
import {executeClaimedFlow,readFlowResult} from './fluxo-solicitado.mjs';
import {visualRunner} from './backend/visual.mjs';
import {TEST_RECIPIENT} from './backend/teste-bot.mjs';
export const VISUAL_JOB_ID='van-2026-10-07-visual-all-hexagons';
// Explicit user authorization: one normal report per clickable hex, to their DM.
export async function startRequestedVisual(getRuntime){
 if(process.env.RENDER!=='true'||process.env.RENDER_GIT_BRANCH!=='main'||process.env.RENDER_EXTERNAL_HOSTNAME!=='elysiumjogos.onrender.com'||publicOrigin()!=='https://elysiumjogos.onrender.com'||process.env.DISCORD_ADMIN_ID!==TEST_RECIPIENT||!accountsConfigured())return;
 const db=accountDatabase();if((await readFlowResult(db,VISUAL_JOB_ID)).status!=='not_started')return;
 const runtime=await getRuntime();await runtime.waitReady(20000);const author=await runtime.visualAuthor();
 return executeClaimedFlow(db,{waitReady:runtime.waitReady,metrics:runtime.metrics,submit:runtime.visualSubmit},{jobId:VISUAL_JOB_ID,runner:visualRunner(runtime.visualZones(),author),notes:['Uma chegada por hexágono, todas admitidas de uma vez na fila interna.','Relatórios normais com aprovação, correção e rejeição no privado de van_renascido.','Gravados no mapa principal: aprovados serão visíveis; dados fictícios identificados no título.','Não simula ingresso HTTP, navegador, OAuth nem partidas simultâneas.']});
}
