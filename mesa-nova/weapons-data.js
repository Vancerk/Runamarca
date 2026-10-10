// Shared recipes: 3 costs × 3 chassis × 3 blades = 27 finished weapons.
(function(root){
 const imageForCost=cost=>({1:'weapons/weapon-1.png',5:'weapons/weapon-5.png',10:'weapons/weapon-10.png'})[cost];
 const tiers={1:{durability:[3,2,1],attack:1},5:{durability:[5,3,2],attack:3},10:{durability:[7,5,3],attack:5}};
 const chassis=[{id:'resistente',name:'Estrutura Resistente',tag:null},{id:'perfurante',name:'Estrutura Perfurante',tag:'trample'},{id:'veloz',name:'Estrutura Veloz',tag:'initiative'}];
 const blades=[{id:'precisa',name:'Lâmina Precisa',bonus:0,loss:0,wear:1},{id:'dentada',name:'Lâmina Dentada',bonus:-1,loss:0,wear:1,woundedBonus:2},{id:'brutal',name:'Lâmina Brutal',bonus:1,loss:0,wear:1,recoil:1}];
 function options(stage,cost){
  if(stage==='cost')return [1,5,10].map(n=>({id:String(n),name:'Arma de '+n+' Éter',text:'Custa '+n+' para jogar da mão. Equipar custa mais 1 Éter.'}));
  const tier=tiers[cost];if(!tier)return [];
  if(stage==='durability')return chassis.map((c,i)=>({...c,durability:tier.durability[i],text:tier.durability[i]+' de durabilidade'+(c.tag==='trample'?' · concede Transpassar.':c.tag==='initiative'?' · concede Iniciativa.':' · sem habilidade adicional.')}));
  if(stage==='attack')return blades.map(b=>({...b,attack:tier.attack+b.bonus,text:'+'+(tier.attack+b.bonus)+' de ataque'+(b.woundedBonus?' · +2 de ataque enquanto o portador estiver ferido.':b.recoil?' · causa 1 de dano ao portador após cada ataque.':' · sem efeito adicional.')}));
  return [];
 }
 function recipe(cost,chassisId,bladeId){
  const structure=options('durability',cost).find(c=>c.id===chassisId),blade=options('attack',cost).find(b=>b.id===bladeId);if(!structure||!blade)throw Error('Combinação de arma inválida.');
  const durability=Math.max(1,structure.durability-blade.loss),tag=structure.tag;
  return {id:'arma-'+cost+'-'+chassisId+'-'+bladeId,name:blade.name+' '+structure.name.replace('Estrutura ',''),type:'equipment',affinity:'forja',rarity:cost===10?'soberano':cost===5?'elite':'lacaio',cost,attack:blade.attack,durability,maxDurability:durability,wear:1,woundedBonus:blade.woundedBonus||0,recoil:blade.recoil||0,effects:tag?[{op:tag}]:[],text:(tag==='trample'?'Concede Transpassar. ':tag==='initiative'?'Concede Iniciativa. ':'')+(blade.woundedBonus?'Enquanto o portador estiver ferido, concede mais +2 de ataque. ':blade.recoil?'Após cada ataque, causa 1 de dano ao portador. ':'')+'Equipar custa 1 Éter.',image:imageForCost(cost),imageKind:'illustration',chassis:chassisId,blade:bladeId};
 }
 root.RunaWeapons={options,recipe,tiers,imageForCost};
})(globalThis);
