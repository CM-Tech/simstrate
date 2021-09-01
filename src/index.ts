// import * as dat from 'dat.gui';
// type MouseData = {
//     x: number;
//     y: number;
//     down: boolean;
// }
// let mouse: MouseData = { x: 0, y: 0, down: false };
// const canvas = document.getElementById("canvas") as HTMLCanvasElement;
// const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
// canvas.addEventListener("mousedown", (event) => {
//     mouse.down = true;
// });
// canvas.addEventListener("mousemove", (event) => {
//     mouse.x = event.clientX;
//     mouse.y = event.clientY;
// });

// var w = window.innerWidth;
// var h = window.innerHeight;
// const resize = () => {
//     w = window.innerWidth;
//     h = window.innerHeight;
//     canvas.width = w;
//     canvas.height = h;
// }
// window.addEventListener("resize", resize);
// class SPHConfig {
//     GRAVITY: number;
//     RANGE: number;
//     PRESSURE: number;
//     VISCOSITY: number;
//     constructor() {
//         this.GRAVITY = .125;
//         this.RANGE = 25
//         this.PRESSURE = 1
//         this.VISCOSITY = 0.05
//     }
// };
// const SPH = new SPHConfig();

// const gui = new dat.GUI();
// gui.add(SPH, "VISCOSITY").name("viscosity").max(0.5).min(0).step(0.025)
// gui.add(SPH, "GRAVITY").name("gravity").max(1).min(-1).step(0.125)
// resize();
// var col = 0;
// var RANGE2 = SPH.RANGE * SPH.RANGE;
// var DENSITY = 0.2;
// var NUM_GRIDSX = 20;
// var NUM_GRIDSY = 10;
// var INV_GRID_SIZEX = 1 / (w / NUM_GRIDSX);
// var INV_GRID_SIZEY = 1 / (h / NUM_GRIDSY);
// var particles: Particle[] = [];
// var numParticles = 0;
// var neighbors: Neighbor[] = [];
// var numNeighbors = 0;
// var count = 0;
// var grids: Grid[][] = [];
// var delta = 0;

// function tick() {
//     delta++;
// }

// function frame(e) {
//     if (mouse.down) pour();
//     var tempDelta = delta + 0;
//     delta = 0;
//     move(tempDelta);
//     ctx.clearRect(0, 0, w, h);
//     var d = draw();
//     ctx.font = "30px Arial";
// }

// function draw() {
//     ctx.fillStyle = "blue";
//     ctx.strokeStyle = "blue";
//     for (var i = 0; i < numParticles; i++) {
//         var p = particles[i];
//         ctx.fillStyle = "white";
//         ctx.beginPath();
//         ctx.arc(p.x, p.y, 16, 0, 2 * Math.PI, false);
//         ctx.fill();
//     }
//     for (var i = 0; i < numParticles; i++) {
//         var p = particles[i];
//         ctx.fillStyle = "blue";
//         ctx.beginPath();
//         ctx.arc(p.x, p.y, 14, 0, 2 * Math.PI, false);
//         var color = HSVtoRGB(p.color, 1, 1.5 - Math.sqrt(p.density * 2));
//         ctx.fillStyle = "rgba(" + color.r + "," + color.g + "," + color.b + ",01)";
//         ctx.fill();
//     }
// }

// function pour() {
//     if (count % 5 == 0) {
//         var p = new Particle(mouse.x, mouse.y);
//         p.vy = 0;
//         particles[numParticles++] = p;
//     }
// }

// function calc() {
//     updateGrids();
//     findNeighbors();
//     calcPressure();
//     calcForce();
// }

// function move(steps: number) {
//     count++;
//     for (var i = 0; i < numParticles; i++) {
//         var p = particles[i];
//         for (var j = 0; j < steps; j++) {
//             p.move();
//         }
//     }
// }

// function updateGrids() {
//     var i;
//     var j;
//     for (i = 0; i < NUM_GRIDSX; i++)
//         for (j = 0; j < NUM_GRIDSY; j++) grids[i][j].clear();
//     for (i = 0; i < numParticles; i++) {
//         var p = particles[i];
//         p.fx = p.fy = p.density = 0;
//         p.gx = Math.floor(p.x * INV_GRID_SIZEX);
//         p.gy = Math.floor(p.y * INV_GRID_SIZEY);
//         if (p.gx < 0) p.gx = 0;
//         if (p.gy < 0) p.gy = 0;
//         if (p.gx > NUM_GRIDSX - 1) p.gx = NUM_GRIDSX - 1;
//         if (p.gy > NUM_GRIDSY - 1) p.gy = NUM_GRIDSY - 1;
//         grids[p.gx][p.gy].add(p);
//     }
// }

// function findNeighbors() {
//     numNeighbors = 0;
//     for (var i = 0; i < numParticles; i++) {
//         var p = particles[i];
//         var xMin = p.gx != 0;
//         var xMax = p.gx != NUM_GRIDSX - 1;
//         var yMin = p.gy != 0;
//         var yMax = p.gy != NUM_GRIDSY - 1;
//         findNeighborsInGrid(p, grids[p.gx][p.gy]);
//         if (xMin) findNeighborsInGrid(p, grids[p.gx - 1][p.gy]);
//         if (xMax) findNeighborsInGrid(p, grids[p.gx + 1][p.gy]);
//         if (yMin) findNeighborsInGrid(p, grids[p.gx][p.gy - 1]);
//         if (yMax) findNeighborsInGrid(p, grids[p.gx][p.gy + 1]);
//         if (xMin && yMin) findNeighborsInGrid(p, grids[p.gx - 1]
//         [p.gy - 1]);
//         if (xMin && yMax) findNeighborsInGrid(p, grids[p.gx - 1]
//         [p.gy + 1]);
//         if (xMax && yMin) findNeighborsInGrid(p, grids[p.gx + 1]
//         [p.gy - 1]);
//         if (xMax && yMax) findNeighborsInGrid(p, grids[p.gx + 1]
//         [p.gy + 1]);
//     }
// }

// function findNeighborsInGrid(pi: Particle, g: Grid) {
//     for (var j = 0; j < g.numParticles; j++) {
//         var pj = g.particles[j];
//         if (pi == pj) continue;
//         var distance = (pi.x - pj.x) * (pi.x - pj.x) + (pi.y -
//             pj.y) * (pi.y - pj.y);
//         if (distance < RANGE2) {
//             if (neighbors.length == numNeighbors) neighbors[
//                 numNeighbors] = new Neighbor();
//             neighbors[numNeighbors++].setParticle(pi, pj);
//         }
//     }
// }

// function calcPressure() {
//     for (var i = 0; i < numParticles; i++) {
//         var p = particles[i];
//         if (p.density < DENSITY) p.density = DENSITY;
//         p.pressure = p.density - DENSITY;
//     }
// }

// function calcForce() {
//     for (var i = 0; i < numNeighbors; i++) {
//         var n = neighbors[i];
//         n.calcForce();
//     }
// }


// class Particle {
//     x: number;
//     y: number;
//     color: number;
//     density: number;
//     vy: number;
//     fx: number;
//     fy: number;
//     gx: number;
//     gy: number;
//     pressure: number;
//     vx: number;
//     constructor(x: number, y: number) {
//         this.x = x;
//         this.y = y;
//         this.gx = 0;
//         this.gy = 0;
//         this.vx = 0;
//         this.vy = 0;
//         this.fx = 0;
//         this.fy = 0;
//         this.density = 0;
//         this.pressure = 0;
//         this.color = 0.6;
//     }
//     move() {
//         this.vy += SPH.GRAVITY;
//         this.vx += this.fx;
//         this.vy += this.fy;
//         this.x += this.vx;
//         this.y += this.vy;
//         if (this.x < 10) this.vx += (10 - this.x) * 0.5 - this.vx * 0.5;
//         if (this.y < 10) this.vy += (10 - this.y) * 0.5 - this.vy * 0.5;
//         if (this.x > w) this.vx += (w - this.x) * 0.5 - this.vx * 0.5;
//         if (this.y > h) this.vy += (h - this.y) * 0.5 - this.vy * 0.5;
//     }
// }
// class Neighbor {
//     p1?: Particle;
//     p2?: Particle;
//     distance: number;
//     nx: number;
//     ny: number;
//     weight: number;
//     constructor() {
//         this.distance = 0;
//         this.nx = 0;
//         this.ny = 0;
//         this.weight = 0;
//     }

//     setParticle(p1: Particle, p2: Particle) {
//         this.p1 = p1;
//         this.p2 = p2;
//         this.nx = p1.x - p2.x;
//         this.ny = p1.y - p2.y;
//         this.distance = Math.sqrt(this.nx * this.nx + this.ny * this.ny);
//         this.weight = 1 - this.distance / SPH.RANGE;
//         var temp = this.weight * this.weight * this.weight;
//         p1.density += temp;
//         p2.density += temp;
//         temp = 1 / this.distance;
//         this.nx *= temp;
//         this.ny *= temp;
//     }
//     calcForce() {
//         if (!this.p1 || !this.p2) {
//             return
//         }
//         let { p1, p2 } = this;
//         var pressureWeight = this.weight * (p1.pressure + p2.pressure) /
//             (p1.density + p2.density) * SPH.PRESSURE;
//         var viscosityWeight = this.weight / (p1.density + p2.density) *
//             SPH.VISCOSITY;

//         p1.fx += this.nx * pressureWeight;
//         p1.fy += this.ny * pressureWeight;
//         p2.fx -= this.nx * pressureWeight;
//         p2.fy -= this.ny * pressureWeight;
//         var rvx = p2.vx - p1.vx;
//         var rvy = p2.vy - p1.vy;
//         p1.fx += rvx * viscosityWeight;
//         p1.fy += rvy * viscosityWeight;
//         p2.fx -= rvx * viscosityWeight;
//         p2.fy -= rvy * viscosityWeight;
//     }
// }
// class Grid {
//     particles: Particle[];
//     numParticles: number;
//     constructor() {
//         this.particles = [];
//         this.numParticles = 0;
//     }
//     clear() {
//         this.numParticles = 0;
//         this.particles = [];
//     }
//     add(p: Particle) {
//         this.particles[this.numParticles++] = p;
//     }
// }

// function HSVtoRGB(h, s, v) {
//     var r, g, b, i, f, p, q, t;
//     if (arguments.length === 1) {
//         s = h.s, v = h.v, h = h.h;
//     }
//     i = Math.floor(h * 6);
//     f = h * 6 - i;
//     p = v * (1 - s);
//     q = v * (1 - f * s);
//     t = v * (1 - (1 - f) * s);
//     switch (i % 6) {
//         case 0:
//             r = v, g = t, b = p;
//             break;
//         case 1:
//             r = q, g = v, b = p;
//             break;
//         case 2:
//             r = p, g = v, b = t;
//             break;
//         case 3:
//             r = p, g = q, b = v;
//             break;
//         case 4:
//             r = t, g = p, b = v;
//             break;
//         case 5:
//             r = v, g = p, b = q;
//             break;
//     }
//     return {
//         r: Math.round(r * 255),
//         g: Math.round(g * 255),
//         b: Math.round(b * 255)
//     };
// }
// for (var i = 0; i < NUM_GRIDSX; i++) {
//     grids[i] = new Array(NUM_GRIDSY);
//     for (var j = 0; j < NUM_GRIDSY; j++) grids[i][j] = new Grid();
// }
// canvas.addEventListener('mouseup', function (e) {
//     mouse.down = false;
// }, false);
// window.setInterval(frame, 0.01);
// window.setInterval(tick, 0.1);
// window.setInterval(calc, 1);
/*
  tags: advanced, fbo
  <p>This example shows how to update and render some simple particles on the GPU,
  creating a simple particle simulation. </p>
 */
import reglFactory from 'regl'
import mouseChange from 'mouse-change';
const dd=()=>window.devicePixelRatio??1;
  const regl =reglFactory({
    extensions: 'OES_texture_float',
    pixelRatio:dd(),
  })
  const mouse = {x:0,y:0,buttons:0};
  window.addEventListener('mousemove',(e)=>{mouse.x=e.clientX;mouse.y=e.clientY;mouse.buttons=e.buttons;})
  window.addEventListener('mousedown',(e)=>{mouse.x=e.clientX;mouse.y=e.clientY;mouse.buttons=e.buttons;})
  window.addEventListener('mouseup',(e)=>{mouse.x=e.clientX;mouse.y=e.clientY;mouse.buttons=e.buttons;})
  window.addEventListener('touchmove',(e)=>{mouse.x=e.changedTouches[0].clientX;mouse.y=e.changedTouches[0].clientY;mouse.buttons=e.touches.length;})
  window.addEventListener('touchstart',(e)=>{mouse.x=e.changedTouches[0].clientX;mouse.y=e.changedTouches[0].clientY;mouse.buttons=e.touches.length;})
  window.addEventListener('touchend',(e)=>{mouse.x=e.changedTouches[0].clientX;mouse.y=e.changedTouches[0].clientY;mouse.buttons=e.touches.length;})
  
  const N = 256
  const BLOCK_SIZE = 64
  const BB_SIZE=64;
  let BB_H=BB_SIZE;
  let BB_W=BB_SIZE;
  const INITIAL_CONDITIONS = (Array(BB_SIZE * BB_SIZE * 4)).fill(0).map(
    () => Math.random() > 0.9 ? 255 : 0)
    const substrateTX = (Array(3)).fill().map(() =>regl.texture({
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
      float l=1.0;
      vec3 ns=s*(1.0-l)+l*(n/9.0);
      vec3 col=vec3(max(ns*0.995,0.0));
      gl_FragColor = vec4(col,1);
    }`,
  
    framebuffer: ({tick},{outI}) => substrate[outI],
  
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
      position: [ -4, -4, 4, -4, 0, 4 ]
    },
  
    uniforms: {
      prevState: ({tick},{inI}) => substrate[inI],
      sshapeX:()=>BB_W, sshapeY:()=>BB_H
    },
  
    depth: { enable: false },
    // viewport:{
    //     width: BB_SIZE,
    //     height: BB_SIZE,
    // },
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
      position: [ -4, -4, 4, -4, 0, 4 ]
    },
  
    uniforms: {
      prevState: ({tick},{inI}) => {
          return substrate[inI]
      }
    },
  
    depth: { enable: false },
    framebuffer:({tick},{outI}) => substrate[outI],
    // viewport:{
    //     width: BB_SIZE,
    //     height: BB_SIZE,
    // },
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
    void main () {
      vec2 shape = vec2(shapeX, shapeY);
      vec4 prevState = texture2D(state,
        gl_FragCoord.xy / shape);
      vec2 position = prevState.xy;
      vec2 velocity = prevState.zw;
      position += 0.5 * velocity * deltaT/vec2(sshapeX,sshapeY)*max(sshapeX,sshapeY);
      if (position.x < -1.0 || position.x > 1.0) {
        velocity.x =-abs(velocity.x)*sign(position.x);
       //position.x =mod(mod(position.x*0.5+0.5,1.0)+1.0,1.0)*2.0-1.0;
      }
      if (position.y < -1.0 || position.y > 1.0) {
       velocity.y =-abs(velocity.y)*sign(position.y);
       // position.y =mod(mod(position.y*0.5+0.5,1.0)+1.0,1.0)*2.0-1.0;
      }
      vec2 dm=vec2(0.0);
      float brim=-1.0;
      for(int da=-2; da<=2; ++da){
          float aa=float(da)/8.0*3.1415926535*2.0+atan(velocity.y,velocity.x);
          vec2 dp=vec2(cos(aa),sin(aa));
        if(dot(dp,velocity)>=0.0*length(velocity)){
        float bri=(length(texture2D(substrate, position/2.0+0.5+(dp*(10.0+100.0*(0.5+position.y*0.5))+vec2(0.0,0.0))/vec2(sshapeX,sshapeY)).rgb)+1.0)*
        ((1.0*(0.25+(0.5+position.y*0.0)*0.75))*(sin(mod(position.x,sin(float(da)+position.y*100000.0)*0.01)*1000000.0)/2.0+0.5)>0.8?1000.0:1.0);//*dot(dp,velocity);
        if(bri>brim){
        dm=(dp-normalize(velocity))*bri/max(sshapeX,sshapeY);
        brim=bri;
        }
        }
    }
      
     //velocity.xy=length(velocity)>0.0?normalize(velocity):vec2(0.0);
     float ddg=length(dm);
      velocity.xy+=dm*max(1.0,brim)*0.1;//normalize(dm)*max(ddg,1.0/max(sshapeX,sshapeY))/10.0;
      //velocity.xy*=0.95;
      float an=0.01;//+(position.y*0.5+0.5)*0.5;
     velocity.xy+=an*(length(velocity)>0.0?normalize(velocity)/max(sshapeX,sshapeY):vec2(0.0));
     velocity.xy*=1.0/(1.0+an);
      position += 0.5 * velocity * deltaT/vec2(sshapeX,sshapeY)*max(sshapeX,sshapeY);
     velocity.y = velocity.y + gravity * deltaT;
      gl_FragColor = vec4(position, velocity);
    }
    `,
  
    depth: {enable: false},
  
    framebuffer: ({tick},{t}) => SPRITES[(t + 1) % 2],
//   viewport:{
//       width:N,
//       height:N,
//   },
    uniforms: {
      state: ({tick},{t}) => SPRITES[(t) % 2],


      substrate: ({tick}) => substrate[0],
      shapeX: regl.context('viewportWidth'),
      shapeY: regl.context('viewportHeight'),
      sshapeX:()=>BB_W, sshapeY:()=>BB_H,
      deltaT: 0.5*4,
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
      float a=length(sss.zw)*10.0*max(sshapeX,sshapeY);//(ggy-0.5)*10000000.0+0.50+sin(atan(sss.w,sss.z)*2.0)*0.0;//0.5+log(ggy/(1.0-ggy))*0.1;//(length(sss.zw)*max(sshapeX,sshapeY)/20.0)*2.0+sin(atan(sss.w,sss.z)*2.0)*0.0;
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
      state: ({tick},{t}) => SPRITES[t % 2],
      N: ({tick},{t}) => N,

      substrate: ({tick},{inI}) => substrate[inI],
      sshapeX:()=>BB_W, sshapeY:()=>BB_H,
    },
  
    primitive: 'points',
    blend:{enable:true,func: {
        srcRGB: 'src alpha',
        srcAlpha: 'src alpha',
        dstRGB: 'one minus src alpha',
        dstAlpha: 'one minus src alpha',
      }},
    offset: (context, {count}) => N * N - count,
    elements: null,
    count: regl.prop('count'),
    framebuffer: ({tick},{outI}) => substrate[outI],
    // viewport:{
    //     width: BB_SIZE,
    //     height: BB_SIZE,
    // },
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
  
  function toScreen (x, size, pixelRatio) {
    return Math.min(Math.max(2.0 * pixelRatio * x / size - 1.0, -0.999), 0.999)
  }
  let tt=0;
  regl.frame(({tick, drawingBufferWidth, drawingBufferHeight, pixelRatio}) => {
    const mouseX = toScreen(mouse.x, drawingBufferWidth, pixelRatio)
    const mouseY = -toScreen(mouse.y, drawingBufferHeight, pixelRatio)
  
    let n_BB_W=window.innerWidth/pixelRatio;
      let n_BB_H=window.innerHeight/pixelRatio;
      if(n_BB_W!==BB_W||n_BB_H!==BB_H){
    substrateTX.forEach((t,i)=>substrate[i]({color:t({width:n_BB_W,height:n_BB_H})}));
      BB_W=n_BB_W;
      BB_H=n_BB_H;
  }
    if (mouse.buttons) {
      for (let i = 0; i < BLOCK_SIZE; ++i) {
        BLOCK.data[4 * i] = mouseX
        BLOCK.data[4 * i + 1] = mouseY
        BLOCK.data[4 * i + 2] = 0.25 * (Math.random() - 0.5)
        BLOCK.data[4 * i + 3] = 0.25 * (Math.random() - 0.5)
      }
      SPRITES[(tick) % 2].color[0].subimage(
        BLOCK, count % N, ((count / N) | 0) % N)
      count += BLOCK_SIZE
      COUNT_DIV.innerText = Math.min(count, N * N)
    }
  for(let j=0;j<10;j++){
    updateSprites({t:tt})
  
  
    regl.clear({
      color: [0, 0, 0, 1],
      depth: 1
    })
    setupQuad({inI:0},() => {
        regl.draw()
        updateLife({outI:1})
        
      })
      setupQuad({inI:1},() => {
        regl.draw()
        updateLife({outI:0})
        
      })
      setupCQuad({inI:1,outI:0},() => {
            regl.draw()
            drawSpritePH({
                t:tt,
                outI:0,
                inI:1,
                count: Math.min(count, N * N)
              })
          
          });
          tt+=1;
        }
    //   setupQuad({inI:1},() => {
    //     regl.draw()
    //     drawSpritePH({
    //         count: Math.min(count, N * N)
    //       })
      
    //   });
   

    //   setupCQuad({inI:2,outI:0})
    // drawSprites({
    //   count: Math.min(count, N * N)
    // })
  })