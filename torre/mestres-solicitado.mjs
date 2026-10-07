import {accountDatabase,accountsConfigured,publicOrigin} from '../accounts.mjs';
import {executeClaimedFlow,readFlowResult} from './fluxo-solicitado.mjs';
import {masterTestRunner} from './backend/teste-mestres.mjs';
import {TEST_RECIPIENT} from './backend/teste-bot.mjs';
export const MASTER_JOB_ID='van-2026-10-07-master-delivery-60';
// Authorized in this chat: 5 Kallisto, 10 Kagami, 25 Van, 10 Reverso, 10 Ravena.
export async function startRequestedMasters(getRuntime){
 if(process.env.RENDER!=='true'||process.env.RENDER_GIT_BRANCH!=='main'||process.env.RENDER_EXTERNAL_HOSTNAME!=='elysiumjogos.onrender.com'||publicOrigin()!=='https://elysiumjogos.onrender.com'||process.env.DISCORD_ADMIN_ID!==TEST_RECIPIENT||!accountsConfigured())return;
 const db=accountDatabase();if((await readFlowResult(db,MASTER_JOB_ID)).status!=='not_started')return;
 const runtime=await getRuntime();
 return executeClaimedFlow(db,{waitReady:runtime.waitReady,metrics:runtime.metrics,submit:runtime.visualSubmit},{jobId:MASTER_JOB_ID,runner:async options=>{const author=await runtime.visualAuthor();return masterTestRunner(runtime.visualZones(),author)(options);},notes:['60 relatórios normais, conforme destinatários e quantidades autorizados.','Autor fictício vinculado a van_renascido; as solicitações de revisão voltam para ele.','Aprovados ficam no mapa principal; nenhum relatório é aprovado automaticamente.','Ddrodo é somente cadastrado, sem envio solicitado nesta campanha.']});
}
