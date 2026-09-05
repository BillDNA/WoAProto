/* The screen's TOPBAR region: who is up, how the campaign stands, and the
   controls that are not part of a turn.

   The tug bar reads the same fieldScore the mats do, so the two agree by
   construction: solid is the score now, hatched the ceiling if every reserve
   deploys, and the cream seam is the projected front. */
'use strict';

function renderTop(){
  var st = APP.st, v = E.view(st), m = v.battle;
  var youSide = seatYou();
  var bn = 'Skirmish ' + (v.phase==='skirmish-over' ? m.skirmishIndex : m.skirmishIndex+1);
  $('skirmishTitle').innerHTML = bn + ' &middot; <i>&ldquo;'+v.mapName+'&rdquo;</i>' +
    (youSide ? '<span class="youchip '+youSide+'">YOU &middot; '+youSide.toUpperCase()+'</span>' : '');
  function pips(el, n){
    el.innerHTML='';
    for (var i=0;i<3;i++){
      var d = document.createElement('div');
      d.className = 'pip' + (i<n ? ' '+(el.id==='pipsRed'?'red':'blue') : '');
      el.appendChild(d);
    }
  }
  pips($('pipsRed'), m.wins.red);
  pips($('pipsBlue'), m.wins.blue);
  function ceiling(side){
    var cur = E.fieldScore(st, side), extra = 0, res = v.reserves(side);
    Object.keys(E.UNITS).forEach(function(t){ extra += (res[t]||0) * E.UNITS[t].worth; });
    return { cur: cur, max: cur + extra };
  }
  var R = ceiling('red'), B = ceiling('blue');
  var total = (R.max + B.max) || 1;
  function pct(x){ return (100 * x / total).toFixed(2) + '%'; }
  $('tug').innerHTML =
    '<div class="solid red" style="width:'+pct(R.cur)+'"></div>' +
    '<div class="hatch red" style="width:'+pct(R.max - R.cur)+'"></div>' +
    '<div class="seam"></div>' +
    '<div class="hatch blue" style="width:'+pct(B.max - B.cur)+'"></div>' +
    '<div class="solid blue" style="flex:1"></div>' +
    '<span class="fs" style="left:5px;">'+R.cur+'</span><span class="fs" style="right:5px;">'+B.cur+'</span>';
  // opponent mat on top, yours at the bottom next to the hand (hotseat/watch: red top, blue bottom)
  var bottom = youSide || 'blue';
  $('matRed').style.order  = bottom === 'red'  ? 3 : 1;
  $('matBlue').style.order = bottom === 'blue' ? 3 : 1;
  $('matDivider').style.order = 2;
  $('matDivider').querySelector('span').innerHTML = youSide ? '&#9670; your command &#9670;' : '&#9670;';
  var rc = $('roomchip');
  if (seatWire() && APP.net.room){
    rc.style.display = '';
    rc.innerHTML = 'Room <b>' + APP.net.room + '</b>';
    rc.title = 'The other player joins with this code';
  } else rc.style.display = 'none';
  var b = $('turnbadge');
  b.textContent = capName(v.current) + (youSide === v.current ? ' — you' : '');
  b.className = v.current;
  // conceding is a human act; a spectator has no side to give up
  $('btnConcede').style.display = (v.phase !== 'skirmish-over' && seatConcedable()) ? '' : 'none';
}
