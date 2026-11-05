// Shared recipes: 3 costs × 3 chassis × 3 blades = 27 finished weapons.
(function(root){
 // Older unfinished recipes can still be completed at their new tier.
 const normalizeCost=cost=>({5:3,10:6})[Number(cost)]||Number(cost);
 const imageForCost=cost=>({1:'weapons/weapon-1.png',3:'weapons/weapon-5.png',6:'weapons/weapon-10.png'})[normalizeCost(cost)];
 const tiers={1:{durability:[3,2,1],attack:1},3:{durability:[4,3,2],attack:2},6:{durability:[5,4,3],attack:4}};
 const chassis=[{id:'resistente',name:'Estrutura Resistente',tag:null},{id:'perfurante',name:'Estrutura Perfurante',tag:'trample'},{id:'veloz',name:'Estrutura Veloz',tag:'initiative'}];
 const blades=[{id:'precisa',name:'Lâmina Precisa',bonus:0,loss:0,wear:1},{id:'dentada',name:'Lâmina Dentada',bonus:-1,loss:1,wear:1,woundedBonus:2},{id:'brutal',name:'Lâmina Brutal',bonus:1,loss:1,wear:1,recoil:1}];
 function options(stage,cost){
  if(stage==='cost')return [1,3,6].map(n=>({id:String(n),name:'Arma de '+n+' Éter',text:'Custa '+n+' para jogar da mão. Equipar custa mais 1 Éter.'}));
  const tier=tiers[normalizeCost(cost)];if(!tier)return [];
  if(stage==='durability')return chassis.map((c,i)=>({...c,durability:tier.durability[i],text:tier.durability[i]+' de durabilidade'+(c.tag==='trample'?' · concede Transpassar.':c.tag==='initiative'?' · concede Iniciativa.':' · sem habilidade adicional.')}));
  if(stage==='attack')return blades.map(b=>({...b,attack:tier.attack+b.bonus,text:'+'+(tier.attack+b.bonus)+' de ataque'+(b.woundedBonus?' · +2 de ataque enquanto o Combatente equipado estiver ferido.':b.recoil?' · causa 1 de dano ao Combatente equipado após cada ataque.':' · sem efeito adicional.')+(b.loss?' · reduz a durabilidade inicial em 1 (mínimo 1).':'')}));
  return [];
 }
 function recipe(cost,chassisId,bladeId){
  cost=normalizeCost(cost);
  const structure=options('durability',cost).find(c=>c.id===chassisId),blade=options('attack',cost).find(b=>b.id===bladeId);if(!structure||!blade)throw Error('Combinação de arma inválida.');
  const durability=Math.max(1,structure.durability-blade.loss),tag=structure.tag;
  return {id:'arma-'+cost+'-'+chassisId+'-'+bladeId,name:blade.name+' '+structure.name.replace('Estrutura ',''),type:'equipment',affinity:'forja',rarity:cost===6?'soberano':cost===3?'elite':'lacaio',cost,attack:blade.attack,durability,maxDurability:durability,wear:1,woundedBonus:blade.woundedBonus||0,recoil:blade.recoil||0,effects:tag?[{op:tag}]:[],text:'Concede +'+blade.attack+' de ataque ao Combatente equipado. '+(tag==='trample'?'Concede Transpassar ao Combatente equipado. ':tag==='initiative'?'Concede Iniciativa ao Combatente equipado. ':'')+(blade.woundedBonus?'Enquanto o Combatente equipado estiver ferido, concede mais +2 de ataque. ':blade.recoil?'Após cada ataque, causa 1 de dano ao Combatente equipado. ':'')+'Equipar custa 1 Éter.',image:imageForCost(cost),imageKind:'illustration',chassis:chassisId,blade:bladeId};
 }
 root.RunaWeapons={options,recipe,tiers,imageForCost,normalizeCost};
})(globalThis);
