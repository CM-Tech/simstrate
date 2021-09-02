var t=Object.defineProperty,e=(e,n,o)=>(((e,n,o)=>{n in e?t(e,n,{enumerable:!0,configurable:!0,writable:!0,value:o}):e[n]=o})(e,"symbol"!=typeof n?n+"":n,o),o);import{r as n,G as o}from"./vendor.518f2100.js";!function(){const t=document.createElement("link").relList;if(!(t&&t.supports&&t.supports("modulepreload"))){for(const t of document.querySelectorAll('link[rel="modulepreload"]'))e(t);new MutationObserver((t=>{for(const n of t)if("childList"===n.type)for(const t of n.addedNodes)"LINK"===t.tagName&&"modulepreload"===t.rel&&e(t)})).observe(document,{childList:!0,subtree:!0})}function e(t){if(t.ep)return;t.ep=!0;const e=function(t){const e={};return t.integrity&&(e.integrity=t.integrity),t.referrerpolicy&&(e.referrerPolicy=t.referrerpolicy),"use-credentials"===t.crossorigin?e.credentials="include":"anonymous"===t.crossorigin?e.credentials="omit":e.credentials="same-origin",e}(t);fetch(t.href,e)}}();const i=new class{constructor(){e(this,"SPEED_MULT"),e(this,"ALWAYS_SPAWN"),e(this,"MAX_RES"),e(this,"NOISE_MAGNITUDE"),e(this,"NOISE_FREQUENCY"),e(this,"BLUR_FACTOR"),this.SPEED_MULT=1,this.ALWAYS_SPAWN=!1,this.MAX_RES=1024,this.NOISE_MAGNITUDE=2,this.NOISE_FREQUENCY=.25,this.BLUR_FACTOR=1}},s=n({extensions:"OES_texture_float"}),a=new o;a.add(i,"SPEED_MULT").name("base speed").max(5).min(.25).step(.05),a.add(i,"NOISE_MAGNITUDE").name("noise mag").max(10).min(0).step(.01),a.add(i,"NOISE_FREQUENCY").name("noise frequency").max(1).min(0).step(.01),a.add(i,"MAX_RES").name("max res").max(4096).min(256).step(256),a.add(i,"ALWAYS_SPAWN").name("always spawn"),a.add(i,"BLUR_FACTOR").name("blur factor").max(1).min(0).step(.01);const g={x:0,y:0,buttons:0},r=s._gl.canvas;r.addEventListener("mousemove",(t=>{g.x=t.clientX,g.y=t.clientY,g.buttons=t.buttons})),r.addEventListener("mousedown",(t=>{g.x=t.clientX,g.y=t.clientY,g.buttons=t.buttons})),r.addEventListener("mouseup",(t=>{g.x=t.clientX,g.y=t.clientY,g.buttons=t.buttons})),r.addEventListener("touchmove",(t=>{g.x=t.changedTouches[0].clientX,g.y=t.changedTouches[0].clientY,g.buttons=t.touches.length})),r.addEventListener("touchstart",(t=>{g.x=t.changedTouches[0].clientX,g.y=t.changedTouches[0].clientY,g.buttons=t.touches.length})),r.addEventListener("touchend",(t=>{g.x=t.changedTouches[0].clientX,g.y=t.changedTouches[0].clientY,g.buttons=t.touches.length}));const l=64;let c=64,I=64;const C=Array(16384).fill(0).map((()=>Math.random()>.9?255:0)),d=Array(3).fill().map((()=>s.texture({width:64,height:64,data:C,wrap:"repeat"}))),A=d.map((t=>s.framebuffer({color:t,depthStencil:!1}))),p=s({frag:"\n    precision mediump float;\n    uniform sampler2D prevState;\n\n    uniform float sshapeX, sshapeY;\n    uniform float blurFac;\n    varying vec2 uv;\n    void main() {\n      vec3 n = vec3(0.0);\n      for(int dx=-1; dx<=1; ++dx)\n      for(int dy=-1; dy<=1; ++dy) {\n        n += texture2D(prevState, uv+vec2(dx,dy)/vec2(sshapeX,sshapeY)).rgb;\n      }\n      vec3 s = texture2D(prevState, uv).rgb;\n      float l=blurFac;\n      vec3 ns=s*(1.0-l)+l*((n-s)/8.0);\n      vec3 col=vec3(max(ns-1.0/255.0,0.0));\n      gl_FragColor = vec4(col,1);\n    }",framebuffer:({tick:t},{outI:e})=>A[e],uniforms:{blurFac:()=>i.BLUR_FACTOR}}),m=s({frag:"\n    precision mediump float;\n    uniform sampler2D prevState;\n    varying vec2 uv;\n    void main() {\n        vec3 state = texture2D(prevState, uv).rgb;\n      gl_FragColor = vec4(vec3(state), 1);\n    }",vert:"\n    precision mediump float;\n    attribute vec2 position;\n    varying vec2 uv;\n    void main() {\n      uv = 0.5 * (position + 1.0);\n      gl_Position = vec4(position, 0, 1);\n    }",attributes:{position:[-4,-4,4,-4,0,4]},uniforms:{prevState:({tick:t},{inI:e})=>A[e],sshapeX:()=>I,sshapeY:()=>c},depth:{enable:!1},count:3}),u=s({frag:"\n    precision mediump float;\n    uniform sampler2D prevState;\n    varying vec2 uv;\n    void main() {\n      vec3 state = texture2D(prevState, uv).rgb;\n      gl_FragColor = vec4(vec3(state), 1);\n    }",vert:"\n    precision mediump float;\n    attribute vec2 position;\n    varying vec2 uv;\n    void main() {\n      uv = 0.5 * (position + 1.0);\n      gl_Position = vec4(position, 0, 1);\n    }",attributes:{position:[-4,-4,4,-4,0,4]},uniforms:{prevState:({tick:t},{inI:e})=>A[e]},depth:{enable:!1},framebuffer:({tick:t},{outI:e})=>A[e],count:3}),h=Array(2).fill().map((()=>s.framebuffer({radius:l,colorType:"float",depthStencil:!1}))),v=s({vert:"\n    precision mediump float;\n    attribute vec2 position;\n    void main () {\n      gl_Position = vec4(position, 0, 1);\n    }\n    ",frag:"\n    precision highp float;\n    uniform sampler2D state;\n    uniform sampler2D substrate;\n    uniform float shapeX, shapeY, deltaT, gravity;\n\n    uniform float sshapeX, sshapeY;\n    uniform float speedMult;\n    uniform float noiseSize;\n    uniform float noiseF;\n    float PHI = 1.61803398874989484820459 * 00000.1; // Golden Ratio   \nfloat PI  = 3.14159265358979323846264 * 00000.1; // PI\nfloat SRT = 1.41421356237309504880169 * 10000.0; // Square Root of Two\n\n\nfloat random_0t1(in vec2 coordinate, in float seed)\n{\n    return fract(sin(dot(coordinate*seed, vec2(PHI, PI)))*SRT);\n}\nfloat briC(in vec3 color)\n{\n    return color.x+color.y+color.z;\n}\n    void main () {\n      vec2 res=vec2(sshapeX,sshapeY);\n      vec2 shape = vec2(shapeX, shapeY);\n      vec4 prevState = texture2D(state,\n        gl_FragCoord.xy / shape);\n      vec2 position = (prevState.xy/2.0+0.5)*res;\n      vec2 velocity = prevState.zw;\n      position += 0.5 * velocity * deltaT;\n      if (position.x < 0.0 || position.x > res.x) {\n        velocity.x =-abs(velocity.x)*sign(position.x-res.x/2.0);\n       //position.x =mod(mod(position.x*0.5+0.5,1.0)+1.0,1.0)*2.0-1.0;\n      }\n      if (position.y < 0.0 || position.y > res.y) {\n       velocity.y =-abs(velocity.y)*sign(position.y-res.y/2.0);\n       // position.y =mod(mod(position.y*0.5+0.5,1.0)+1.0,1.0)*2.0-1.0;\n      }\n      vec2 dm=vec2(0.0);\n      float brim=-1.0;\n      float cc=(briC(texture2D(substrate, position/res).rgb));\n      for(int da=-1; da<=1; ++da){\n          float aa=float(da)/6.0*3.1415926535*2.0+atan(velocity.y,velocity.x);\n          vec2 dp=vec2(cos(aa),sin(aa));\n        if(dot(dp,velocity)>=0.0*length(velocity)){\n        float bri=(briC(texture2D(substrate, position/res+(dp*(10.0 )+vec2(0.0,0.0))/res).rgb))+1.0;\n        float rd=mod(mod(random_0t1(position,float(da+20)),1.0)+1.0,1.0);\n        float no=mod(mod(random_0t1(position.yx,float(da+30)),1.0)+1.0,1.0);;\n        if(rd<noiseF)\n        bri*=1.0+no*noiseSize;\n        if(bri>brim){\n        dm=dp;//*bri;//(dp-normalize(velocity))*bri;\n        brim=bri;\n        }\n        }\n    }\n      \n     //velocity.xy=length(velocity)>0.0?normalize(velocity):vec2(0.0);\n     float ddg=length(dm);\n      //velocity.xy+=(dm-normalize(velocity)*dot(normalize(velocity),dm))*(brim)/(cc+brim)*speedMult;//*max(1.0,brim)*0.1;//normalize(dm)*max(ddg,1.0/max(sshapeX,sshapeY))/10.0;\n      float anO=0.05;//+(position.y*0.5+0.5)*0.5;\n      velocity.xy+=anO*normalize(dm)*((brim)/(cc+brim)*2.0+1.0)/2.0*speedMult;//*max(1.0,brim)*0.1;//normalize(dm)*max(ddg,1.0/max(sshapeX,sshapeY))/10.0;\n      velocity.xy*=1.0/(1.0+anO);\n      float an=0.005;//+(position.y*0.5+0.5)*0.5;\n     velocity.xy+=an*(length(velocity)>0.0?normalize(velocity)*speedMult:vec2(0.0));\n     velocity.xy*=1.0/(1.0+an);\n      position += 0.5 * velocity * deltaT;\n     //velocity.y = velocity.y + gravity * deltaT;\n      gl_FragColor = vec4(position.xy/res.xy*2.0-1.0, velocity);\n    }\n    ",depth:{enable:!1},framebuffer:({tick:t},{t:e})=>h[(e+1)%2],uniforms:{state:({tick:t},{t:e})=>h[e%2],substrate:({tick:t})=>A[0],shapeX:s.context("viewportWidth"),shapeY:s.context("viewportHeight"),sshapeX:()=>I,sshapeY:()=>c,speedMult:()=>i.SPEED_MULT,noiseSize:()=>i.NOISE_MAGNITUDE,noiseF:()=>i.NOISE_FREQUENCY,deltaT:1,gravity:0},attributes:{position:[0,-4,4,4,-4,4]},primitive:"triangles",elements:null,offset:0,count:3}),b=s({vert:"\n    precision highp float;\n    attribute vec2 sprite;\n    uniform sampler2D state;\n    uniform float N;\n    varying vec3 rg;\n    uniform float sshapeX, sshapeY;\n    float briC(in vec3 color)\n{\n    return color.x+color.y+color.z;\n}\n    void main () {\n        vec4 sss=texture2D(state, sprite);\n        vec4 sss2=texture2D(state, sprite+vec2(0.0,1.0/N).yx);\n\n        vec4 sss3=texture2D(state, sprite-vec2(0.0,1.0/N).yx);\n      vec2 position =sss.xy;\n      gl_PointSize = 1.0;\n      float gg=((length(sss.zw)-min(length(sss2.zw),min(length(sss.zw),length(sss3.zw))))/\n      max(abs(length(sss3.zw)-length(sss2.zw)),max(abs(length(sss3.zw)-length(sss.zw)),abs(length(sss.zw)-length(sss2.zw))))\n      );\n     float ggy=gg;\n      float a=length(sss.zw)*3.1415926535*2.0;//(ggy-0.5)*10000000.0+0.50+sin(atan(sss.w,sss.z)*2.0)*0.0;//0.5+log(ggy/(1.0-ggy))*0.1;//(length(sss.zw)*max(sshapeX,sshapeY)/20.0)*2.0+sin(atan(sss.w,sss.z)*2.0)*0.0;\n      rg = normalize(vec3(sin(a),sin(a+3.1415926535*2.0/3.0),sin(a+3.1415926535*4.0/3.0))/2.0+0.5);\n      rg=rg/briC(rg);\n      gl_Position = vec4(position, 0, 1);\n    }\n    ",frag:"\n    precision highp float;\n    varying vec3 rg;\n    void main () {\n      gl_FragColor = vec4(rg, 1.0);\n    }\n    ",attributes:{sprite:Array(l*l).fill().map((function(t,e){return[e%l/l,(e/l|0)/l]})).reverse()},uniforms:{state:({tick:t},{t:e})=>h[e%2],N:({tick:t},{t:e})=>l,substrate:({tick:t},{inI:e})=>A[e],sshapeX:()=>I,sshapeY:()=>c},primitive:"points",blend:{enable:!0,func:{srcRGB:"src alpha",srcAlpha:"src alpha",dstRGB:"one",dstAlpha:"one minus src alpha"}},offset:(t,{count:e})=>l*l-e,elements:null,count:s.prop("count"),framebuffer:({tick:t},{outI:e})=>A[e]});let y=0;const f={data:new Float32Array(256),width:64,height:1},w=document.createElement("div");function G(t,e,n){return Math.min(Math.max(2*n*t/e-1,-.999),.999)}Object.assign(w.style,{color:"white",position:"absolute",left:"20px",top:"20px","z-index":20}),document.body.appendChild(w);let x=[],X=[],M=[],z=[],K=0;(async()=>{const t=new AudioContext;await t.audioWorklet.addModule("data:video/mp2t;base64,aW50ZXJmYWNlIEF1ZGlvV29ya2xldFByb2Nlc3NvciB7CiAgICByZWFkb25seSBwb3J0OiBNZXNzYWdlUG9ydDsKICAgIHByb2Nlc3MoaW5wdXRzOiBGbG9hdDMyQXJyYXlbXVtdLCBvdXRwdXRzOiBGbG9hdDMyQXJyYXlbXVtdLCBwYXJhbWV0ZXJzOiBNYXA8c3RyaW5nLCBGbG9hdDMyQXJyYXk+KTogYm9vbGVhbjsKfQoKZGVjbGFyZSBjbGFzcyBBdWRpb1dvcmtsZXRQcm9jZXNzb3IgaW1wbGVtZW50cyBBdWRpb1dvcmtsZXRQcm9jZXNzb3IgewogICAgY29uc3RydWN0b3Iob3B0aW9ucz86IEF1ZGlvV29ya2xldE5vZGVPcHRpb25zKTsKfQpkZWNsYXJlIGZ1bmN0aW9uIHJlZ2lzdGVyUHJvY2Vzc29yKAogICAgbmFtZTogc3RyaW5nLAogICAgcHJvY2Vzc29yQ3RvcjogKG5ldyAoCiAgICAgIG9wdGlvbnM/OiBBdWRpb1dvcmtsZXROb2RlT3B0aW9ucwogICAgKSA9PiBBdWRpb1dvcmtsZXRQcm9jZXNzb3IpICYgewogICAgLy8gICBwYXJhbWV0ZXJEZXNjcmlwdG9ycz86IEF1ZGlvUGFyYW1EZXNjcmlwdG9yW107CiAgICB9CiAgKTogdW5kZWZpbmVkOwpjbGFzcyBXaGl0ZU5vaXNlUHJvY2Vzc29yIGV4dGVuZHMgQXVkaW9Xb3JrbGV0UHJvY2Vzc29yIHsKICAgIHQ9MDsKICAgIGY9W1swLDBdXTsKICAgIGYwPVtbMCwwXV07CiAgICBnOltudW1iZXIsbnVtYmVyLG51bWJlcl1bXT1bWzEsMSwxXV07CiAgICBnTzpbbnVtYmVyLG51bWJlcixudW1iZXJdW109W1sxLDEsMV1dOwogICAgZD0wOwogICAgY29uc3RydWN0b3IoKXsKICAgICAgICBzdXBlcigpCiAgICAgICAgdGhpcy5wb3J0Lm9ubWVzc2FnZT0obSk9PnsKICAgICAgICAgICAgaWYobS5kYXRhLnAubGVuZ3RoPjEpewogICAgICAgICAgICAgICAgdGhpcy5mMD10aGlzLmYuc2xpY2UoKTsKICAgICAgICAgICAgdGhpcy5mPW0uZGF0YS5wOwogICAgICAgICAgICB0aGlzLmQ9bS5kYXRhLmQ7CgogICAgICAgICAgICAvLyBsZXQgZ3M9dGhpcy5mLm1hcCgoeCxpKT0+ewogICAgICAgICAgICAvLyAgICAgY29uc3Qgb2xkPXRoaXMuZjBbaV0/P3g7CiAgICAgICAgICAgIC8vICAgICBjb25zdCBkb3Q9eDsKICAgICAgICAgICAgLy8gICAgIGNvbnN0IGxlbj1NYXRoLnBvdyhkb3RbMF0qKjIrZG90WzFdKioyLDAuNSk7CiAgICAgICAgICAgIC8vICAgICBjb25zdCBsZW5PPU1hdGgucG93KG9sZFswXSoqMitvbGRbMV0qKjIsMC41KTsKICAgICAgICAgICAgLy8gICAgIGNvbnN0IGE9TWF0aC5hY29zKChkb3RbMV0qb2xkWzFdK2RvdFswXSpvbGRbMF0pL2xlbi9sZW5PKTsKICAgICAgICAgICAgLy8gICAgIC8vIGxldCBkaXM9TWF0aC5wb3coMiwobGVuKjEpLzEyKTsKICAgICAgICAgICAgLy8gICAgIGNvbnN0IGZyZXE9YS9NYXRoLlBJLzIvKHRoaXMuZC8xMDAwKTsKICAgICAgICAgICAgLy8gICAgIC8vIGNvbnN0IGw9TWF0aC5tYXgoMCxNYXRoLm1pbigxLGZyZXEpKQogICAgICAgICAgICAvLyAgICAgLy8gbGV0IGZmPWwqKDQxODYtMTMwKSsxMzA7CiAgICAgICAgICAgIC8vICAgICByZXR1cm4gW01hdGgubG9nKGZyZXErMC4wMDAwMDAxKSxNYXRoLm1heCgwLGRvdFswXSkqMCsxXQogICAgICAgICAgICAvLyAgICAgLy8gW01hdGgucG93KDIsTWF0aC5mbG9vcihNYXRoLmxvZyhNYXRoLnBvdyhhL01hdGguUEkvMi8odGhpcy5kLzEwMDApLDEpKS9NYXRoLmxvZygyKSo2KzMyKS8xMiksMC41XTsvLz4wP2RpczowOwogICAgICAgICAgICAvLyB9KQoKICAgICAgICAgICAgLy8gbGV0IG14PWdzLm1hcCh4PT54WzBdKS5yZWR1Y2UoKGEsYik9Pk1hdGgubWF4KGEsYiksMCk7CiAgICAgICAgICAgIC8vIGxldCBtZW49Z3MubWFwKHg9PnhbMF0pLnJlZHVjZSgoYSxiKT0+YithLDApL2dzLmxlbmd0aDsKICAgICAgICAgICAgLy8gZ3Muc29ydCgoYSxiKT0+YVswXS1iWzBdKTsKICAgICAgICAgICAgLy8gY29uc3QgbD1NYXRoLm1pbihncy5sZW5ndGgsMzIpOwogICAgICAgICAgICAKICAgICAgICAgICAgdGhpcy5nPW0uZGF0YS5wLm1hcCgoeCxpKT0+ewogICAgICAgICAgICAgICAgY29uc3Qgbz14WzBdCiAgICAgICAgICAgICAgICByZXR1cm4gW01hdGgucG93KDIsKE1hdGgubG9nMih4WzFdKSoxMikvMTIpLDEsb1syXS50dXJuRHVyXQogICAgICAgICAgICB9KTsKICAgICAgICAgICAgCiAgICAgICAgICAgIH0KICAgICAgICB9CiAgICB9CiAgICBwcm9jZXNzIChpbnB1dHM6IEZsb2F0MzJBcnJheVtdW10sIG91dHB1dHM6IEZsb2F0MzJBcnJheVtdW10sIHBhcmFtZXRlcnM6IE1hcDxzdHJpbmcsIEZsb2F0MzJBcnJheT4pOmJvb2xlYW4gewogICAgICBjb25zdCBvdXRwdXQgPSBvdXRwdXRzWzBdCiAgICAgIG91dHB1dC5mb3JFYWNoKGNoYW5uZWwgPT4gewogICAgICAgICAgY29uc3Qgc249KHgpPT5NYXRoLnNpbih4KS8vTWF0aC5wb3coTWF0aC5hYnMoeCUxLTAuNSksMSkvL01hdGguc2luKHgpCiAgICAgICAgICBjb25zdCB0b25lPShwYXJhbXM6W251bWJlcixudW1iZXIsbnVtYmVyXSx0Om51bWJlcik9PnsKICAgICAgICAgICAgICAvLyBjb25zdCB0ZD1NYXRoLm1pbihNYXRoLnBvdygyLE1hdGgucm91bmQoTWF0aC5sb2cyKHBhcmFtc1syXSkqMSkvMSkvMTAsOCk7CiAgICAgICAgICAgIHJldHVybiBzbihNYXRoLlBJKjIqcGFyYW1zWzBdKnQpOy8vKih0ZDwxMDAwMD8xOjApKigwLjc1KyhNYXRoLnNpbih0Kk1hdGguUEkqMi90ZCkpLzQpCiAgICAgICAgICB9CiAgICAgICAgICBjb25zdCBkZD1NYXRoLnBvdyh0aGlzLmcubGVuZ3RoLDEpOwogICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY2hhbm5lbC5sZW5ndGg7IGkrKykgewogICAgICAgICAgICB0aGlzLnQrPTEvNDQxMDA7CiAgICAgICAgICAgIGxldCB0b3Q9MDsKICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB0aGlzLmcubGVuZ3RoOyBqKyspIHsKICAgICAgICAgICAgICAgIGlmKGogPCB0aGlzLmcubGVuZ3RoKXsKICAgICAgICAgICAgICAgIGNvbnN0IGw9aS9jaGFubmVsLmxlbmd0aDsKICAgICAgICAgICAgICAgIHRvdCs9KGwqdG9uZSh0aGlzLmdbal0sdGhpcy50KSsoMS1sKSp0b25lKHRoaXMuZ09bal0/P3RoaXMuZ1tqXSx0aGlzLnQpKS9kZDsKICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgIH0KICAgICAgICAgICAgY2hhbm5lbFtpXSA9dG90OwogICAgICAgIH0KICAgICAgfSkKICAgICAgdGhpcy5nTz10aGlzLmcuc2xpY2UoKQogICAgICByZXR1cm4gdHJ1ZQogICAgfQogIH0KICAKICByZWdpc3RlclByb2Nlc3Nvcignd2hpdGUtbm9pc2UtcHJvY2Vzc29yJywgV2hpdGVOb2lzZVByb2Nlc3Nvcik=");const e=new AudioWorkletNode(t,"white-noise-processor");e.connect(t.destination),e.port.start(),(new Date).getTime(),s.frame((({tick:t,drawingBufferWidth:e,drawingBufferHeight:n,pixelRatio:o})=>{const a=G(g.x,e,o),r=-G(g.y,n,o);let C=Math.max(window.innerWidth*o,window.innerHeight*o),L=Math.ceil(window.innerWidth*o*Math.min(1,i.MAX_RES/C)),Y=Math.ceil(window.innerHeight*o*Math.min(1,i.MAX_RES/C));if(L===I&&Y===c||(d.forEach(((t,e)=>A[e]({color:t({width:L,height:Y})}))),I=L,c=Y),g.buttons||i.ALWAYS_SPAWN||K<100){for(let t=0;t<64;++t)f.data[4*t]=a,f.data[4*t+1]=r,f.data[4*t+2]=.25*(Math.random()-.5),f.data[4*t+3]=.25*(Math.random()-.5);h[t%2].color[0].subimage(f,y%l,(y/l|0)%l),y+=64,w.innerText=`${Math.min(y,l*l)}`}for(let i=0;i<2;i++)v({t:K}),s.clear({color:[0,0,0,1],depth:1}),m({inI:0},(()=>{s.draw(),p({outI:1})})),m({inI:1},(()=>{s.draw(),p({outI:0})})),u({inI:1,outI:0},(()=>{s.draw(),b({t:K,outI:0,inI:1,count:Math.min(y,l*l)})})),K+=1,K%2==0&&s({framebuffer:h[0]})((()=>{const t=[...s.read().values()],e=new Array(t.length/4).fill(0).map(((t,e)=>e)).filter((e=>Number.isFinite(t[4*e]))).map((e=>[t[4*e],t[4*e+1],t[4*e+2],t[4*e+3]]));if(X=x.slice(),x=e,x.length>1&&X.length>1){(new Date).getTime();let t=x.map(((t,e)=>{var n,o,i,s;const a=null!=(n=X[e])?n:t,g=(null!=(o=null==M?void 0:M[e])?o:[0,a,{lastTurnTime:K,plastTurnTime:K,lastTurn:[1,0],turnCycle:0,turnDur:[]}])[2],r=t,l=Math.pow(r[3]**2+r[2]**2,.5),C=Math.pow(a[3]**2+a[2]**2,.5),d=Math.abs(Math.acos((r[3]*a[3]+r[2]*a[2])/l/C))*Math.sign(r[2]*a[3]-r[3]*a[2]),A=Math.pow(((a[0]-r[0])*I)**2+((a[1]-r[1])*c)**2,.5);null==(i=null==M?void 0:M[e])||i[0];let p=A/Math.sqrt(1-Math.pow((r[3]*a[3]+r[2]*a[2])/l/C,2));Math.sign(r[2]*a[3]-r[3]*a[2]),g.lastTurn[0],r[2],g.lastTurn[1],r[3];let m=g.lastTurnTime,u=g.plastTurnTime,h=g.lastTurn,v=.5*g.turnCycle+.5*d,b=g.turnDur;b.push(Math.abs(1/p)),b=b.slice(-5);const y=Math.pow(2,Math.log2(1/(b.reduce(((t,e)=>t+e),0)/b.length))/2);return[null!=(s=Math.max(Math.min(110*y/4,3520),-3520))?s:0,r,{lastTurnTime:m,plastTurnTime:u,lastTurn:h,turnCycle:v,turnDur:b}]}));M=t,t.sort(((t,e)=>t[0]-e[0]));const e=Math.min(t.length,6);z=new Array(e).fill(0).map(((n,o)=>{const i=t[Math.floor((o+.5)*((t.length-1)/e))];return[i,i[0]]}))}}))})),window.setInterval((()=>{e.port.postMessage({p:z,d:1,t:K}),window.mm=z.map((t=>t[1]))}),1e3/44100*128*2)})();
