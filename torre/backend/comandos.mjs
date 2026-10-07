export const commands=['vincular','administrar'].map(name=>({name,type:1,description:name==='vincular'?'Vincular sua conta à carta do personagem':'Confirmar acesso administrativo à Torre de Comando',contexts:[0,1],integration_types:[0],options:[{name:'codigo',type:3,description:'Código mostrado na Torre de Comando',required:true,min_length:16,max_length:16}]}));
export async function registerCommands(api,applicationId){for(const command of commands)await api('/applications/'+applicationId+'/commands',command);}
export function createCommandHandler({api,pairAccount,authorizeAdmin}){return async i=>{
 if(i.type!==2||!['vincular','administrar'].includes(i.data?.name))return false;
 await api(`/interactions/${i.id}/${i.token}/callback`,{type:5,data:{flags:64}});
 let content;try{const code=i.data.options?.find(o=>o.name==='codigo')?.value,user=i.user||i.member?.user;if(i.data.name==='vincular'){const card=await pairAccount(code,user);content='Discord vinculado à carta '+card.name+'. Volte à Torre de Comando; o cadastro será atualizado automaticamente.';}else{await authorizeAdmin(code,user);content='Acesso confirmado. Volte à Torre de Comando e clique em “Já confirmei no Discord”.';}}catch(e){content=e.status?e.message:'Não foi possível confirmar o cadastro. Gere outro código no site.';}
 await api(`/webhooks/${i.application_id}/${i.token}/messages/@original`,{content,allowed_mentions:{parse:[]}},'PATCH');return true;
};}
