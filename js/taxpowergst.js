// TaxPower GST Dashboard Background Script
(() => {
  "use strict";

  function normalizeColor(hexCode) {
    return [
      ((hexCode >> 16) & 255) / 255,
      ((hexCode >> 8) & 255) / 255,
      (hexCode & 255) / 255
    ];
  }

  class MiniGl {
    constructor(canvas) {
      this.canvas = canvas;
      this.meshes = [];

      const gl = canvas.getContext("webgl", { antialias: true });
      if (!gl) throw new Error("WebGL is not supported.");
      this.gl = gl;

      const context = gl;
      const self = this;

      this.Uniform = class {
        constructor(e) {
          this.type = "float";
          this.value = undefined;
          this.typeFn = "1f";
          this.excludeFrom = undefined;
          this.transpose = undefined;

          Object.assign(this, e);

          const typeMap = {
            float: "1f",
            int: "1i",
            vec2: "2fv",
            vec3: "3fv",
            vec4: "4fv",
            mat4: "Matrix4fv"
          };

          this.typeFn = typeMap[this.type] || "1f";
        }

        update(location) {
          if (this.value === undefined || location === null) return;

          const isMatrix = this.typeFn.indexOf("Matrix") === 0;
          const fn = `uniform${this.typeFn}`;

          if (isMatrix) {
            context[fn](location, this.transpose || false, this.value);
          } else {
            context[fn](location, this.value);
          }
        }

        getDeclaration(name, type, length) {
          if (this.excludeFrom === type) return "";

          if (this.type === "array") {
            return (
              this.value[0].getDeclaration(name, type, this.value.length) +
              `\nconst int ${name}_length = ${this.value.length};`
            );
          }

          if (this.type === "struct") {
            let structName = name.replace("u_", "");
            structName =
              structName.charAt(0).toUpperCase() + structName.slice(1);

            const fields = Object.entries(this.value)
              .map(([n, u]) =>
                u.getDeclaration(n, type).replace(/^uniform/, "")
              )
              .join("");

            return `uniform struct ${structName}
            {
              ${fields}
            } ${name}${length ? `[${length}]` : ""};`;
          }

          return `uniform ${this.type} ${name}${length ? `[${length}]` : ""};`;
        }
      };

      this.Attribute = class {
        constructor(e) {
          this.type = context.FLOAT;
          this.normalized = false;
          this.buffer = context.createBuffer();
          Object.assign(this, e);
        }

        update() {
          if (this.values) {
            context.bindBuffer(this.target, this.buffer);
            context.bufferData(
              this.target,
              this.values,
              context.STATIC_DRAW
            );
          }
        }

        attach(name, program) {
          const location = context.getAttribLocation(program, name);

          if (this.target === context.ARRAY_BUFFER) {
            context.bindBuffer(this.target, this.buffer);
            context.enableVertexAttribArray(location);
            context.vertexAttribPointer(
              location,
              this.size,
              this.type,
              this.normalized,
              0,
              0
            );
          }

          return location;
        }

        use(location) {
          context.bindBuffer(this.target, this.buffer);

          if (this.target === context.ARRAY_BUFFER) {
            context.enableVertexAttribArray(location);
            context.vertexAttribPointer(
              location,
              this.size,
              this.type,
              this.normalized,
              0,
              0
            );
          }
        }
      };

      this.Material = class {
        constructor(vertexShader, fragmentShader, uniforms = {}) {
          const material = this;

          function getShader(type, source) {
            const shader = context.createShader(type);
            context.shaderSource(shader, source);
            context.compileShader(shader);

            if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
              console.error(context.getShaderInfoLog(shader));
              throw new Error("Shader compilation error.");
            }

            return shader;
          }

          function getUniformDeclarations(allUniforms, type) {
            return Object.entries(allUniforms)
              .map(([uniform, value]) =>
                value.getDeclaration(uniform, type)
              )
              .join("\n");
          }

          material.uniforms = uniforms;

          const prefix = "precision highp float;";

          const vertexSource = `
            ${prefix}
            attribute vec4 position;
            attribute vec2 uv;
            attribute vec2 uvNorm;

            ${getUniformDeclarations(self.commonUniforms, "vertex")}
            ${getUniformDeclarations(uniforms, "vertex")}

            ${vertexShader}
          `;

          const fragmentSource = `
            ${prefix}

            ${getUniformDeclarations(self.commonUniforms, "fragment")}
            ${getUniformDeclarations(uniforms, "fragment")}

            ${fragmentShader}
          `;

          material.program = context.createProgram();

          context.attachShader(
            material.program,
            getShader(context.VERTEX_SHADER, vertexSource)
          );

          context.attachShader(
            material.program,
            getShader(context.FRAGMENT_SHADER, fragmentSource)
          );

          context.linkProgram(material.program);

          if (!context.getProgramParameter(material.program, context.LINK_STATUS)) {
            console.error(context.getProgramInfoLog(material.program));
            throw new Error("Program linking error.");
          }

          context.useProgram(material.program);

          material.uniformInstances = [];
          material.attachUniforms(undefined, self.commonUniforms);
          material.attachUniforms(undefined, material.uniforms);
        }

        attachUniforms(name, uniforms) {
          if (name === undefined) {
            Object.entries(uniforms).forEach(([n, u]) =>
              this.attachUniforms(n, u)
            );
          } else if (uniforms.type === "array") {
            uniforms.value.forEach((u, i) =>
              this.attachUniforms(`${name}[${i}]`, u)
            );
          } else if (uniforms.type === "struct") {
            Object.entries(uniforms.value).forEach(([u, i]) =>
              this.attachUniforms(`${name}.${u}`, i)
            );
          } else {
            this.uniformInstances.push({
              uniform: uniforms,
              location: context.getUniformLocation(this.program, name)
            });
          }
        }
      };

      this.PlaneGeometry = class {
        constructor() {
          this.width = 1;
          this.height = 1;
          this.vertexCount = 0;
          this.xSegCount = 0;
          this.ySegCount = 0;

          this.attributes = {
            position: new self.Attribute({
              target: context.ARRAY_BUFFER,
              size: 3
            }),
            uv: new self.Attribute({
              target: context.ARRAY_BUFFER,
              size: 2
            }),
            uvNorm: new self.Attribute({
              target: context.ARRAY_BUFFER,
              size: 2
            }),
            index: new self.Attribute({
              target: context.ELEMENT_ARRAY_BUFFER,
              size: 3,
              type: context.UNSIGNED_SHORT
            })
          };
        }

        setTopology(xSegs = 1, ySegs = 1) {
          this.xSegCount = xSegs;
          this.ySegCount = ySegs;
          this.vertexCount =
            (this.xSegCount + 1) * (this.ySegCount + 1);

          const quadCount = this.xSegCount * this.ySegCount * 2;

          this.attributes.uv.values =
            new Float32Array(2 * this.vertexCount);

          this.attributes.uvNorm.values =
            new Float32Array(2 * this.vertexCount);

          this.attributes.index.values =
            new Uint16Array(3 * quadCount);

          for (let y = 0; y <= this.ySegCount; y++) {
            for (let x = 0; x <= this.xSegCount; x++) {
              const i =
                y * (this.xSegCount + 1) + x;

              this.attributes.uv.values[2 * i] =
                x / this.xSegCount;

              this.attributes.uv.values[2 * i + 1] =
                1 - y / this.ySegCount;

              this.attributes.uvNorm.values[2 * i] =
                (x / this.xSegCount) * 2 - 1;

              this.attributes.uvNorm.values[2 * i + 1] =
                1 - (y / this.ySegCount) * 2;

              if (
                x < this.xSegCount &&
                y < this.ySegCount
              ) {
                const s = y * this.xSegCount + x;

                this.attributes.index.values[6 * s] = i;
                this.attributes.index.values[6 * s + 1] =
                  i + 1 + this.xSegCount;
                this.attributes.index.values[6 * s + 2] =
                  i + 1;

                this.attributes.index.values[6 * s + 3] =
                  i + 1;
                this.attributes.index.values[6 * s + 4] =
                  i + 1 + this.xSegCount;
                this.attributes.index.values[6 * s + 5] =
                  i + 2 + this.xSegCount;
              }
            }
          }

          this.attributes.uv.update();
          this.attributes.uvNorm.update();
          this.attributes.index.update();
        }

        setSize(width = 1, height = 1) {
          this.width = width;
          this.height = height;

          this.attributes.position.values =
            new Float32Array(3 * this.vertexCount);

          const offsetX = width / -2;
          const offsetY = height / -2;
          const segWidth = width / this.xSegCount;
          const segHeight = height / this.ySegCount;

          for (let y = 0; y <= this.ySegCount; y++) {
            const posY = offsetY + y * segHeight;

            for (let x = 0; x <= this.xSegCount; x++) {
              const posX = offsetX + x * segWidth;
              const idx =
                y * (this.xSegCount + 1) + x;

              this.attributes.position.values[3 * idx] = posX;
              this.attributes.position.values[3 * idx + 1] = -posY;
              this.attributes.position.values[3 * idx + 2] = 0;
            }
          }

          this.attributes.position.update();
        }
      };

      this.Mesh = class {
        constructor(geometry, material) {
          this.geometry = geometry;
          this.material = material;
          this.attributeInstances = [];

          Object.entries(this.geometry.attributes).forEach(
            ([name, attribute]) => {
              this.attributeInstances.push({
                attribute,
                location: attribute.attach(
                  name,
                  this.material.program
                )
              });
            }
          );

          self.meshes.push(this);
        }

        draw() {
          context.useProgram(this.material.program);

          this.material.uniformInstances.forEach(
            ({ uniform, location }) => uniform.update(location)
          );

          this.attributeInstances.forEach(
            ({ attribute, location }) =>
              attribute.use(location)
          );

          context.drawElements(
            context.TRIANGLES,
            this.geometry.attributes.index.values.length,
            context.UNSIGNED_SHORT,
            0
          );
        }
      };

      const identityMatrix = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ];

      this.commonUniforms = {
        projectionMatrix: new this.Uniform({
          type: "mat4",
          value: identityMatrix
        }),
        modelViewMatrix: new this.Uniform({
          type: "mat4",
          value: identityMatrix
        }),
        resolution: new this.Uniform({
          type: "vec2",
          value: [1, 1]
        }),
        aspectRatio: new this.Uniform({
          type: "float",
          value: 1
        })
      };
    }

    setSize(w = 640, h = 480) {
      this.width = w;
      this.height = h;

      this.canvas.width = w;
      this.canvas.height = h;

      this.gl.viewport(0, 0, w, h);

      this.commonUniforms.resolution.value = [w, h];
      this.commonUniforms.aspectRatio.value = w / h;
    }

    setOrthographicCamera() {
      this.commonUniforms.projectionMatrix.value = [
        2 / this.width, 0, 0, 0,
        0, 2 / this.height, 0, 0,
        0, 0, -0.001, 0,
        0, 0, 0, 1
      ];
    }

    render() {
      this.gl.clearColor(0, 0, 0, 0);
      this.gl.clearDepth(1);
      this.meshes.forEach(mesh => mesh.draw());
    }
  }

  class Gradient {
    constructor(canvas, colors) {
      this.canvas = canvas;
      this.colors = colors;
      this.minigl = new MiniGl(canvas);
      this.time = 0;
      this.last = 0;
      this.animationId = undefined;
      this.isPlaying = false;
      this.init();
    }

    init() {
      const sectionColors = this.colors.map(hex =>
        normalizeColor(
          parseInt(hex.replace("#", "0x"), 16)
        )
      );

      const uniforms = {
        u_time: new this.minigl.Uniform({ value: 0 }),

        u_shadow_power: new this.minigl.Uniform({
          value: 5
        }),

        u_darken_top: new this.minigl.Uniform({
          value: 0
        }),

        u_active_colors: new this.minigl.Uniform({
          value: [1, 1, 1, 1],
          type: "vec4"
        }),

        u_global: new this.minigl.Uniform({
          value: {
            noiseFreq: new this.minigl.Uniform({
              value: [0.00014, 0.00029],
              type: "vec2"
            }),
            noiseSpeed: new this.minigl.Uniform({
              value: 0.000005
            })
          },
          type: "struct"
        }),

        u_vertDeform: new this.minigl.Uniform({
          value: {
            incline: new this.minigl.Uniform({
              value: 0
            }),
            offsetTop: new this.minigl.Uniform({
              value: -0.5
            }),
            offsetBottom: new this.minigl.Uniform({
              value: -0.5
            }),
            noiseFreq: new this.minigl.Uniform({
              value: [3, 4],
              type: "vec2"
            }),
            noiseAmp: new this.minigl.Uniform({
              value: 320
            }),
            noiseSpeed: new this.minigl.Uniform({
              value: 10
            }),
            noiseFlow: new this.minigl.Uniform({
              value: 3
            }),
            noiseSeed: new this.minigl.Uniform({
              value: 5
            })
          },
          type: "struct",
          excludeFrom: "fragment"
        }),

        u_baseColor: new this.minigl.Uniform({
          value: sectionColors[0],
          type: "vec3",
          excludeFrom: "fragment"
        }),

        u_waveLayers: new this.minigl.Uniform({
          value: [],
          excludeFrom: "fragment",
          type: "array"
        })
      };

      for (let i = 1; i < sectionColors.length; i++) {
        uniforms.u_waveLayers.value.push(
          new this.minigl.Uniform({
            value: {
              color: new this.minigl.Uniform({
                value: sectionColors[i],
                type: "vec3"
              }),
              noiseFreq: new this.minigl.Uniform({
                value: [
                  2 + i / sectionColors.length,
                  3 + i / sectionColors.length
                ],
                type: "vec2"
              }),
              noiseSpeed: new this.minigl.Uniform({
                value: 11 + 0.3 * i
              }),
              noiseFlow: new this.minigl.Uniform({
                value: 6.5 + 0.3 * i
              }),
              noiseSeed: new this.minigl.Uniform({
                value: 5 + 10 * i
              }),
              noiseFloor: new this.minigl.Uniform({
                value: 0.1
              }),
              noiseCeil: new this.minigl.Uniform({
                value: 0.63 + 0.07 * i
              })
            },
            type: "struct"
          })
        );
      }

      const vertexShader = `
        vec3 mod289(vec3 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec4 mod289(vec4 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec4 permute(vec4 x) {
          return mod289(((x * 34.0) + 1.0) * x);
        }

        vec4 taylorInvSqrt(vec4 r) {
          return 1.79284291400159 -
                 0.85373472095314 * r;
        }

        float snoise(vec3 v) {
          const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

          vec3 i = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);

          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;

          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);

          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;

          i = mod289(i);

          vec4 p = permute(
            permute(
              permute(
                i.z + vec4(
                  0.0, i1.z, i2.z, 1.0
                )
              )
              + i.y + vec4(
                0.0, i1.y, i2.y, 1.0
              )
            )
            + i.x + vec4(
              0.0, i1.x, i2.x, 1.0
            )
          );

          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;

          vec4 j =
            p - 49.0 *
            floor(p * ns.z * ns.z);

          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);

          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;

          vec4 h = 1.0 - abs(x) - abs(y);

          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);

          vec4 s0 = floor(b0) * 2.0 + 1.0;
          vec4 s1 = floor(b1) * 2.0 + 1.0;

          vec4 sh = -step(h, vec4(0.0));

          vec4 a0 =
            b0.xzyw + s0.xzyw * sh.xxyy;

          vec4 a1 =
            b1.xzyw + s1.xzyw * sh.zzww;

          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);

          vec4 norm = taylorInvSqrt(
            vec4(
              dot(p0, p0),
              dot(p1, p1),
              dot(p2, p2),
              dot(p3, p3)
            )
          );

          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;

          vec4 m = max(
            0.6 -
            vec4(
              dot(x0, x0),
              dot(x1, x1),
              dot(x2, x2),
              dot(x3, x3)
            ),
            0.0
          );

          m = m * m;

          return 42.0 * dot(
            m * m,
            vec4(
              dot(p0, x0),
              dot(p1, x1),
              dot(p2, x2),
              dot(p3, x3)
            )
          );
        }

        vec3 blendNormal(
          vec3 base,
          vec3 blend,
          float opacity
        ) {
          return blend * opacity +
                 base * (1.0 - opacity);
        }

        varying vec3 v_color;

        void main() {
          float time =
            u_time * u_global.noiseSpeed;

          vec2 noiseCoord =
            resolution *
            uvNorm *
            u_global.noiseFreq;

          float tilt =
            resolution.y / 2.0 *
            uvNorm.y;

          float incline =
            resolution.x / 2.0 *
            uvNorm.x *
            u_vertDeform.incline;

          float offset =
            resolution.x / 2.0 *
            u_vertDeform.incline *
            mix(
              u_vertDeform.offsetBottom,
              u_vertDeform.offsetTop,
              uv.y
            );

          float noise = snoise(vec3(
            noiseCoord.x *
              u_vertDeform.noiseFreq.x +
              time * u_vertDeform.noiseFlow,

            noiseCoord.y *
              u_vertDeform.noiseFreq.y,

            time *
              u_vertDeform.noiseSpeed +
              u_vertDeform.noiseSeed
          )) * u_vertDeform.noiseAmp;

          noise *=
            1.0 -
            pow(abs(uvNorm.y), 2.0);

          noise = max(0.0, noise);

          vec3 pos = vec3(
            position.x,
            position.y +
              tilt +
              incline +
              noise -
              offset,
            position.z
          );

          v_color = u_baseColor;

          for (
            int i = 0;
            i < u_waveLayers_length;
            i++
          ) {
            if (
              u_active_colors[i + 1] == 1.
            ) {
              WaveLayers layer =
                u_waveLayers[i];

              float layerNoise =
                smoothstep(
                  layer.noiseFloor,
                  layer.noiseCeil,
                  snoise(vec3(
                    noiseCoord.x *
                      layer.noiseFreq.x +
                      time *
                      layer.noiseFlow,

                    noiseCoord.y *
                      layer.noiseFreq.y,

                    time *
                      layer.noiseSpeed +
                      layer.noiseSeed
                  )) / 2.0 + 0.5
                );

              v_color = blendNormal(
                v_color,
                layer.color,
                pow(layerNoise, 4.0)
              );
            }
          }

          gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(pos, 1.0);
        }
      `;

      const fragmentShader = `
        varying vec3 v_color;

        void main() {
          vec3 color = v_color;

          if (u_darken_top == 1.0) {
            vec2 st =
              gl_FragCoord.xy /
              resolution.xy;

            color.g -=
              pow(
                st.y +
                sin(-12.0) * st.x,
                u_shadow_power
              ) * 0.4;
          }

          gl_FragColor =
            vec4(color, 1.0);
        }
      `;

      const material = new this.minigl.Material(
        vertexShader,
        fragmentShader,
        uniforms
      );

      const geometry =
        new this.minigl.PlaneGeometry();

      this.mesh =
        new this.minigl.Mesh(
          geometry,
          material
        );

      this.resize();
      window.addEventListener(
        "resize",
        () => this.resize()
      );
    }

    resize() {
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.minigl.setSize(width, height);
      this.minigl.setOrthographicCamera();

      const xSegCount =
        Math.ceil(width * 0.02);

      const ySegCount =
        Math.ceil(height * 0.05);

      this.mesh.geometry.setTopology(
        xSegCount,
        ySegCount
      );

      this.mesh.geometry.setSize(
        width,
        height
      );

      this.mesh.material.uniforms
        .u_shadow_power.value =
        width < 600 ? 5 : 6;
    }

    animate = timestamp => {
      if (!this.isPlaying) return;

      this.time += Math.min(
        timestamp - this.last,
        1000 / 15
      );

      this.last = timestamp;

      this.mesh.material.uniforms
        .u_time.value = this.time;

      this.minigl.render();

      this.animationId =
        requestAnimationFrame(this.animate);
    };

    start() {
      this.isPlaying = true;
      this.animationId =
        requestAnimationFrame(this.animate);
    }

    stop() {
      this.isPlaying = false;

      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
    }
  }

  const colors = [
    "#00bfff",
    "#ffffff",
    "#00bfff",
    "#ffffff",
    "#fcae1e",
    "#ffffff"
  ];

  function initDashboardGradient() {
    const container = document.getElementById("dashboard_bg");
    if (!container || container.dataset.gradientInitialized) return;

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    container.prepend(canvas);
    container.dataset.gradientInitialized = "true";

    try {
      const gradient =
        new Gradient(canvas, colors);

      gradient.mesh.material.uniforms
        .u_shadow_power.value = 8;

      gradient.mesh.material.uniforms
        .u_darken_top.value = 0;

      gradient.mesh.material.uniforms
        .u_global.value.noiseFreq.value =
        [0.0001, 0.0009];

      gradient.mesh.material.uniforms
        .u_global.value.noiseSpeed.value =
        0.00001;

      Object.assign(
        gradient.mesh.material.uniforms
          .u_vertDeform.value,
        {
          incline: 0.5,
          noiseAmp: 250,
          noiseFlow: 5
        }
      );

      gradient.start();
    } catch (error) {
      container.dataset.gradientInitialized = "";
      canvas.remove();
      console.error(
        "Failed to initialize gradient:",
        error
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboardGradient, { once: true });
  } else {
    initDashboardGradient();
  }

  document.addEventListener("taxpower:sections-loaded", initDashboardGradient);
})();

// End here Dashboard Background Script

(() => {
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function keepGstStylesheetLast() {
    const gstStylesheet = document.querySelector('link[href*="taxpowergst.css"]');
    if (gstStylesheet) document.head.appendChild(gstStylesheet);
  }

  function initGstAnimations() {
    const gstAnimationPage = document.querySelector('.gst-dashboard-page');
    if (!gstAnimationPage || gstAnimationPage.dataset.animationInitialized) return;

    const gstAnimatedElements = gstAnimationPage.querySelectorAll('.gst-dashboard-heading, .gst-browser-frame, .gst-feature-copy, .gst-feature-browser img, .gst-feature-row-media');
    gstAnimationPage.classList.add('gst-animation-ready');
    gstAnimationPage.dataset.animationInitialized = 'true';

    if (reducedMotionQuery.matches) {
      gstAnimatedElements.forEach((element) => element.classList.add('gst-animation-visible'));
      return;
    }

    const updateAnimationVisibility = () => {
      const viewportThreshold = window.innerHeight * 0.9;

      gstAnimatedElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const isInViewport = rect.top < viewportThreshold && rect.bottom > 0;
        element.classList.toggle('gst-animation-visible', isInViewport);
      });
    };

    if ('IntersectionObserver' in window) {
      const gstAnimationObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('gst-animation-visible', entry.isIntersecting);
        });
      }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

      gstAnimatedElements.forEach((element) => gstAnimationObserver.observe(element));
    }

    updateAnimationVisibility();
    window.addEventListener('scroll', updateAnimationVisibility, { passive: true });
    window.addEventListener('resize', updateAnimationVisibility);
  }

  function initGstTypingParagraphs() {
    const paragraphs = document.querySelectorAll('.gst-dashboard-page .gst-feature-copy > p');
    if (!paragraphs.length) return;

    const keywordTerms = new Set([
      '2a',
      '2b',
      '2x',
      'arn',
      'audit',
      'compliance',
      'e-invoice',
      'e-invoices',
      'excel',
      'filing',
      'gst',
      'gstr-1',
      'gstr-2',
      'gstr-2b',
      'gstr-3b',
      'itc',
      'pdf',
      'portal',
      'reconciliation',
      'returns',
      'tds',
      'tcs'
    ]);

    paragraphs.forEach((paragraph) => {
      if (paragraph.dataset.typingInitialized) return;

      const text = paragraph.textContent.replace(/\s+/g, ' ').trim();
      if (!text) return;

      const fragment = document.createDocumentFragment();
      let wordIndex = 0;

      text.split(/(\s+)/).forEach((part) => {
        if (!part) return;

        if (/^\s+$/.test(part)) {
          fragment.appendChild(document.createTextNode(part));
          return;
        }

        const word = document.createElement('span');
        word.className = 'gst-typing-word';
        word.style.setProperty('--gst-word-delay', `${wordIndex * 54}ms`);
        word.textContent = part;

        const normalizedWord = part
          .replace(/^[^a-z0-9&/-]+|[^a-z0-9&/-]+$/gi, '')
          .toLowerCase();

        if (keywordTerms.has(normalizedWord)) {
          word.classList.add('gst-typing-keyword');
        }

        fragment.appendChild(word);
        wordIndex += 1;
      });

      paragraph.textContent = '';
      paragraph.appendChild(fragment);
      paragraph.classList.add('gst-typing-ready');
      paragraph.dataset.typingInitialized = 'true';
    });
  }

  function initGstImageHoverHints() {
    const gstHintTargets = document.querySelectorAll('.gst-dashboard-page .gst-dashboard-image-wrap, .gst-dashboard-page .gst-feature-browser, .gst-dashboard-page .gst-feature-row-media');
    if (!gstHintTargets.length) return;

    const hintProperties = [
      '--gst-hint-x',
      '--gst-hint-y',
      '--gst-hint-shift-x',
      '--gst-hint-shift-y',
      '--gst-hint-offset-x',
      '--gst-hint-offset-y'
    ];

    gstHintTargets.forEach((target) => {
      if (target.dataset.hoverHintInitialized) return;
      target.dataset.hoverHintInitialized = 'true';

      target.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return;

        const rect = target.getBoundingClientRect();
        const x = Math.min(Math.max(event.clientX - rect.left, 12), Math.max(rect.width - 12, 12));
        const y = Math.min(Math.max(event.clientY - rect.top, 12), Math.max(rect.height - 12, 12));
        const nearLeft = x < 110;
        const nearRight = rect.width - x < 110;
        const nearTop = y < 54;

        target.style.setProperty('--gst-hint-x', `${x}px`);
        target.style.setProperty('--gst-hint-y', `${y}px`);
        target.style.setProperty('--gst-hint-shift-x', nearLeft ? '0%' : nearRight ? '-100%' : '-50%');
        target.style.setProperty('--gst-hint-shift-y', nearTop ? '0%' : '-100%');
        target.style.setProperty('--gst-hint-offset-x', nearLeft ? '12px' : nearRight ? '-12px' : '0px');
        target.style.setProperty('--gst-hint-offset-y', nearTop ? '12px' : '-12px');
      });

      target.addEventListener('pointerleave', () => {
        hintProperties.forEach((property) => target.style.removeProperty(property));
      });
    });
  }

  //------------------- img zoom out functionality ---------------------

  function initGstImageLightbox() {
    const gstImages = document.querySelectorAll('.gst-dashboard-page .gst-browser-frame img, .gst-dashboard-page .gst-feature-browser img, .gst-dashboard-page .gst-feature-row-media img');
    if (!gstImages.length) return;

    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    let lightbox = document.querySelector('[data-gst-image-lightbox]');
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.className = 'gst-image-lightbox';
      lightbox.setAttribute('data-gst-image-lightbox', '');
      lightbox.setAttribute('aria-hidden', 'true');
      lightbox.innerHTML = `
        <div class="gst-image-lightbox-actions">
          <button class="gst-image-lightbox-button gst-image-lightbox-magnify" type="button" aria-label="Zoom toggle" id="gstMagnifyIcon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
              <g id="gstZoomPlus" style="display: block;">
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </g>
              <g id="gstZoomMinus" style="display: none;">
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </g>
            </svg>
          </button>
          <button class="gst-image-lightbox-button gst-image-lightbox-close" type="button" aria-label="Close image"></button>
        </div>
        <div class="gst-image-lightbox-viewport">
          <div class="gst-image-lightbox-vertical">
            <img alt="">
          </div>
        </div>
      `;
      document.body.appendChild(lightbox);

      const lightboxImage = lightbox.querySelector('img');
      const magnifyIcon = lightbox.querySelector('#gstMagnifyIcon');
      const zoomPlusSign = lightbox.querySelector('#gstZoomPlus');
      const zoomMinusSign = lightbox.querySelector('#gstZoomMinus');

      const updateTransform = (animate = false) => {
        lightboxImage.style.transition = animate ? 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)' : 'none';
        lightboxImage.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
        
        if (zoomPlusSign && zoomMinusSign) {
          if (scale > 1) {
            zoomPlusSign.style.display = 'none';
            zoomMinusSign.style.display = 'block';
          } else {
            zoomPlusSign.style.display = 'block';
            zoomMinusSign.style.display = 'none';
          }
        }
      };

      const resetZoom = () => {
        scale = 1;
        translateX = 0;
        translateY = 0;
        lightboxImage.classList.remove('is-zoomed', 'is-grabbing');
        updateTransform(true);
      };

      // Toggle 200% Zoom
      const toggleZoomAtPoint = (clickX = window.innerWidth / 2, clickY = window.innerHeight / 2) => {
        if (scale > 1) {
          resetZoom();
        } else {
          scale = 2; // Zoom scale
          const viewportRect = lightbox.querySelector('.gst-image-lightbox-viewport').getBoundingClientRect();
          const centerX = viewportRect.left + viewportRect.width / 2;
          const centerY = viewportRect.top + viewportRect.height / 2;

          translateX = (centerX - clickX) * (scale - 1);
          translateY = (centerY - clickY) * (scale - 1);

          // Apply bounds to keep image within viewport
          const imgRect = lightboxImage.getBoundingClientRect();
          const maxTranslateX = Math.max(0, (imgRect.width * scale - viewportRect.width) / 2);
          const maxTranslateY = Math.max(0, (imgRect.height * scale - viewportRect.height) / 2);

          translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX));
          translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY));

          lightboxImage.classList.add('is-zoomed');
          updateTransform(true);
        }
      };

      // Magnify Button
      magnifyIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleZoomAtPoint();
      });

      // Point-to-Click Zoom
      lightboxImage.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isDragging) return;
        toggleZoomAtPoint(e.clientX, e.clientY);
      });

      // Dragging with X and Y Boundaries
      lightboxImage.addEventListener('mousedown', (e) => {
        if (scale <= 1) return;
        e.preventDefault();
        isDragging = false;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;

        const onMouseMove = (moveEvent) => {
          isDragging = true;
          let nextX = moveEvent.clientX - startX;
          let nextY = moveEvent.clientY - startY;

          const imgRect = lightboxImage.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;

          // X aur Y Boundaries calculation
          const maxTranslateX = Math.max(0, (imgRect.width - viewportWidth) / 2 + 50);
          const maxTranslateY = Math.max(0, (imgRect.height - viewportHeight) / 2 + 50);

          // Lock within bounds
          translateX = Math.min(Math.max(nextX, -maxTranslateX), maxTranslateX);
          translateY = Math.min(Math.max(nextY, -maxTranslateY), maxTranslateY);

          lightboxImage.classList.add('is-grabbing');
          updateTransform(false);
        };

        const onMouseUp = () => {
          lightboxImage.classList.remove('is-grabbing');
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          setTimeout(() => { isDragging = false; }, 50);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });

      // Bounded Mouse Wheel Scroll (Y-Axis)
      lightbox.addEventListener('wheel', (e) => {
        if (!lightbox.classList.contains('is-open')) return;
        e.preventDefault();

        if (scale > 1) {
          const imgRect = lightboxImage.getBoundingClientRect();
          const viewportHeight = window.innerHeight;

          const maxTranslateY = Math.max(0, (imgRect.height - viewportHeight) / 2 + 50);

          translateY -= e.deltaY * 0.8;
          translateY = Math.min(Math.max(translateY, -maxTranslateY), maxTranslateY);

          updateTransform(false);
        }
      }, { passive: false });

      const closeLightbox = () => {
        if (!lightbox.classList.contains('is-open') || lightbox.classList.contains('is-closing')) return;

        window.clearTimeout(lightbox.gstCloseTimer);
        lightbox.setAttribute('aria-hidden', 'true');
        
        // Calculate return animation values
        if (lightbox.gstSourceRect) {
          const sourceRect = lightbox.gstSourceRect;
          const imgRect = lightboxImage.getBoundingClientRect();
          const viewportRect = lightbox.querySelector('.gst-image-lightbox-viewport').getBoundingClientRect();
          
          // Calculate center position of lightbox
          const centerX = viewportRect.left + viewportRect.width / 2;
          const centerY = viewportRect.top + viewportRect.height / 2;
          
          // Calculate offset from current center to original position
          const offsetX = sourceRect.left + sourceRect.width / 2 - centerX;
          const offsetY = sourceRect.top + sourceRect.height / 2 - centerY;
          
          // Calculate scale ratio
          const scaleX = sourceRect.width / imgRect.width;
          const scaleY = sourceRect.height / imgRect.height;
          
          // Set CSS variables for animation
          lightbox.style.setProperty('--gst-return-x', `${offsetX}px`);
          lightbox.style.setProperty('--gst-return-y', `${offsetY}px`);
          lightbox.style.setProperty('--gst-return-scale-x', `${scaleX}`);
          lightbox.style.setProperty('--gst-return-scale-y', `${scaleY}`);
        }
        
        lightbox.classList.add('is-closing');
        resetZoom();
        lightbox.gstCloseTimer = window.setTimeout(() => {
          lightbox.classList.remove('is-open', 'is-closing');
          document.body.classList.remove('gst-image-lightbox-open');
          lightbox.gstCloseTimer = null;
        }, 500);
      };

      lightbox.addEventListener('click', (event) => {
        if (
          event.target === lightbox ||
          event.target.classList.contains('gst-image-lightbox-viewport') ||
          event.target.classList.contains('gst-image-lightbox-vertical') ||
          event.target.closest?.('.gst-image-lightbox-close')
        ) closeLightbox();
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
      });
    }

    const lightboxImage = lightbox.querySelector('img');

    gstImages.forEach((image) => {
      if (image.dataset.lightboxInitialized) return;

      image.dataset.lightboxInitialized = 'true';
      image.setAttribute('tabindex', '0');
      image.setAttribute('role', 'button');

      const openLightbox = () => {
        const sourceRect = image.getBoundingClientRect();

        window.clearTimeout(lightbox.gstCloseTimer);
        lightbox.gstCloseTimer = null;
        lightbox.gstSourceRect = {
          left: sourceRect.left,
          top: sourceRect.top,
          width: sourceRect.width,
          height: sourceRect.height
        };
        lightboxImage.src = image.src;
        lightboxImage.alt = image.alt;

        // Temporarily display to calculate dimensions for opening animation
        lightbox.style.display = 'block';
        lightbox.style.opacity = '0';
        
        const imgRect = lightboxImage.getBoundingClientRect();
        const viewportRect = lightbox.querySelector('.gst-image-lightbox-viewport').getBoundingClientRect();
        
        const centerX = viewportRect.left + viewportRect.width / 2;
        const centerY = viewportRect.top + viewportRect.height / 2;
        
        const offsetX = sourceRect.left + sourceRect.width / 2 - centerX;
        const offsetY = sourceRect.top + sourceRect.height / 2 - centerY;
        
        const scaleX = sourceRect.width / (imgRect.width || 1);
        const scaleY = sourceRect.height / (imgRect.height || 1);
        
        lightbox.style.setProperty('--gst-return-x', `${offsetX}px`);
        lightbox.style.setProperty('--gst-return-y', `${offsetY}px`);
        lightbox.style.setProperty('--gst-return-scale-x', `${scaleX}`);
        lightbox.style.setProperty('--gst-return-scale-y', `${scaleY}`);
        
        lightbox.style.display = '';
        lightbox.style.opacity = '';
        
        // Force reflow
        void lightbox.offsetWidth;

        lightbox.classList.remove('is-closing');
        lightbox.classList.add('is-open');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.classList.add('gst-image-lightbox-open');
      };

      image.addEventListener('click', openLightbox);
      image.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openLightbox();
        }
      });
    });
  }

  //------------------------------------------------------------------

  function initGstPage() {
    keepGstStylesheetLast();
    initGstTypingParagraphs();
    initGstAnimations();
    initGstImageHoverHints();
    initGstImageLightbox();
  }

  initGstPage();
  document.addEventListener('taxpower:sections-loaded', initGstPage);
  document.addEventListener('taxpower:navigation-loaded', keepGstStylesheetLast);
})();
/* Lightweight demo tabs; supports direct pages and dynamically loaded sections. */
(() => {
  'use strict';
  function initGstWorkflowPreview() {
    document.querySelectorAll('[data-gst-preview]').forEach((preview) => {
      if (preview.dataset.ready) return;
      preview.dataset.ready = 'true';
      const tabs = Array.from(preview.querySelectorAll('[role="tab"]'));
      const panels = Array.from(preview.querySelectorAll('[role="tabpanel"]'));
      const hero = preview.closest('.gst-intro-hero');
      const shortcuts = Array.from(hero.querySelectorAll('[data-gst-workflow]'));
      function selectTab(tab) {
        const workflow = tab.id.replace('gst-tab-', '');
        preview.dataset.workflow = workflow;
        shortcuts.forEach((button) => button.setAttribute('aria-pressed',
          String(button.dataset.gstWorkflow === workflow)));
        tabs.forEach((item) => {
          const active = item === tab;
          item.setAttribute('aria-selected', String(active));
          item.tabIndex = active ? 0 : -1;
        });
        panels.forEach((panel) => {
          const active = panel.id === tab.getAttribute('aria-controls');
          panel.hidden = !active;
          panel.classList.toggle('is-switching', active);
        });
      }
      shortcuts.forEach((button) => {
        button.addEventListener('click', () => {
          const tab = tabs.find((item) => item.id === 'gst-tab-' + button.dataset.gstWorkflow);
          if (!tab) return;
          selectTab(tab);
          tab.focus({ preventScroll: true });
          preview.scrollIntoView({ block: 'nearest', behavior:
            window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        });
      });
      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => selectTab(tab));
        tab.addEventListener('keydown', (event) => {
          let next;
          if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
          if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
          if (event.key === 'Home') next = 0;
          if (event.key === 'End') next = tabs.length - 1;
          if (next === undefined) return;
          event.preventDefault();
          tabs[next].focus();
          selectTab(tabs[next]);
        });
      });
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => preview.classList.toggle('is-entering', entry.isIntersecting));
        }, { threshold: 0.15 });
        observer.observe(preview);
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGstWorkflowPreview, { once: true });
  } else {
    initGstWorkflowPreview();
  }
  document.addEventListener('taxpower:sections-loaded', initGstWorkflowPreview);
})();

/* Keep the first two desktop feature frames equally tall without clipping copy. */
(() => {
  let observer;
  let pending = 0;
  let first;
  let second;
  function syncHeights() {
    pending = 0;
    if (!first?.isConnected || !second?.isConnected) return;
    first.style.removeProperty('min-height');
    second.style.removeProperty('min-height');
    if (window.matchMedia('(max-width: 900px)').matches) return;
    const height = Math.ceil(Math.max(first.offsetHeight, second.offsetHeight));
    first.style.minHeight = height + 'px';
    second.style.minHeight = height + 'px';
  }
  function schedule() {
    if (!pending) pending = requestAnimationFrame(syncHeights);
  }
  function init() {
    observer?.disconnect();
    first = document.getElementById('gst-return');
    second = document.getElementById('gst-reports');
    if (!first || !second) return;
    if ('ResizeObserver' in window) {
      observer = new ResizeObserver(schedule);
      [first, second].forEach((frame) => {
        frame.querySelectorAll('.gst-feature-row-copy, .gst-feature-row-media')
          .forEach((child) => observer.observe(child));
      });
    }
    schedule();
    document.fonts?.ready.then(schedule);
  }
  window.addEventListener('resize', schedule);
  document.addEventListener('taxpower:sections-loaded', init);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
