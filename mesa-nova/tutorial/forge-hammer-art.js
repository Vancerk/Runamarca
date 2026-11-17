/* Faceted three-quarter view. Impact point: (100,84); the haft recedes diagonally. */
(function(root){
 let serial=0;
 root.RunaForgeHammerArt=()=>{const id='forge-diagonal-'+(++serial);return `<svg viewBox="0 0 300 360" aria-hidden="true"><defs>
 <linearGradient id="${id}-top" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#fff4c5"/><stop offset=".25" stop-color="#c9d4cd"/><stop offset=".7" stop-color="#748781"/><stop offset="1" stop-color="#344640"/></linearGradient>
 <linearGradient id="${id}-side" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#788b80"/><stop offset=".42" stop-color="#314b44"/><stop offset="1" stop-color="#142b27"/></linearGradient>
 <linearGradient id="${id}-gold" x1="0" y1="0" x2=".6" y2="1"><stop stop-color="#fff4c5"/><stop offset=".23" stop-color="#efd38a"/><stop offset=".5" stop-color="#b88636"/><stop offset=".8" stop-color="#71421b"/><stop offset="1" stop-color="#dfad55"/></linearGradient>
 <linearGradient id="${id}-grip" x1="0" y1="0" x2="1" y2=".2"><stop stop-color="#151711"/><stop offset=".4" stop-color="#70513a"/><stop offset=".62" stop-color="#bb8d58"/><stop offset="1" stop-color="#342e23"/></linearGradient>
 <linearGradient id="${id}-heat" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fffbe8"/><stop offset=".48" stop-color="#ffe394"/><stop offset="1" stop-color="#ea882c"/></linearGradient></defs>
 <g stroke-linejoin="round">
 <path d="M119 105 L147 96 L250 294 L242 314 L221 317 L205 303 Z" fill="url(#${id}-grip)" stroke="#151e18" stroke-width="4"/>
 <path d="M143 135 L165 125 M153 157 L176 147 M164 181 L188 168 M176 204 L199 191 M189 228 L212 214 M201 252 L224 240 M213 277 L237 263" fill="none" stroke="#221e16" stroke-width="9"/>
 <path d="M147 136 L157 141 M162 161 L172 166 M178 189 L188 194 M193 218 L203 223 M208 247 L218 252" stroke="#d2ad6a" opacity=".5" stroke-width="2"/>
 <path d="M208 295 L242 279 L252 295 L250 310 L234 325 L217 316 Z" fill="url(#${id}-gold)" stroke="#5c3b20" stroke-width="3"/>
 <path d="M216 298 L242 287 M222 314 L244 302" stroke="#fff0b2" stroke-width="2"/>
 <path d="M35 49 L72 22 L169 42 L192 67 L166 128 L137 148 L46 121 L24 91 Z" fill="url(#${id}-side)" stroke="#162923" stroke-width="5"/>
 <path d="M35 49 L72 22 L169 42 L149 72 L58 62 Z" fill="url(#${id}-top)" stroke="#e4d7a4" stroke-width="2"/>
 <path d="M149 72 L169 42 L192 67 L174 105 L166 128 L145 123 Z" fill="#162e29" stroke="#e1b66b" stroke-width="3"/>
 <path d="M58 62 L149 72 L145 123 L46 121 L24 91 L35 49 Z" fill="url(#${id}-gold)" stroke="#d3b66a" stroke-width="3"/>
 <path d="M58 72 L133 79 L129 113 L50 110 L35 89 L42 68 Z" fill="url(#${id}-side)" stroke="#f0d38c" stroke-width="2"/>
 <path d="M57 78 L119 84 L116 107 L52 103 L44 90 Z" fill="#24433a" stroke="#81958a" stroke-width="1.2"/>
 <path d="M85 78 L100 91 L81 107 L69 91 Z M70 91 Q85 81 98 91 Q85 101 70 91 Z" fill="none" stroke="#efd180" stroke-width="2.8"/>
 <path d="M50 39 L142 56 M56 45 L133 59 M53 118 L139 135 M174 64 L182 71" stroke="#fff4c4" stroke-width="2" opacity=".85"/>
 <path d="M43 48 L61 55 L53 67 L35 62 Z M145 65 L158 68 L154 120 L140 117 Z" fill="url(#${id}-gold)" stroke="#76572c" stroke-width="2"/>
 <path d="M59 31 L68 51 M145 48 L134 66" stroke="#476057" stroke-width="3"/>
 <path d="M51 38 L63 33 M93 52 L113 56 M60 105 L74 108 M153 87 L151 100" stroke="#f7e9b1" opacity=".55" stroke-width="1.4"/>
 <circle cx="43" cy="83" r="3" fill="#fff0ac"/><circle cx="132" cy="93" r="3" fill="#e8c97c"/>
 <path d="M108 130 L145 118 L159 140 L123 154 Z" fill="url(#${id}-gold)" stroke="#634521" stroke-width="3"/>
 <path d="M118 137 L148 128 M124 147 L153 137" stroke="#ffe9a4" stroke-width="2"/>
 </g><g class="forge-art-heat" opacity="0" fill="url(#${id}-heat)"><path d="M35 49 L72 22 L169 42 L192 67 L166 128 L137 148 L46 121 L24 91 Z"/><path d="M119 105 L147 96 L250 294 L242 314 L221 317 L205 303 Z"/></g></svg>`;};
 root.RunaForgeHammerStrike=(reduced=false)=>({duration:reduced?350:1040,impact:reduced?.4:.38,vanished:reduced?.90:.98,frames:reduced?[
  {opacity:0},{opacity:1,offset:.4},{opacity:1,offset:.46},{opacity:0,offset:.90},{opacity:0}
 ]:[
  {transform:'translate(68px,-145px) rotate(-38deg) scale(1.16)',opacity:0},
  {transform:'translate(50px,-118px) rotate(-32deg) scale(1.12)',opacity:1,offset:.10},
  {transform:'translate(34px,-94px) rotate(-25deg) scale(1.08)',opacity:1,offset:.25,easing:'cubic-bezier(.7,0,1,.35)'},
  {transform:'translate(0,0) rotate(0deg) scale(1)',opacity:1,offset:.38},
  {transform:'translate(9px,-16px) rotate(-4deg) scale(1.01)',opacity:1,offset:.46,easing:'ease-out'},
  {transform:'translate(22px,-37px) rotate(-10deg) scale(1.03)',opacity:1,offset:.56},
  {transform:'translate(26px,-42px) rotate(-11deg) scale(1.03)',opacity:.65,offset:.74},
  {transform:'translate(28px,-45px) rotate(-12deg) scale(1.03)',opacity:0,offset:.98},
  {transform:'translate(28px,-45px) rotate(-12deg) scale(1.03)',opacity:0}
 ]});
})(globalThis);
