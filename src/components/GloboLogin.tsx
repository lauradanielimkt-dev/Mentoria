"use client";

import { useEffect, useRef } from "react";
import { DESTINOS, ORIGEM } from "@/lib/destinos";

/**
 * Fundo 3D da tela de login: milhares de partículas que se reúnem e formam o
 * globo (continentes em pontos), anéis finos de luz em volta e rotas de voo
 * saindo do sul do Brasil para os destinos da Marmaris.
 *
 * three.js e os pontos do mapa são carregados sob demanda, só no navegador.
 * Com "reduzir movimento" ativo no sistema, desenha um quadro estático.
 */
export function GloboLogin() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelado = false;
    let limpar = () => {};

    (async () => {
      const [THREE, pontosMod] = await Promise.all([import("three"), import("@/data/globo-pontos.json")]);
      if (cancelado) return;
      const flat = pontosMod.default as number[];

      const R = 1;
      const GRAUS = Math.PI / 180;
      const paraXYZ = (lat: number, lon: number, r = R) => {
        const phi = (90 - lat) * GRAUS;
        const theta = (lon + 180) * GRAUS;
        return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
      };

      /* ------------------------------------------------------------ cena */
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.cssText = "width:100%;height:100%;display:block";
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
      camera.position.set(0, 0, 4.2);

      const inclinado = new THREE.Group(); // inclinação + paralaxe do mouse
      const giro = new THREE.Group(); // rotação da Terra
      inclinado.add(giro);
      scene.add(inclinado);

      const descartaveis: { dispose: () => void }[] = [];
      const guardar = <T extends { dispose: () => void }>(x: T) => (descartaveis.push(x), x);

      const VERMELHO = new THREE.Color("#ff3b45");
      const PESSEGO = new THREE.Color("#ffd3ad");
      const BRANCO = new THREE.Color("#efe7e2");

      /* --------------------------------------------- esfera que oculta o verso */
      const oclusor = new THREE.Mesh(
        guardar(new THREE.SphereGeometry(R * 0.985, 48, 48)),
        guardar(new THREE.MeshBasicMaterial({ colorWrite: false })),
      );
      oclusor.renderOrder = 0;
      giro.add(oclusor);

      /* --------------------------------------------------- continentes em pontos */
      const n = flat.length / 2;
      const pos = new Float32Array(n * 3);
      const ini = new Float32Array(n * 3);
      const semente = new Float32Array(n);
      const rand = (() => {
        let s = 1337; // determinístico: a mesma nuvem em toda visita
        return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
      })();
      for (let i = 0; i < n; i++) {
        const p = paraXYZ(flat[i * 2], flat[i * 2 + 1]);
        pos.set([p.x, p.y, p.z], i * 3);
        // nuvem inicial: direção embaralhada e raio maior
        const d = new THREE.Vector3(p.x + (rand() - 0.5) * 1.6, p.y + (rand() - 0.5) * 1.6, p.z + (rand() - 0.5) * 1.6)
          .normalize()
          .multiplyScalar(1.5 + rand() * 1.9);
        ini.set([d.x, d.y, d.z], i * 3);
        semente[i] = rand();
      }
      const geoPontos = guardar(new THREE.BufferGeometry());
      geoPontos.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geoPontos.setAttribute("aInicio", new THREE.BufferAttribute(ini, 3));
      geoPontos.setAttribute("aSemente", new THREE.BufferAttribute(semente, 1));

      const matPontos = guardar(
        new THREE.ShaderMaterial({
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: {
            uProgresso: { value: 0 },
            uTempo: { value: 0 },
            uTamanho: { value: 9.5 },
            uEscala: { value: 1 },
            uCorA: { value: BRANCO },
            uCorB: { value: PESSEGO },
            uCorC: { value: VERMELHO },
          },
          vertexShader: /* glsl */ `
            attribute vec3 aInicio;
            attribute float aSemente;
            uniform float uProgresso, uTempo, uTamanho, uEscala;
            varying float vAlpha;
            varying float vSemente;
            void main() {
              float atraso = aSemente * 0.45;
              float p = clamp((uProgresso - atraso) / 0.55, 0.0, 1.0);
              p = 1.0 - pow(1.0 - p, 3.0);
              vec3 alvo = position + normalize(position) * sin(uTempo * 0.6 + aSemente * 40.0) * 0.005;
              vec3 atual = mix(aInicio, alvo, p);
              vec4 mv = modelViewMatrix * vec4(atual, 1.0);
              gl_Position = projectionMatrix * mv;
              float pisca = 0.78 + 0.22 * sin(uTempo * 1.4 + aSemente * 90.0);
              gl_PointSize = uTamanho * uEscala * pisca / -mv.z;
              vec3 nrm = normalize(normalMatrix * normalize(position));
              float frente = smoothstep(-0.35, 0.5, nrm.z);
              vAlpha = mix(0.09, 1.0, frente) * mix(0.3, 1.0, p);
              vSemente = aSemente;
            }`,
          fragmentShader: /* glsl */ `
            uniform vec3 uCorA, uCorB, uCorC;
            varying float vAlpha;
            varying float vSemente;
            void main() {
              float d = length(gl_PointCoord - 0.5);
              float a = smoothstep(0.5, 0.08, d);
              vec3 cor = mix(uCorA, uCorB, step(0.8, vSemente));
              cor = mix(cor, uCorC, step(0.955, vSemente));
              gl_FragColor = vec4(cor, a * vAlpha * 0.9);
            }`,
        }),
      );
      const pontos = new THREE.Points(geoPontos, matPontos);
      pontos.renderOrder = 1;
      giro.add(pontos);

      /* ------------------------------------------------------- halo da atmosfera */
      const atmosfera = new THREE.Mesh(
        guardar(new THREE.SphereGeometry(R * 1.17, 48, 48)),
        guardar(
          new THREE.ShaderMaterial({
            side: THREE.BackSide,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: { uCor: { value: new THREE.Color("#e0262e") }, uForca: { value: 0 } },
            vertexShader: /* glsl */ `
              varying vec3 vN;
              void main() { vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: /* glsl */ `
              uniform vec3 uCor; uniform float uForca;
              varying vec3 vN;
              void main() {
                float i = pow(clamp(-vN.z / 0.52, 0.0, 1.0), 2.4);
                gl_FragColor = vec4(uCor, i * 0.42 * uForca);
              }`,
          }),
        ),
      );
      atmosfera.renderOrder = 2;
      inclinado.add(atmosfera);

      /* ------------------------------------------- linha com "cometa" que percorre */
      const criarMatLinha = (cor: InstanceType<typeof THREE.Color>, opts: { base: number; vel: number; desloc: number; laco: boolean; cauda: number }) =>
        guardar(
          new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
              uTempo: { value: 0 },
              uRevela: { value: 0 },
              uCor: { value: cor },
              uPonta: { value: PESSEGO },
              uBase: { value: opts.base },
              uVel: { value: opts.vel },
              uDesloc: { value: opts.desloc },
              uLaco: { value: opts.laco ? 1 : 0 },
              uCauda: { value: opts.cauda },
            },
            vertexShader: /* glsl */ `
              attribute float aT;
              varying float vT;
              void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: /* glsl */ `
              uniform float uTempo, uRevela, uBase, uVel, uDesloc, uLaco, uCauda;
              uniform vec3 uCor, uPonta;
              varying float vT;
              void main() {
                float cab = fract(uTempo * uVel + uDesloc);
                float dist = uLaco > 0.5 ? mod(cab - vT, 1.0) : (cab * (1.0 + uCauda) - vT);
                float rastro = smoothstep(uCauda, 0.0, dist) * step(0.0, dist);
                float a = (uBase + rastro * 0.95) * step(vT, uRevela);
                gl_FragColor = vec4(mix(uCor, uPonta, rastro * rastro), a);
              }`,
          }),
        );

      /* ---------------------------------------------------------------- rotas */
      const origem = paraXYZ(ORIGEM[0], ORIGEM[1]).normalize();
      const matsRotas: InstanceType<typeof THREE.ShaderMaterial>[] = [];
      const SEG = 96;
      DESTINOS.forEach((dst, k) => {
        const fim = paraXYZ(dst.ll[0], dst.ll[1]).normalize();
        const ang = origem.angleTo(fim);
        const altura = 0.06 + ang * 0.13;
        const v = new Float32Array((SEG + 1) * 3);
        const ts = new Float32Array(SEG + 1);
        for (let i = 0; i <= SEG; i++) {
          const t = i / SEG;
          // slerp entre origem e destino, elevado no meio do caminho
          const s = Math.sin(ang);
          const a = Math.sin((1 - t) * ang) / s;
          const b = Math.sin(t * ang) / s;
          const p = new THREE.Vector3(origem.x * a + fim.x * b, origem.y * a + fim.y * b, origem.z * a + fim.z * b)
            .normalize()
            .multiplyScalar(R * (1.003 + altura * Math.sin(Math.PI * t)));
          v.set([p.x, p.y, p.z], i * 3);
          ts[i] = t;
        }
        const g = guardar(new THREE.BufferGeometry());
        g.setAttribute("position", new THREE.BufferAttribute(v, 3));
        g.setAttribute("aT", new THREE.BufferAttribute(ts, 1));
        const m = criarMatLinha(VERMELHO, { base: 0.2, vel: 0.1 + (k % 4) * 0.018, desloc: (k * 0.37) % 1, laco: false, cauda: 0.3 });
        matsRotas.push(m);
        const linha = new THREE.Line(g, m);
        linha.renderOrder = 3;
        giro.add(linha);
      });

      /* -------------------------------------------------- marcadores das cidades */
      const cidades = [ORIGEM, ...DESTINOS.map((d) => d.ll)];
      const posCid = new Float32Array(cidades.length * 3);
      const faseCid = new Float32Array(cidades.length);
      cidades.forEach((ll, i) => {
        const p = paraXYZ(ll[0], ll[1], R * 1.004);
        posCid.set([p.x, p.y, p.z], i * 3);
        faseCid[i] = i === 0 ? 0 : 0.2 + i * 0.61;
      });
      const geoCid = guardar(new THREE.BufferGeometry());
      geoCid.setAttribute("position", new THREE.BufferAttribute(posCid, 3));
      geoCid.setAttribute("aFase", new THREE.BufferAttribute(faseCid, 1));
      const matCid = guardar(
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: { uTempo: { value: 0 }, uEscala: { value: 1 }, uOpac: { value: 0 }, uCor: { value: PESSEGO } },
          vertexShader: /* glsl */ `
            attribute float aFase;
            uniform float uTempo, uEscala;
            void main() {
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              gl_Position = projectionMatrix * mv;
              float pulso = 0.8 + 0.35 * sin(uTempo * 2.0 + aFase * 6.283);
              gl_PointSize = (aFase == 0.0 ? 46.0 : 30.0) * uEscala * pulso / -mv.z;
            }`,
          fragmentShader: /* glsl */ `
            uniform vec3 uCor; uniform float uOpac;
            void main() {
              float d = length(gl_PointCoord - 0.5);
              float nucleo = smoothstep(0.14, 0.0, d);
              float halo = smoothstep(0.5, 0.08, d) * 0.32;
              gl_FragColor = vec4(uCor, (nucleo + halo) * uOpac);
            }`,
        }),
      );
      const marcadores = new THREE.Points(geoCid, matCid);
      marcadores.renderOrder = 4;
      giro.add(marcadores);

      /* ---------------------------------------------------- anéis finos de luz */
      const aneis = new THREE.Group();
      inclinado.add(aneis);
      const matsAneis: InstanceType<typeof THREE.ShaderMaterial>[] = [];
      const criarAnel = (raio: number, rx: number, ry: number, opts: { base: number; vel: number; desloc: number; cauda: number }) => {
        const N = 220;
        const v = new Float32Array(N * 3);
        const ts = new Float32Array(N);
        for (let i = 0; i < N; i++) {
          const a = (i / N) * Math.PI * 2;
          v.set([Math.cos(a) * raio, Math.sin(a) * raio, 0], i * 3);
          ts[i] = i / N;
        }
        const g = guardar(new THREE.BufferGeometry());
        g.setAttribute("position", new THREE.BufferAttribute(v, 3));
        g.setAttribute("aT", new THREE.BufferAttribute(ts, 1));
        const m = criarMatLinha(PESSEGO, { ...opts, laco: true });
        matsAneis.push(m);
        const anel = new THREE.LineLoop(g, m);
        anel.rotation.set(rx, ry, 0);
        anel.renderOrder = 5;
        aneis.add(anel);
        return anel;
      };
      const anel1 = criarAnel(1.42, 1.2, 0.28, { base: 0.2, vel: 0.045, desloc: 0.1, cauda: 0.32 });
      const anel2 = criarAnel(1.68, 1.33, -0.5, { base: 0.09, vel: 0.03, desloc: 0.6, cauda: 0.22 });

      /* ----------------------------------------------------- poeira ao redor */
      const ND = 520;
      const posPoeira = new Float32Array(ND * 3);
      for (let i = 0; i < ND; i++) {
        const d = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize().multiplyScalar(1.35 + rand() * 2.6);
        posPoeira.set([d.x, d.y * 0.8, d.z], i * 3);
      }
      const geoPoeira = guardar(new THREE.BufferGeometry());
      geoPoeira.setAttribute("position", new THREE.BufferAttribute(posPoeira, 3));
      const matPoeira = guardar(
        new THREE.PointsMaterial({ color: PESSEGO, size: 0.011, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      const poeira = new THREE.Points(geoPoeira, matPoeira);
      inclinado.add(poeira);

      /* ----------------------------------------------------- tamanho e posição */
      const ajustar = () => {
        const w = el.clientWidth || 1;
        const h = el.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        const meiaAlt = Math.tan((camera.fov * GRAUS) / 2) * camera.position.z;
        const meiaLarg = meiaAlt * camera.aspect;
        if (w >= 1024) {
          // telas largas (mesmo corte do "lg" no CSS): globo à direita, formulário à esquerda
          inclinado.position.set(meiaLarg * 0.46, 0, 0);
          inclinado.scale.setScalar(Math.min(1.12, Math.max(0.8, meiaLarg / 2.3)));
        } else {
          // telas estreitas: globo no alto, formulário embaixo
          const s = Math.min(0.8, meiaLarg / 1.15);
          inclinado.position.set(0, meiaAlt * 0.5, 0);
          inclinado.scale.setScalar(s);
        }
        const escala = (h / 800) * dpr * inclinado.scale.x;
        matPontos.uniforms.uEscala.value = escala;
        matCid.uniforms.uEscala.value = escala;
      };

      /* ----------------------------------------------------------- animação */
      const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const LON_FRENTE = -28; // Atlântico ao centro: Brasil à esquerda, Europa e África à direita
      const giroBase = (-90 - LON_FRENTE) * GRAUS;
      const alvo = { x: 0, y: 0 };
      const atual = { x: 0, y: 0 };
      const suave = (x: number) => Math.min(1, Math.max(0, x));
      let inicio = performance.now();
      let raf = 0;

      const desenhar = (t: number) => {
        const intro = reduzido ? 1 : suave(t / 3.0);
        const revela = reduzido ? 1 : suave((t - 1.9) / 2.4);
        const brilho = reduzido ? 1 : suave((t - 1.2) / 2.0);

        matPontos.uniforms.uProgresso.value = intro;
        matPontos.uniforms.uTempo.value = t;
        matCid.uniforms.uTempo.value = t;
        matCid.uniforms.uOpac.value = revela;
        (atmosfera.material as InstanceType<typeof THREE.ShaderMaterial>).uniforms.uForca.value = brilho;
        matPoeira.opacity = 0.45 * brilho;
        for (const m of matsRotas) {
          m.uniforms.uTempo.value = t;
          m.uniforms.uRevela.value = revela;
        }
        for (const m of matsAneis) {
          m.uniforms.uTempo.value = t;
          m.uniforms.uRevela.value = brilho;
        }

        atual.x += (alvo.x - atual.x) * 0.045;
        atual.y += (alvo.y - atual.y) * 0.045;
        // balanço suave em vez de giro contínuo: as rotas nunca vão para trás do globo
        giro.rotation.y = giroBase + (reduzido ? 0 : Math.sin(t * 0.07) * 0.38);
        inclinado.rotation.x = 0.16 + atual.y * 0.1;
        inclinado.rotation.y = atual.x * 0.2;
        anel1.rotation.z = t * 0.05;
        anel2.rotation.z = -t * 0.035;
        poeira.rotation.y = -t * 0.012;

        renderer.render(scene, camera);
      };

      const quadro = () => {
        desenhar((performance.now() - inicio) / 1000);
        raf = requestAnimationFrame(quadro);
      };

      const aoMover = (e: PointerEvent) => {
        alvo.x = (e.clientX / window.innerWidth) * 2 - 1;
        alvo.y = (e.clientY / window.innerHeight) * 2 - 1;
      };
      const aoMudarVisibilidade = () => {
        cancelAnimationFrame(raf);
        if (!document.hidden && !reduzido) raf = requestAnimationFrame(quadro);
      };
      const observador = new ResizeObserver(() => {
        ajustar();
        if (reduzido) desenhar(10);
      });

      ajustar();
      observador.observe(el);
      if (reduzido) {
        desenhar(10);
      } else {
        inicio = performance.now();
        raf = requestAnimationFrame(quadro);
        window.addEventListener("pointermove", aoMover, { passive: true });
        document.addEventListener("visibilitychange", aoMudarVisibilidade);
      }
      el.dataset.pronto = "sim";

      limpar = () => {
        cancelAnimationFrame(raf);
        observador.disconnect();
        window.removeEventListener("pointermove", aoMover);
        document.removeEventListener("visibilitychange", aoMudarVisibilidade);
        for (const d of descartaveis) d.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
      if (cancelado) limpar();
    })().catch(() => {
      // Sem WebGL: a página fica só com o fundo em gradiente.
    });

    return () => {
      cancelado = true;
      limpar();
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-[1400ms] ease-out data-[pronto=sim]:opacity-100"
    />
  );
}
