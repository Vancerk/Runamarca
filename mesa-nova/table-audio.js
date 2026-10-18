/* Shared tactile sounds. Synthesized once per action, never on room re-render. */
(function(root){
 function play(context,kind,{track=()=>{},destination=context?.destination,...spatialOptions}={}){
  if(!context||context.state!=='running')return;
  if(root.RunaSfx?.play(context,kind,{track,destination,...spatialOptions}))return;
  const at=context.currentTime,bus=context.createGain(),compressor=context.createDynamicsCompressor();
  bus.gain.value=.8;compressor.threshold.value=-12;compressor.knee.value=12;compressor.ratio.value=4;compressor.attack.value=.002;compressor.release.value=.14;const space=root.RunaSfx?.spatial(context,{destination,...spatialOptions});bus.connect(compressor).connect(space?.input||destination);
  let alive=0;
  const attach=(source,nodes)=>{alive++;track(source);source.onended=()=>{source.disconnect();nodes.forEach(n=>n.disconnect());if(--alive===0){bus.disconnect();compressor.disconnect();space?.dispose();}};};
  const tone=(frequency,end,length,volume,delay=0,type='sine')=>{const o=context.createOscillator(),g=context.createGain(),t=at+delay;o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(end,t+length);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.003);g.gain.exponentialRampToValueAtTime(.0001,t+length);o.connect(g).connect(bus);attach(o,[g]);o.start(t);o.stop(t+length+.01);};
  const noise=(frequency,end,length,volume,delay=0)=>{const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*length),context.sampleRate),data=buffer.getChannelData(0);let seed=7139,brown=0;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;const white=seed/2147483648;brown=(brown+white*.04)/1.04;data[i]=white*.35+brown*2.4;}const s=context.createBufferSource(),f=context.createBiquadFilter(),g=context.createGain(),t=at+delay;s.buffer=buffer;f.type='lowpass';f.Q.value=.6;f.frequency.setValueAtTime(frequency,t);f.frequency.exponentialRampToValueAtTime(end,t+length);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.003);g.gain.exponentialRampToValueAtTime(.0001,t+length);s.connect(f).connect(g).connect(bus);attach(s,[f,g]);s.start(t);};
  if(kind==='weapon_shadow_launch'){
   noise(1100,180,.55,.16);tone(85,55,.5,.06);
  }else if(kind==='weapon_heavy_launch'){
   noise(620,180,.7,.20);tone(74,40,.55,.10);
  }else if(kind==='weapon_royal_launch'){
   noise(750,220,.65,.08);tone(196,294,.75,.06);tone(294,392,.8,.025,.08);
  }else if(kind==='weapon_dagger_land'){
   noise(1400,240,.15,.22);tone(173,112,.2,.08);tone(381,330,.35,.025);
  }else if(kind==='weapon_hammer_land'){
   noise(1900,130,.35,.4);tone(81,29,.45,.35);tone(147,61,.3,.13,0,'triangle');tone(290,265,.75,.045,.03);noise(620,120,.65,.10,.05);
  }else if(kind==='weapon_sword_land'){
   noise(1250,240,.22,.16);tone(130,78,.23,.12);for(const [i,f] of [196,294,392].entries())tone(f,f*.98,1.15-i*.13,.035,.025+i*.035);
  }else if(kind==='study_page'){
   noise(1250,380,.24,.14);noise(740,260,.16,.08,.1);tone(145,115,.15,.025,.04,'triangle');
  }else if(kind==='study_crystal'){
   tone(290,310,.65,.055);tone(435,465,.55,.028,.035);noise(650,210,.45,.025);
  }else if(kind==='study_circle'){
   noise(700,230,.9,.09);tone(146,220,.85,.045);tone(330,350,.7,.027,.12);
  }else if(kind==='hammer'){
   // Broad contact, a low body and quiet inharmonic steel; no high pitched ping.
   noise(2300,180,.32,.48);tone(92,30,.34,.4);tone(157,63,.22,.16,0,'triangle');
   tone(286,269,.75,.085,.006);tone(617,595,.55,.038,.008);tone(1093,1051,.32,.014,.01);
   noise(850,110,.55,.12,.045);
  }else if(kind==='turn'){
   // Four soft ratchet teeth, followed by the weight of a latch settling.
   for(const [i,delay] of [0,.055,.103,.145].entries()){noise(1000-i*90,210,.065,.11,delay);tone(230-i*17,120,.06,.035,delay,'triangle');}
   noise(650,110,.17,.14,.19);tone(112,52,.22,.15,.19);tone(310,285,.2,.025,.21);
  }else if(kind==='gear'||kind==='upgrade'){
   for(let i=0;i<6;i++){noise(1200,280,.055,.09,i*.115);tone(i%2?360:280,180,.07,.035,i*.115,'triangle');}
   tone(130,85,.6,.06);if(kind==='upgrade')tone(390,590,.5,.055,.25);
  }else if(kind==='barrier'||kind==='sleep'||kind==='silence'){
   noise(900,180,.65,.2);tone(kind==='sleep'?320:170,kind==='sleep'?220:105,.85,.075,0);tone(460,310,.65,.035,.1);
  }else if(kind==='anchor'){
   for(let i=0;i<4;i++){noise(1450,230,.09,.13,i*.09);tone(260+i*27,145,.17,.055,i*.09,'triangle');}tone(92,57,.5,.095,.26);noise(700,140,.32,.11,.3);
  }else if(kind==='stasis'){
   noise(1400,230,.22,.18);tone(220,110,.35,.095);for(let i=0;i<4;i++)tone(410+i*65,330+i*35,.32,.04,.15+i*.06,'triangle');
  }else if(kind==='ice'||kind==='frost'){
   noise(2100,450,.85,.2);for(let i=0;i<4;i++){noise(1700,600,.05,.08,.2+i*.07);tone(650+i*140,620+i*115,.24,.025,.21+i*.07);}tone(150,80,.55,.065);
  }else if(kind==='speed'){
   noise(350,2100,.7,.2);tone(90,320,.68,.09,0,'triangle');tone(180,510,.52,.03,.12);
  }else if(kind==='coating'||kind==='volatile'||kind==='fault'){
   noise(700,110,.65,.24);tone(100,50,.5,.1);tone(240,310,.65,.04,.12);if(kind==='fault')for(let i=0;i<3;i++)noise(1800,300,.09,.15,i*.13);
  }else if(kind==='mirror'||kind==='memory'){
   for(let i=0;i<3;i++)tone(310+i*105,300+i*105,.7,.065,.07*i);noise(1000,180,.55,.09);
  }else if(kind==='yin'||kind==='curse'){
   tone(170,70,.85,.13);tone(245,150,.6,.05,.08);noise(600,130,.75,.12);
  }else if(kind==='yang'||kind==='aura'||kind==='growth'){
   [220,330,440].forEach((f,i)=>tone(f,f*1.04,.65,.07,i*.09));noise(750,200,.6,.09);
  }else if(kind==='tribal'||kind==='geometry'||kind==='rally'||kind==='taunt'){
   for(let i=0;i<3;i++){tone(95-i*12,43,.19,.16,i*.15);noise(900,180,.18,.11,i*.15);}tone(210,145,.5,.055,.14);
  }else if(kind==='armor'){
   noise(540,120,.55,.09);tone(210,150,.65,.045);tone(420,280,.4,.02,.06);
  }else if(kind==='fuse'){
   noise(1100,320,.14,.045);noise(1800,480,.06,.018,.1);
  }else if(kind==='timeout'){
   noise(900,110,.5,.32);tone(90,32,.5,.22);tone(190,70,.3,.07,0,'triangle');
  }else if(kind==='veronica'||kind==='pierce'||kind==='pull'||kind==='fundamental'){
   tone(180,90,.35,.13);noise(1200,220,.45,.15);tone(340,kind==='fundamental'?85:510,.45,.065,.15,'triangle');
  }
 }
 root.RunaTableAudio={hammer:(context,options)=>play(context,'hammer',options),turn:(context,options)=>play(context,'turn',options),effect:(context,kind,options)=>play(context,kind,options)};
})(globalThis);
