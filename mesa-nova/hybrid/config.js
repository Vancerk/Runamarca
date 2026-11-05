// Revision 12: every presentation parameter the owner asked to tune lives here.
// Presentation only — nothing in this file is read by rules, server or bot.
const radians=d=>d*Math.PI/180,degrees=r=>r*180/Math.PI;
// Camera (revision 12). ONE explicit parameter: the angle between the camera axis and
// the vertical, in degrees. 0° looks straight down; the eye sits on the near (own)
// side of the table. Convention used by bridge.js camera(): table plane XZ, Y up,
// target [0,0,0], eye = [0, cos(tilt)·distance, sin(tilt)·distance].
// Depth is conveyed by relief, thickness, side light and shadows, not by the angle.
// Candidate for the requested overhead framing, replacing the rejected 18° view.
// This is our camera parameter, not a verified internal Hearthstone camera value.
export const CAMERA_TILT_DEGREES=0;
// Historical reference only — never read by the scene. Revision 11 derived its angle
// as atan2(16,22)·0.85⁵; the values below are what earlier revisions displayed.
export const CAMERA_HISTORY=Object.freeze({revision11:15.9855369663914,revision9:18.806514078107737,revision8:22.12531068012675,revision7:26.029777270737352,revision6:30.623267,original:degrees(Math.atan2(16,22))});
// QA-only hook: the comparison runner (scripts/hybrid12-camera.mjs) may set
// window.__HYBRID_TILT_DEGREES before the page loads to render the same table at
// another angle. Normal pages never define it; snapshot() reports when it is used.
// QA may compare 0°–45°. The camera basis handles the vertical pole explicitly.
const override=Number(globalThis.__HYBRID_TILT_DEGREES),overridden=Number.isFinite(override)&&override>=0&&override<=45,tiltDegrees=overridden?override:CAMERA_TILT_DEGREES;
export const HYBRID=Object.freeze({
 // One new linear factor over the revision-10 baseline, applied once: it multiplies
 // the play zoom chosen by the responsive fit (DOM contents, hands, reserves, panels,
 // Patrons, buttons, text), the physical board/lane size and the WebGL ornaments.
 visualScale:1.15,
 // UI-owner revision (31/10/2026): the owner asked for a closer, larger interface. The
 // targets are FINAL factors relative to the checkout that started this revision (which
 // already had visualScale 1.15 and the historical ×1.25 hand factor; neither is
 // re-applied or changed):
 //   composition 1.10 — every element of the play composition (Patrons included, so the
 //                      Patron's own 10% is this same factor, not 1.10 × 1.10);
 //   hand        1.15 — own hand during the match (replaces, does not multiply, 1.10);
 //   opening     1.25 — cards of the opening hand / mulligan (replaces 1.10).
 // The composition factor multiplies the play zoom once (zoom = fit × visualScale ×
 // composition). Where the grown desktop flow would push the rival Patron band off the
 // top, layout.js lowers the composition factor only as much as needed and reports it
 // (RunaHybridLayout.stats.composition); the hand keeps its 1.15 target independently.
 // rivalMinStrip (continuation): visible strip, in px, of every back of a nine-card
 // rival fan — the outermost back included — when the overflow crops the rival fan.
 // 17 px keeps every back at least as visible as the initial checkout's worst case
 // (16.49 px, 1280×720) and above the 16-px floor of scripts/hybrid9-hands.mjs. The
 // first version (20 px) applied to the centre back only and left outer backs at 11.8 px.
 owner:Object.freeze({composition:1.10,hand:1.15,opening:1.25,rivalMinStrip:17}),
 // Visual review V2 (03/11/2026), applied ONCE over the V1 composition above:
 //   combatLocal .85 / emanaLocal .75 — width of the combat and Emanation sockets in the field partition;
 //   global 1.25 — the general composition (play zoom: Patrons, panels, reserves, board cards) and the socket
 //   widths after the local factors. Both are limited where they do not fit: the composition by the existing
 //   fit below (layout.js reports requested/applied), the sockets by the field width available between the
 //   side panels (bridge.js reports base, local, applied global and final widths). Neither re-applies the
 //   S1–S4 or ui-owner factors, and the hand fan keeps its own target (owner.hand).
 v2:Object.freeze({combatLocal:.85,emanaLocal:.75,global:1.25}),
 // Formation addendum, block A (04/11/2026), applied ONCE over the final V2 geometry:
 //   labelFont — letter size of the "Emanação" plate as a fraction of the plate's projected height on screen;
 //     the plate is laid out at its projected size (bridge.js fitLabel), so this is the size the player sees.
 //   ring 1.15 — ability rings (and their cost badge), proportions kept: FHD 76.4 → 87.9 px; the band height does
 //     not change. portrait — Patron portrait width; 1.25 was tried (layout.js sizePatrons grows portrait, column and
 //     band together) but at 1920×1080 there is no free height between the reserve and the hand: the fit lowered the
 //     composition 1.256 → 1.174 (combat cards and reserves −6.5%, portrait only 124 px). The owner chose to keep the
 //     V2 composition and grow only the rings (04/11/2026), so it stays 1.
 //   emanaUndoV2Height — the Emanation socket keeps its V2 width and gives back in depth the V2 general factor that
 //     the composition applied: the field depth follows the composition, so the socket had become taller (FHD
 //     108.9 → 124.2 px) while narrower. Where the composition did not grow (1366×768) nothing changes.
 formA:Object.freeze({labelFont:.48,portrait:1,ring:1.15,emanaUndoV2Height:true}),
 // Formation addendum, block B (focus of the formation, hybrid/focus.js + bridge.js). Prototype values for review:
 //   max 1.12 — field expansion over the normal framing of the same screen, limited by the room available: side
 //     panels pushed out down to panelMarginPx from the screen edge; upward growth (anchored at the own reserve)
 //     into the gap to the rival reserve (keeping rivalGapPx) and by moving the rival band and reserve up until the
 //     band is rivalTopPx from the top. Phones (≤900 px) do not expand.
 //   ms 400 — entry/exit; veil .45 — darkening of the decoration (WebGL wood and props) outside the field, the own
 //     reserve and the side panels; holdMaxMs — longest wait for the last casualty flight / return after combat;
 //   mobileHandStripPx — visible strip of the lowered hand on phones during the formation.
 focus:Object.freeze({max:1.12,ms:400,panelMarginPx:14,rivalGapPx:6,rivalTopPx:16,veil:.45,holdMaxMs:4500,mobileHandStripPx:44}),
 camera:Object.freeze({tiltDegrees,tilt:radians(tiltDegrees),distance:Math.hypot(22,16),fovDegrees:43,fov:radians(43)}),
 // Relief and light (revision 12). With a near-vertical camera the side faces of the
 // boxes are almost invisible, so depth comes from cast shadows and edge shading.
 // lampElevationDegrees: lamp height over the table centre seen from it (cast shadow
 //   length = height / tan(elevation)); lampDistance: horizontal distance, world units.
 // shadowMap: resolution of the shadow pass; its frustum is fitted to the table.
 // shadowKeep: light kept inside a cast shadow (0 = black, 1 = no shadow).
 // edgeShade: darkening of vertical faces (box sides, rims, sockets).
 // cardThickness: height of the WebGL body under each board card face (world units).
 // bodyInsetPx: inset on all four sides, under the opaque rounded frame. Thin
 // card stock still casts a shadow without a second opaque plate around the face.
 relief:Object.freeze({lampElevationDegrees:27,lampDistance:16,shadowMap:2048,shadowKeep:.48,edgeShade:.2,cardThickness:.025,bodyInsetPx:19}),
 // Hover of a hand card: the single enlarged copy is sized from the hand card and the
 // viewport (never above the native preview size) and sits low, overlapping the hand.
 hover:Object.freeze({widthToHandCard:1.55,maxViewportHeight:.46,bottomInset:6,sideMargin:10,topMargin:10,mobileMaxViewportHeight:.62,introMs:120}),
 // Vertical composition: physical distance between the own Patron band and the
 // visible top of the hand fan (desktop). The hand keeps its intentional edge crop.
 // UI-owner revision: patronGap 10 → 6 px and rivalGap 6 → 3 px (less empty space next to the Patrons).
 hand:Object.freeze({patronGap:6,rivalGap:3}),
 // Combat field, measured in the 3D table plane. The equal parcel removed from each
 // lateral edge is at least minEdgeTrim (revision 9: 2.8333%) and grows on desktop
 // until both side panels respect panels.outerInsetFraction (capped at maxEdgeTrim).
 // Layout per side: C–E–C–E–C, combat width = (field − 2·emanation − 4·gutter)/3.
 // UI-owner revision: Emanation sockets wider (emanaFraction .095 → .15, emanaMaxWorld
 // 2.05 → 2.8) so the complete card text fits without an inner scroll bar; the combat
 // sockets give up that width (their card size does not depend on the socket width).
 field:Object.freeze({minEdgeTrim:.0283333333333,maxEdgeTrim:.2,gutter:.006,emanaFraction:.15,emanaFractionMobile:.16,emanaMaxWorld:2.8,emanaSlotDepth:.4,emanaCenterGap:.15,emanaLabelDepth:.08}),
 // Side panels (Nartvanyr/Registro left, Preparação/Encerrar right): physical pixels
 // between field edge and panel, and between Registro and Nartvanyr; outer inset of
 // the panels from the viewport edges as a fraction of the viewport width.
 // UI-owner revision: outerInsetFraction .115 → .07 (the owner found the lateral empty
 // space too wide); the field widens and both panels move toward the screen edges.
 // Continuation: .07 → .085. The lamp is a point light (upper right); at .07 the outer
 // combat cards moved so far out that their cast shadow on the left side became too
 // faint for scripts/hybrid12-camera.mjs ("perceptible, moderate lateral shadow": ratio
 // .935 at 1280×720 against < .93; .897 at .115). .085 keeps most of the reduction and
 // gives .923 / .899 / .876 at 1280×720 / 1920×900 / 1920×1080
 // (prototype-qa/ui-owner/tools/shadow-probe.mjs).
 panels:Object.freeze({sideGapPx:2.4,registerGapPx:.85,outerInsetFraction:.085}),
 // Compact Emanation face: illustration on top, card text below, native heart on top.
 // UI-owner revision: complete text without internal scroll. The illustration may shrink
 // down to minArtFraction and the text font steps through fontPx (screen pixels).
 emanaFace:Object.freeze({artFraction:.5,minArtFraction:.14,heartWidthOfFace:.3,minHeartPx:22,fontPx:Object.freeze({desktop:Object.freeze([11,10,9.5,9,8.5,8,7.5,7]),mobile:Object.freeze([10,9,8.5,8,7.5,7])})}),
 // Deck holders at the right end of each reserve, same physical parameters for both
 // seats (perspective makes the far one look smaller). Units: fraction of the near
 // reserve depth on the table plane. stagger (revision 12): step of each lower stack layer.
 deck:Object.freeze({depth:.8,narrowDepth:.56,aspect:1.4,gap:.2,narrowGap:.08,holderMargin:.06,stagger:.014}),
 // Opening deal (the event that hands out the first five cards) runs at 25% of the
 // normal draw duration; later draws keep the normal profile.
 draw:Object.freeze({normal:Object.freeze({rise:190,flip:170,travel:420,read:1000,readReduced:600,arrive:300}),openingFactor:.25})
});
export function snapshot(){const c=HYBRID.camera;return {visualScale:HYBRID.visualScale,owner:{...HYBRID.owner},v2:{...HYBRID.v2},formA:{...HYBRID.formA},focus:{...HYBRID.focus},camera:{tiltDegrees:c.tiltDegrees,parameter:CAMERA_TILT_DEGREES,qaOverride:overridden?override:null,measuredFrom:'vertical',distance:c.distance,fovDegrees:c.fovDegrees,history:{...CAMERA_HISTORY}},relief:{...HYBRID.relief},hover:{...HYBRID.hover},hand:{...HYBRID.hand},field:{...HYBRID.field},panels:{...HYBRID.panels},emanaFace:{...HYBRID.emanaFace},deck:{...HYBRID.deck},draw:{normal:{...HYBRID.draw.normal},openingFactor:HYBRID.draw.openingFactor}};}
window.RunaHybridConfig={snapshot,get config(){return HYBRID;}};
