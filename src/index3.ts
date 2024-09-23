import * as dat from 'dat.gui';
import workletURL from './np2.js?url'
import pluckSrc from './pluck.ogg?url'
class Config {
  SPEED_MULT: number;
  ALWAYS_SPAWN: boolean;
  MAX_RES: number;
  NOISE_MAGNITUDE: number;
  NOISE_FREQUENCY: number;
  BLUR_FACTOR: number;
  constructor() {
    this.SPEED_MULT = 1;
    this.ALWAYS_SPAWN = false;
    this.MAX_RES = 1024;
    this.NOISE_MAGNITUDE = 2;
    this.NOISE_FREQUENCY = 0.5;
    this.BLUR_FACTOR = 1;
  }
};
const CONFIG = new Config();

import reglFactory from 'regl'
const regl = reglFactory({
  extensions: 'OES_texture_float',
})

const gui = new dat.GUI();

const SPEED_MULT_GUI=gui.add(CONFIG, "SPEED_MULT").name("base speed").max(5).min(0.25).step(0.05)
const NOISE_MAGNITUDE_GUI=gui.add(CONFIG, "NOISE_MAGNITUDE").name("noise mag").max(10).min(0.0).step(0.01)

const NOISE_FREQUENCY_GUI=gui.add(CONFIG, "NOISE_FREQUENCY").name("noise frequency").max(1).min(0.0).step(0.01)

const MAX_RES_GUI=gui.add(CONFIG, "MAX_RES").name("max res").max(4096).min(256).step(256)
gui.add(CONFIG, "ALWAYS_SPAWN").name("always spawn")
gui.add(CONFIG, "BLUR_FACTOR").name("blur factor").max(1).min(0.0).step(0.01)
const mouse = { x: 0, y: 0, buttons: 0 };
let mouse_v={x:1,y:1};

const canvas = regl._gl.canvas;
canvas.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.buttons = e.buttons; })
canvas.addEventListener('mousedown', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.buttons = e.buttons; })
canvas.addEventListener('mouseup', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.buttons = e.buttons; })
canvas.addEventListener('touchmove', (e) => { mouse.x = e.changedTouches[0].clientX; mouse.y = e.changedTouches[0].clientY; mouse.buttons = e.touches.length; })
canvas.addEventListener('touchstart', (e) => { mouse.x = e.changedTouches[0].clientX; mouse.y = e.changedTouches[0].clientY; mouse.buttons = e.touches.length; })
canvas.addEventListener('touchend', (e) => { mouse.x = e.changedTouches[0].clientX; mouse.y = e.changedTouches[0].clientY; mouse.buttons = e.touches.length; })

const N = 64
const BLOCK_SIZE = 64
const BB_SIZE = 64;
let BB_H = BB_SIZE;
let BB_W = BB_SIZE;
const INITIAL_CONDITIONS = (Array(BB_SIZE * BB_SIZE * 4)).fill(0).map(
  () => Math.random() > 0.9 ? 255 : 0)
const substrateTX = (Array(3)).fill().map(() => regl.texture({
  width: BB_SIZE,
  height: BB_SIZE,
  data: INITIAL_CONDITIONS,
  wrap: 'repeat'
}));
const substrate = substrateTX.map((color) =>
  regl.framebuffer({
    color,
    depthStencil: false
  }))

const updateLife = regl({
  frag: `
    precision mediump float;
    uniform sampler2D prevState;

    uniform float sshapeX, sshapeY;
    uniform float blurFac;
    varying vec2 uv;
    void main() {
      vec3 n = vec3(0.0);
      for(int dx=-1; dx<=1; ++dx)
      for(int dy=-1; dy<=1; ++dy) {
        n += texture2D(prevState, uv+vec2(dx,dy)/vec2(sshapeX,sshapeY)).rgb;
      }
      vec3 s = texture2D(prevState, uv).rgb;
      float l=blurFac;
      vec3 ns=s*(1.0-l)+l*((n)/9.0);
      vec3 col=vec3(max(ns-1.0/255.0,0.0));
      gl_FragColor = vec4(col,1);
    }`,

  framebuffer: ({ tick }, { outI }) => substrate[outI],
  uniforms: {
    blurFac: () => CONFIG.BLUR_FACTOR,
  }

})

const setupQuad = regl({
  frag: `
    precision mediump float;
    uniform sampler2D prevState;
    varying vec2 uv;
    void main() {
        vec3 state = texture2D(prevState, uv).rgb;
      gl_FragColor = vec4(vec3(state), 1);
    }`,

  vert: `
    precision mediump float;
    attribute vec2 position;
    varying vec2 uv;
    void main() {
      uv = 0.5 * (position + 1.0);
      gl_Position = vec4(position, 0, 1);
    }`,

  attributes: {
    position: [-4, -4, 4, -4, 0, 4]
  },

  uniforms: {
    prevState: ({ tick }, { inI }) => substrate[inI],
    sshapeX: () => BB_W, sshapeY: () => BB_H
  },

  depth: { enable: false },
  count: 3
})
const setupCQuad = regl({
  frag: `
    precision mediump float;
    uniform sampler2D prevState;
    varying vec2 uv;
    void main() {
      vec3 state = texture2D(prevState, uv).rgb;
      gl_FragColor = vec4(vec3(state), 1);
    }`,

  vert: `
    precision mediump float;
    attribute vec2 position;
    varying vec2 uv;
    void main() {
      uv = 0.5 * (position + 1.0);
      gl_Position = vec4(position, 0, 1);
    }`,

  attributes: {
    position: [-4, -4, 4, -4, 0, 4]
  },

  uniforms: {
    prevState: ({ tick }, { inI }) => {
      return substrate[inI]
    }
  },

  depth: { enable: false },
  framebuffer: ({ tick }, { outI }) => substrate[outI],
  count: 3
})

const SPRITES = Array(2).fill().map(() =>
  regl.framebuffer({
    radius: N,
    colorType: 'float',
    depthStencil: false
  }))

const updateSprites = regl({
  vert: `
    precision mediump float;
    attribute vec2 position;
    void main () {
      gl_Position = vec4(position, 0, 1);
    }
    `,

  frag: `
    precision highp float;
    uniform sampler2D state;
    uniform sampler2D substrate;
    uniform float shapeX, shapeY, deltaT, gravity;

    uniform float sshapeX, sshapeY;
    uniform float speedMult;
    uniform float noiseSize;
    uniform float noiseF;
    float PHI = 1.61803398874989484820459 * 00000.1; // Golden Ratio   
float PI  = 3.14159265358979323846264 * 00000.1; // PI
float SRT = 1.41421356237309504880169 * 10000.0; // Square Root of Two


float random_0t1(in vec2 coordinate, in float seed)
{
    return fract(sin(dot(coordinate*seed, vec2(PHI, PI)))*SRT);
}
float briC(in vec3 color)
{
    return color.x+color.y+color.z;
}
    void main () {
      vec2 res=vec2(sshapeX,sshapeY);
      vec2 shape = vec2(shapeX, shapeY);
      vec4 prevState = texture2D(state,
        gl_FragCoord.xy / shape);
      vec2 position = (prevState.xy/2.0+0.5)*res;
      vec2 velocity = prevState.zw;
      position += 0.5 * velocity * deltaT;
      if (position.x < 0.0 || position.x > res.x) {
        velocity.x =-abs(velocity.x)*sign(position.x-res.x/2.0);
       //position.x =mod(mod(position.x*0.5+0.5,1.0)+1.0,1.0)*2.0-1.0;
      }
      if (position.y < 0.0 || position.y > res.y) {
       velocity.y =-abs(velocity.y)*sign(position.y-res.y/2.0);
       // position.y =mod(mod(position.y*0.5+0.5,1.0)+1.0,1.0)*2.0-1.0;
      }
      vec2 dm=vec2(0.0);
      float brim=-1.0;
      float cc=(briC(texture2D(substrate, position/res).rgb));
      for(int da=-1; da<=1; ++da){
          float aa=float(da)/6.0*3.1415926535*2.0+atan(velocity.y,velocity.x);
          vec2 dp=vec2(cos(aa),sin(aa));
        if(dot(dp,velocity)>=0.0*length(velocity)){
        float bri=(briC(texture2D(substrate, position/res+(dp*(10.0 )+vec2(0.0,0.0))/res).rgb))+1.0;
        float rd=mod(mod(random_0t1(position,float(da+20)),1.0)+1.0,1.0);
        float no=mod(mod(random_0t1(position.yx,float(da+30)),1.0)+1.0,1.0);;
        if(rd<noiseF)
        bri*=1.0+no*noiseSize;
        if(bri>brim){
        dm=dp;//*bri;//(dp-normalize(velocity))*bri;
        brim=bri;
        }
        }
    }
      
     //velocity.xy=length(velocity)>0.0?normalize(velocity):vec2(0.0);
     float ddg=length(dm);
      //velocity.xy+=(dm-normalize(velocity)*dot(normalize(velocity),dm))*(brim)/(cc+brim)*speedMult;//*max(1.0,brim)*0.1;//normalize(dm)*max(ddg,1.0/max(sshapeX,sshapeY))/10.0;
      float anO=0.05;//+(position.y*0.5+0.5)*0.5;
      velocity.xy+=anO*normalize(dm)*((brim)/(cc+brim)*2.0+1.0)/2.0*speedMult;//*max(1.0,brim)*0.1;//normalize(dm)*max(ddg,1.0/max(sshapeX,sshapeY))/10.0;
      velocity.xy*=1.0/(1.0+anO);
      float an=0.005;//+(position.y*0.5+0.5)*0.5;
     velocity.xy+=an*(length(velocity)>0.0?normalize(velocity)*speedMult:vec2(0.0));
     velocity.xy*=1.0/(1.0+an);
      position += 0.5 * velocity * deltaT;
     //velocity.y = velocity.y + gravity * deltaT;
      gl_FragColor = vec4(position.xy/res.xy*2.0-1.0, velocity);
    }
    `,

  depth: { enable: false },

  framebuffer: ({ tick }, { t }) => SPRITES[(t + 1) % 2],

  uniforms: {
    state: ({ tick }, { t }) => SPRITES[(t) % 2],


    substrate: ({ tick }) => substrate[0],
    shapeX: regl.context('viewportWidth'),
    shapeY: regl.context('viewportHeight'),
    sshapeX: () => BB_W, sshapeY: () => BB_H,
    speedMult: () => CONFIG.SPEED_MULT,
    noiseSize: () => CONFIG.NOISE_MAGNITUDE,
    noiseF: () => CONFIG.NOISE_FREQUENCY,
    deltaT: 1,
    gravity: 0.00
  },

  attributes: {
    position: [
      0, -4,
      4, 4,
      -4, 4
    ]
  },
  primitive: 'triangles',
  elements: null,
  offset: 0,
  count: 3
})

//   const drawSprites = regl({
//     vert: `
//     precision highp float;
//     attribute vec2 sprite;
//     uniform sampler2D state;
//     varying vec2 rg;
//     void main () {
//       vec2 position = texture2D(state, sprite).xy;
//       gl_PointSize = 1.0;
//       rg = sprite;
//       gl_Position = vec4(position, 0, 1);
//     }
//     `,

//     frag: `
//     precision highp float;
//     varying vec2 rg;
//     void main () {
//       gl_FragColor = vec4(rg, 1.0 - max(rg.x, rg.y), 0.5);
//     }
//     `,

//     attributes: {
//       sprite: Array(N * N).fill().map(function (_, i) {
//         const x = i % N
//         const y = (i / N) | 0
//         return [(x / N), (y / N)]
//       }).reverse()
//     },

//     uniforms: {
//       state: ({tick}) => SPRITES[tick % 2],

//       substrate: ({tick}) => substrate[0]
//     },

//     primitive: 'points',
//     blend:{enable:true},
//     offset: (context, {count}) => N * N - count,
//     elements: null,
//     count: regl.prop('count'),
//     // viewport:{
//     //     width: BB_SIZE,
//     //     height: BB_SIZE,
//     // },
//   })

const drawSpritePH = regl({
  vert: `
    precision highp float;
    attribute vec2 sprite;
    uniform sampler2D state;
    uniform float N;
    varying vec3 rg;
    uniform float sshapeX, sshapeY;
    float briC(in vec3 color)
{
    return color.x+color.y+color.z;
}
    void main () {
        vec4 sss=texture2D(state, sprite);
        vec4 sss2=texture2D(state, sprite+vec2(0.0,1.0/N).yx);

        vec4 sss3=texture2D(state, sprite-vec2(0.0,1.0/N).yx);
      vec2 position =sss.xy;
      gl_PointSize = 1.0;
      float gg=((length(sss.zw)-min(length(sss2.zw),min(length(sss.zw),length(sss3.zw))))/
      max(abs(length(sss3.zw)-length(sss2.zw)),max(abs(length(sss3.zw)-length(sss.zw)),abs(length(sss.zw)-length(sss2.zw))))
      );
     float ggy=gg;
      float a=length(sss.zw)*3.1415926535*2.0;//(ggy-0.5)*10000000.0+0.50+sin(atan(sss.w,sss.z)*2.0)*0.0;//0.5+log(ggy/(1.0-ggy))*0.1;//(length(sss.zw)*max(sshapeX,sshapeY)/20.0)*2.0+sin(atan(sss.w,sss.z)*2.0)*0.0;
      rg = normalize(vec3(sin(a),sin(a+3.1415926535*2.0/3.0),sin(a+3.1415926535*4.0/3.0))/2.0+0.5);
      rg=rg/briC(rg);
      gl_Position = vec4(position, 0, 1);
    }
    `,

  frag: `
    precision highp float;
    varying vec3 rg;
    void main () {
      gl_FragColor = vec4(rg, 1.0);
    }
    `,

  attributes: {
    sprite: Array(N * N).fill().map(function (_, i) {
      const x = i % N
      const y = (i / N) | 0
      return [(x / N), (y / N)]
    }).reverse()
  },

  uniforms: {
    state: ({ tick }, { t }) => SPRITES[t % 2],
    N: ({ tick }, { t }) => N,

    substrate: ({ tick }, { inI }) => substrate[inI],
    sshapeX: () => BB_W, sshapeY: () => BB_H,
  },

  primitive: 'points',
  blend: {
    enable: true, func: {
      srcRGB: 'src alpha',
      srcAlpha: 'src alpha',
      dstRGB: 'one',
      dstAlpha: 'one minus src alpha',
    }
  },
  offset: (context, { count }) => N * N - count,
  elements: null,
  count: regl.prop('count'),
  framebuffer: ({ tick }, { outI }) => substrate[outI],
})

let count = 0
const BLOCK = {
  data: new Float32Array(4 * BLOCK_SIZE),
  width: BLOCK_SIZE,
  height: 1
}

const COUNT_DIV = document.createElement('div')
Object.assign(COUNT_DIV.style, {
  color: 'white',
  position: 'absolute',
  left: '20px',
  top: '20px',
  'z-index': 20
})
document.body.appendChild(COUNT_DIV)

function toScreen(x, size, pixelRatio) {
  return Math.min(Math.max(2.0 * pixelRatio * x / size - 1.0, -0.999), 0.999)
}
let pixelBuffer = [];
let oldBuffer = [];
let oldGS = [];
let mB = [];
let tt = 0;
let started=0;
const start=()=>started++>0?0:(async () => {

  const audioContext = new AudioContext()
  await audioContext.audioWorklet.addModule(workletURL)
  const whiteNoiseNode = new AudioWorkletNode(audioContext, 'white-noise-processor')
  
  var audioCtx = audioContext;

var analyser = audioCtx.createAnalyser();
  analyser.minDecibels = -90;
  analyser.maxDecibels = -10;
  analyser.smoothingTimeConstant = 0.85;

  var distortion = audioCtx.createWaveShaper();
  var gainNode = audioCtx.createGain();
  var biquadFilter = audioCtx.createBiquadFilter();
  var convolver = audioCtx.createConvolver();

  // distortion curve for the waveshaper, thanks to Kevin Ennis
  // http://stackoverflow.com/questions/22312841/waveshaper-node-in-webaudio-how-to-emulate-distortion

  function makeDistortionCurve(amount) {
    var k = typeof amount === 'number' ? amount : 50,
      n_samples = 44100,
      curve = new Float32Array(n_samples),
      deg = Math.PI / 180,
      i = 0,
      x;
    for ( ; i < n_samples; ++i ) {
      x = i * 2 / n_samples - 1;
      curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
    }
    return curve;
  };
  var soundSource;

  let ajaxRequest = new XMLHttpRequest();

  ajaxRequest.open('GET', pluckSrc, true);

  ajaxRequest.responseType = 'arraybuffer';


  ajaxRequest.onload = function() {
    var audioData = ajaxRequest.response;

    audioCtx.decodeAudioData(audioData, function(buffer) {
        soundSource = audioCtx.createBufferSource();
        convolver.buffer = buffer;
      }, function(e){ console.log("Error with decoding audio data" + e.err);});

    //soundSource.connect(audioCtx.destination);
    //soundSource.loop = true;
    //soundSource.start();
  };

  ajaxRequest.send();
whiteNoiseNode.connect(analyser)
analyser.connect(distortion);
distortion.connect(biquadFilter);
biquadFilter.connect(convolver);
convolver.connect(gainNode);
gainNode.connect(audioCtx.destination);
const major=[0,2,3,5,7,8,10];
const okI=major;
// Manipulate the Biquad filter

biquadFilter.type = "lowshelf";
// biquadFilter.frequency.setValueAtTime(1000, audioCtx.currentTime);
// biquadFilter.gain.setValueAtTime(1, audioCtx.currentTime);
  whiteNoiseNode.port.start()
  let stime = new Date().getTime();
  regl.frame(({ tick, drawingBufferWidth, drawingBufferHeight, pixelRatio }) => {
    const mouseX = toScreen(mouse.x, drawingBufferWidth, pixelRatio)
    const mouseY = -toScreen(mouse.y, drawingBufferHeight, pixelRatio)
    let mn = Math.max(window.innerWidth * pixelRatio, window.innerHeight * pixelRatio)
    let n_BB_W = Math.ceil(window.innerWidth * pixelRatio * Math.min(1, CONFIG.MAX_RES / mn));
    let n_BB_H = Math.ceil(window.innerHeight * pixelRatio * Math.min(1, CONFIG.MAX_RES / mn));
    if (n_BB_W !== BB_W || n_BB_H !== BB_H) {
      substrateTX.forEach((t, i) => substrate[i]({ color: t({ width: n_BB_W, height: n_BB_H }) }));
      BB_W = n_BB_W;
      BB_H = n_BB_H;
    }
    if (mouse.buttons || CONFIG.ALWAYS_SPAWN || tt < 100) {
      for (let i = 0; i < BLOCK_SIZE; ++i) {
        BLOCK.data[4 * i] = mouseX
        BLOCK.data[4 * i + 1] = mouseY
        BLOCK.data[4 * i + 2] = 0.25 * (Math.random() - 0.5)*mouse_v.y
        BLOCK.data[4 * i + 3] = 0.25 * (Math.random() - 0.5)*mouse_v.y
      }
      SPRITES[(tick) % 2].color[0].subimage(
        BLOCK, count % N, ((count / N) | 0) % N)
      count += BLOCK_SIZE
      COUNT_DIV.innerText = `${Math.min(count, N * N)}`
    }
    for (let j = 0; j < 2; j++) {
      updateSprites({ t: tt })


      regl.clear({
        color: [0, 0, 0, 1],
        depth: 1
      })
      setupQuad({ inI: 0 }, () => {
        regl.draw()
        updateLife({ outI: 1 })

      })
      setupQuad({ inI: 1 }, () => {
        regl.draw()
        updateLife({ outI: 0 })

      })
      setupCQuad({ inI: 1, outI: 0 }, () => {
        regl.draw()
        drawSpritePH({
          t: tt,
          outI: 0,
          inI: 1,
          count: Math.min(count, N * N)
        })

      });
      tt += 1;
      // SPRITES[0]
      // regl.renderbuffer


      if (tt % 2 == 0)
        regl({ framebuffer: SPRITES[0] })(() => {
          var pixels = regl.read()
          const vals = [...pixels.values()];
          const parts = new Array(vals.length / 4).fill(0).map((x, i) => i).filter(x => Number.isFinite(vals[x * 4])).map(x => [vals[x * 4], vals[x * 4 + 1], vals[x * 4 + 2], vals[x * 4 + 3]]);
          oldBuffer = pixelBuffer.slice();
          pixelBuffer = parts;
          if (pixelBuffer.length > 1 && oldBuffer.length > 1) {

            let q = new Date().getTime();
            let dt = Math.max(q - stime, 1);
            stime = q;
            let gs = pixelBuffer.map((x, i) => {
              const old = oldBuffer[i] ?? x;

              const oldGSI = oldGS?.[i] ?? [[1,[0]], old, { lastTurnTime: tt, plastTurnTime: tt, lastTurn: [1, 0], turnCycle: 0, turnDur: [],phase:0,turnMarks:[] }]
              const oldData = oldGSI[2];
              const dot = x;
              // if(old.includes(NaN))
              // console.log(dot,old)
              const len = Math.pow(dot[3] ** 2 + dot[2] ** 2, 0.5);
              const aC = [old[2]-dot[2],old[3]-dot[3]];
              const GA=Math.atan2(dot[3],dot[2])
              const AL=Math.hypot(...aC)/4;
              const R=len*len/AL
              const lenO = Math.pow(old[3] ** 2 + old[2] ** 2, 0.5);
              const at = Math.abs(Math.acos((dot[3] * old[3] + dot[2] * old[2]) / len / lenO)) * Math.sign((dot[2] * old[3] - dot[3] * old[2]));

              const a = Math.pow(((old[0] - dot[0]) * BB_W) ** 2 + ((old[1] - dot[1]) * BB_H) ** 2, 0.5);//Math.abs(Math.acos((dot[3]*old[3]+dot[2]*old[2])/len/lenO))*Math.sign((dot[2]*old[3]-dot[3]*old[2]));
              // let dis=Math.pow(2,(len*1)/12);
              const freq = a / 20;///Math.PI/2/(dt/1000);
              // const l=Math.max(0,Math.min(1,freq))
              // let ff=l*(4186-130)+130;
              let ogg = oldGSI[0][1][0] ?? 0;
              if (!Number.isFinite(ogg)) {
                ogg = 0;
              }
              let cRad = a / Math.sqrt(1 - Math.pow((dot[3] * old[3] + dot[2] * old[2]) / len / lenO, 2));//*Math.sign((dot[2]*old[3]-dot[3]*old[2]));
              let nw = a / (1000 / 10 / 1000) * Math.sign((dot[2] * old[3] - dot[3] * old[2]));//a/2/Math.sqrt(1-Math.pow((dot[3]*old[3]+dot[2]*old[2])/len/lenO,2))*Math.sign((dot[2]*old[3]-dot[3]*old[2]));//Math.sin(Math.abs(Math.acos((dot[3]*old[3]+dot[2]*old[2])/len/lenO)));//freq/len-1;//Math.log(freq+0.0000001);
              const dotPTT = oldData.lastTurn[0] * dot[2] + oldData.lastTurn[1] * dot[3];
              let nLTT = oldData.lastTurnTime;
              let nPLTT = oldData.plastTurnTime;
              let nLT = oldData.lastTurn;
              let nTurnCycle = oldData.turnCycle * 0.5 + at * 0.5;
              let ccy = 0.25;
              // if(Math.abs(nTurnCycle)>Math.PI*2){
              //   nTurnCycle=nTurnCycle%(Math.PI*2*ccy);
              // }

let turnMarks=oldData.turnMarks;
                      if(dotPTT<0){

// turnMarks.push(tt);
                        nTurnCycle=nTurnCycle%(Math.PI*2*ccy);

                        const dotPTT2=oldData.lastTurn[1]*dot[2]-oldData.lastTurn[0]*dot[3];
                        if(dotPTT2>=0){
              nLT=[oldData.lastTurn[1],-oldData.lastTurn[0]];

                        }else{

              nLT=[-oldData.lastTurn[1],oldData.lastTurn[0]];
                        }
                        nPLTT=nLTT+0;
                        nLTT=tt+0;
                      }
                      turnMarks.push(cRad/len);
              const di = (nLTT-nPLTT)/ccy;//Math.abs(nTurnCycle);//(nLTT-nPLTT)/ccy*0.5+0.5*oldData.turnDur;//cRad;//(((tt-nLTT)>0)?(tt-nLTT)/Math.abs(nTurnCycle)*Math.PI*2:(nLTT-nPLTT)/ccy)/200;//(tt-nLTT)*Math.PI*2>(nLTT-nPLTT)*Math.abs(nTurnCycle)?(tt-nLTT)/Math.abs(nTurnCycle)*Math.PI*2:(nLTT-nPLTT);
              const ff = 1;//Math.max(Math.max(di,oldData.turnDur)*0.125,0.25);
              const di2 = di;//oldData.turnDur+(Number.isFinite(di-oldData.turnDur)?Math.max(-ff,Math.min(di-oldData.turnDur,ff)):0);
              nw = di2 * 4000 + 110;//a*4;//1/di2*440;
              if (!Number.isFinite(nw)) {
                nw = ogg;
              }
turnMarks=turnMarks.slice(-15);
let turnDD=turnMarks.reduce((ac, b) => ac + b, 0) / turnMarks.length
              let ttt = oldData.turnDur;
              ttt.push(Math.abs(1 / cRad));
              ttt = ttt.slice(-5);
              // ttt.sort();
              const v = Math.pow(2, Math.log2(1 / (ttt.reduce((ac, b) => ac + b, 0) / ttt.length)) / 2)
              if(i===0){
              // window.k=nw;
              // window.jg=(ttt[ttt.length>>1])
              // window.v=v;
              // window.d=oldData;
              // window.turnDD=turnDD;
              // window.q=cRad/len;
              // window.spp=(nLTT-nPLTT)/ccy;
              // console.log(R,cRad)
              }
              const F=(Math.max(Math.min(R*2*1+ogg*0.0, 440 * 4), -440 * 8) ?? 1);
              const wei=1;
              return [[wei,[F]], dot, { lastTurnTime: nLTT, plastTurnTime: nPLTT, lastTurn: nLT, turnCycle: nTurnCycle, turnDur: ttt,phase:GA/Math.PI/2*0,turnMarks }]
              // [Math.pow(2,Math.floor(Math.log(Math.pow(a/Math.PI/2/(this.d/1000),1))/Math.log(2)*6+32)/12),0.5];//>0?dis:0;
            })
            oldGS = gs;

            let mx = 2;//gs.map(x=>x[0]).reduce((a,b)=>Math.max(a,b),0);
            let men = 0.;//gs.map(x=>x[0]).reduce((a,b)=>b+a,0)/gs.length;
            gs.sort((a, b) => a[0][1][0] - b[0][1][0]);
            const l = Math.min(gs.length, 24 );
            const nn=(ng)=>{
              const K=Math.log2(ng/440);
              const G=Math.floor(K);
              const rN=okI[Math.floor((K-G)*okI.length)]/12+G;
              return Math.pow(2,Math.floor(rN*12)/12)*440
            }
            // if (tt % 2 == 0)
            const mnG=gs.findIndex((x,i)=>x[0][1][0]>0 && i>=gs.length/l)
            mB=new Array(l).fill(0).map((x, i) => {
              const o = gs[Math.floor((i + 0.5) * ((gs.length - 1) / (l)))]
              const oBF5 = gs[mnG][0][1][0];//Math.floor((0.5)*(gs.length-1))][0][1][0];
              const oBF1 = gs[Math.floor((1)*(gs.length-1))][0][1][0];
              
              let newB=(tt % 8 === 0)&&((tt % (8*(Math.pow(4,i%2))) === 0))
              return newB?[o, [nn(Math.exp(Math.max(-Math.log(2)*4,Math.log(o[0][1][0]/oBF5)/Math.log(oBF1/oBF5)*Math.log(2)*3))*220)],1/24]:mB[i];//o[0][1];
            });
          
            // let clusters=gs.length>0?kmeans(gs.map(x=>x[0][1]),l):{centroids:[]};
            // window.cc=clusters
            // mB = new Array(l).fill(0).map((x, i) => {
            //   const o = gs[Math.floor((i + 0.5) * ((gs.length - 1) / (l)))]
            //   // clusters.centroids[i];
            //   return [o, clusters.centroids[i],clusters.clusters[i].points.length/gs.length]//Math.atan((Math.abs(o[0]))/440/2)*440*2+110]
            // });
          }

          // pixels.buffer
        })
    }
  })
  window.setInterval(() => {
try{

    window.mm = mB.map(x => x[1])
    whiteNoiseNode.port.postMessage({ p: mB, d: 1, t: tt })
}catch(e){

}
    // stime=q;
  }, 1000 / 44100 * 128 * 2)

// const list = document.getElementById('midi-list');
// const debugEl = document.getElementById('debug');

let isStarted = false;

function noteOn(midiNote,v) {
  
  const freq = Math.pow(2, (midiNote-69)/12)*440;
  const a=(midiNote-60+12)/12*Math.PI*2;
  const R=Math.min(window.innerWidth,window.innerHeight)/3;
  mouse.x=window.innerWidth/2+R*Math.cos(a);
  mouse.y=window.innerHeight/2+R*Math.sin(a);
  mouse_v.y=v/8;
  mouse.buttons=1;
  // oscillator.frequency.setTargetAtTime(freq, context.currentTime, 0);
  // if (!isStarted) {
  //   oscillator.start(0);
  //   isStarted = true;
  // } else {
  //   context.resume();
  // }
}

function noteOff() {

  mouse.buttons=0;
  // context.suspend();
}

function connectToDevice(device) {
  console.log('Connecting to device', device);
  device.onmidimessage = function(m) {
    const [command, key, velocity] = m.data;
    console.log([command, key, velocity])
    if (command === 144) {
      // debugEl.innerText = 'KEY UP: ' + key;
      noteOn(key,velocity);
    } else if(command === 128) {
      // debugEl.innerText = 'KEY DOWN';
      noteOff();
    }else if (command===176){
      if(key%6===2)
      SPEED_MULT_GUI.setValue(velocity/127*(5-0.25)+0.25);
      if(key%6===3)
      NOISE_MAGNITUDE_GUI.setValue(velocity/127*(7.5-0)+0);
      if(key%6===4)
      NOISE_FREQUENCY_GUI.setValue(velocity/127);
      if(key%6===5)
      MAX_RES_GUI.setValue(velocity/127*(4096/2-256)+256);
    }
  }
}

function replaceElements(inputs) {
  // while(list.firstChild) {
  //   list.removeChild(list.firstChild)
  // }
  const elements = inputs.map(e => {
        console.log(e);
        // const el = document.createElement('li')
        // el.innerText = `${e.name} (${e.manufacturer})`;
        connectToDevice.bind(null, e)();
        // el.addEventListener('click', connectToDevice.bind(null, e));
        return "";
    });

    // elements.forEach(e => list.appendChild(e));
}

navigator.requestMIDIAccess()
    .then(function(access) {
      console.log('access', access);
      replaceElements(Array.from(access.inputs.values()));
      access.onstatechange = function(e) {
        replaceElements(Array.from(this.inputs.values()));
      }

    })


  // var audioCtx = new AudioContext();
  // const bs=4096;
  // var scriptNode = audioCtx.createScriptProcessor(bs, 1, 1);
  // scriptNode.addEventListener('audioprocess', function(audioProcessingEvent) {
  //   // The input buffer is a song we loaded earlier
  //   var inputBuffer = audioProcessingEvent.inputBuffer;

  //   // The output buffer contains the samples that will be modified and played
  //   var outputBuffer = audioProcessingEvent.outputBuffer;

  //   // Loop through the output channels (in this case there is only one)
  //   for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
  //     var inputData = inputBuffer.getChannelData(channel);
  //     var outputData = outputBuffer.getChannelData(channel);

  //     // Loop through the 4096 samples
  //     for (var sample = 0; sample < inputBuffer.length; sample++) {
  //       // make output equal to the same as the input
  //       outputData[sample] = inputData[sample];

  //       // add noise to each output sample
  //       outputData[sample] += ((Math.random() * 2) - 1) * 1;
  //     }
  //   }
  // })
})();

window.addEventListener("click",start)
window.addEventListener("keydown",start)
window.addEventListener("touchstart",start)