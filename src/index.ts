import * as dat from 'dat.gui';

class Config {
  SPEED_MULT: number;
  ALWAYS_SPAWN: boolean;
  MAX_RES: number;
  NOISE_MAGNITUDE:number;
  NOISE_FREQUENCY:number;
  constructor() {
    this.SPEED_MULT = 0.5;
    this.ALWAYS_SPAWN = false;
    this.MAX_RES = 1024;
    this.NOISE_MAGNITUDE=2;
    this.NOISE_FREQUENCY=0.25;
  }
};
const CONFIG = new Config();

import reglFactory from 'regl'
const regl = reglFactory({
  extensions: 'OES_texture_float',
})

const gui = new dat.GUI();

gui.add(CONFIG, "SPEED_MULT").name("base speed").max(5).min(0.25).step(0.05)
gui.add(CONFIG, "NOISE_MAGNITUDE").name("noise mag").max(10).min(0.0).step(0.01)

gui.add(CONFIG, "NOISE_FREQUENCY").name("noise frequency").max(1).min(0.0).step(0.01)

gui.add(CONFIG, "MAX_RES").name("max res").max(4096).min(256).step(256)
gui.add(CONFIG, "ALWAYS_SPAWN").name("always spawn")
const mouse = { x: 0, y: 0, buttons: 0 };
window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.buttons = e.buttons; })
window.addEventListener('mousedown', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.buttons = e.buttons; })
window.addEventListener('mouseup', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.buttons = e.buttons; })
window.addEventListener('touchmove', (e) => { mouse.x = e.changedTouches[0].clientX; mouse.y = e.changedTouches[0].clientY; mouse.buttons = e.touches.length; })
window.addEventListener('touchstart', (e) => { mouse.x = e.changedTouches[0].clientX; mouse.y = e.changedTouches[0].clientY; mouse.buttons = e.touches.length; })
window.addEventListener('touchend', (e) => { mouse.x = e.changedTouches[0].clientX; mouse.y = e.changedTouches[0].clientY; mouse.buttons = e.touches.length; })

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
    varying vec2 uv;
    void main() {
      vec3 n = vec3(0.0);
      for(int dx=-1; dx<=1; ++dx)
      for(int dy=-1; dy<=1; ++dy) {
        n += texture2D(prevState, uv+vec2(dx,dy)/vec2(sshapeX,sshapeY)).rgb;
      }
      vec3 s = texture2D(prevState, uv).rgb;
      float l=0.1;
      vec3 ns=s*(1.0-l)+l*(n/9.0);
      vec3 col=vec3(max(ns-1.0/255.0,0.0));
      gl_FragColor = vec4(col,1);
    }`,

  framebuffer: ({ tick }, { outI }) => substrate[outI],

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
      for(int da=-1; da<=1; ++da){
          float aa=float(da)/6.0*3.1415926535*2.0+atan(velocity.y,velocity.x);
          vec2 dp=vec2(cos(aa),sin(aa));
        if(dot(dp,velocity)>=0.0*length(velocity)){
        float bri=(length(texture2D(substrate, position/res+(dp*(10.0 )+vec2(0.0,0.0))/res).rgb));
        float rd=mod(mod(random_0t1(position,float(da+20)),1.0)+1.0,1.0);
        float no=mod(mod(random_0t1(position.yx,float(da+30)),1.0)+1.0,1.0);;
        if(rd<noiseF)
        bri+=no*noiseSize;
        if(bri>brim){
        dm=dp;//*bri;//(dp-normalize(velocity))*bri;
        brim=bri;
        }
        }
    }
      
     //velocity.xy=length(velocity)>0.0?normalize(velocity):vec2(0.0);
     float ddg=length(dm);
      velocity.xy+=(dm-normalize(velocity)*dot(normalize(velocity),dm))*0.1;//*max(1.0,brim)*0.1;//normalize(dm)*max(ddg,1.0/max(sshapeX,sshapeY))/10.0;
      //velocity.xy*=0.95;
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
let pixelBuffer=[];
let oldBuffer=[];
let oldGS=[];
let mB=[];
let tt = 0;
const audioContext = new AudioContext()
await audioContext.audioWorklet.addModule('noise-processor.js')
const whiteNoiseNode = new AudioWorkletNode(audioContext, 'white-noise-processor')
whiteNoiseNode.connect(audioContext.destination)
whiteNoiseNode.port.start()
let stime=new Date().getTime();
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
  if (mouse.buttons || CONFIG.ALWAYS_SPAWN || tt<100) {
    for (let i = 0; i < BLOCK_SIZE; ++i) {
      BLOCK.data[4 * i] = mouseX
      BLOCK.data[4 * i + 1] = mouseY
      BLOCK.data[4 * i + 2] = 0.25 * (Math.random() - 0.5)
      BLOCK.data[4 * i + 3] = 0.25 * (Math.random() - 0.5)
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
    
  
  if(tt%10==0)
    regl({framebuffer:SPRITES[0]})(() => {
      var pixels = regl.read()
      const vals=[...pixels.values()];
      const parts=new Array(vals.length/4).fill(0).map((x,i)=>i).filter(x=>Number.isFinite(vals[x*4])).map(x=>[vals[x*4],vals[x*4+1],vals[x*4+2],vals[x*4+3]]);
      oldBuffer=pixelBuffer.slice();
      pixelBuffer=parts;
      if(pixelBuffer.length>1 && oldBuffer.length>1){
       
        let q=new Date().getTime();
let dt=Math.max(q-stime,1);
  stime=q;
    let gs=pixelBuffer.map((x,i)=>{
        const old=oldBuffer[i]??x;
        const dot=x;
        if(old.includes(NaN))
        console.log(dot,old)
        const len=Math.pow(dot[3]**2+dot[2]**2,0.5);
        const lenO=Math.pow(old[3]**2+old[2]**2,0.5);
        const a=Math.pow(((old[0]-dot[0])* BB_W)**2+((old[1]-dot[1])* BB_H)**2,0.5);//Math.abs(Math.acos((dot[3]*old[3]+dot[2]*old[2])/len/lenO))*Math.sign((dot[2]*old[3]-dot[3]*old[2]));
        // let dis=Math.pow(2,(len*1)/12);
        const freq=a/20;///Math.PI/2/(dt/1000);
        // const l=Math.max(0,Math.min(1,freq))
        // let ff=l*(4186-130)+130;
        let ogg=(oldGS?.[i]?.[0])??0;
        if(!Number.isFinite(ogg)){
ogg=0;          
        }
        let nw=a/(dt/1000)*Math.sign((dot[2]*old[3]-dot[3]*old[2]));//a/2/Math.sqrt(1-Math.pow((dot[3]*old[3]+dot[2]*old[2])/len/lenO,2))*Math.sign((dot[2]*old[3]-dot[3]*old[2]));//Math.sin(Math.abs(Math.acos((dot[3]*old[3]+dot[2]*old[2])/len/lenO)));//freq/len-1;//Math.log(freq+0.0000001);
        return [Math.max(Math.min(nw*0.5+ogg*0.5,1000),-1000)??0,dot]
        // [Math.pow(2,Math.floor(Math.log(Math.pow(a/Math.PI/2/(this.d/1000),1))/Math.log(2)*6+32)/12),0.5];//>0?dis:0;
    })
    oldGS=gs;

    let mx=2;//gs.map(x=>x[0]).reduce((a,b)=>Math.max(a,b),0);
    let men=0.;//gs.map(x=>x[0]).reduce((a,b)=>b+a,0)/gs.length;
    gs.sort((a,b)=>a[0]-b[0]);
    const l=Math.min(gs.length,64);
    // console.log(l)
    mB=new Array(l).fill(0).map((x,i)=>{  
        const o=gs[Math.floor((i+0.5)*((gs.length-1)/(l)))]
        return [o,Math.atan((Math.abs(o[0]))/440/2)*440*2+110]
    });
    }
      
      // pixels.buffer
    })
  }
})
window.setInterval(()=>{
  
  
  whiteNoiseNode.port.postMessage({p:mB,d:1})
  window.mm=mB.map(x=>x[1])
  // stime=q;
},1000/44100*128*2)
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
