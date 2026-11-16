/**
 * pawns3d.js  —  6 pion 3D prosedural untuk Three.js (tanpa file model, tanpa tekstur).
 *
 * Tipe: 'pion' (pion klasik), 'mobil', 'topi', 'pesawat', 'anjing', 'kapal'.
 * Warna NATURAL (gading) secara bawaan; bagian bodi bisa diwarnai sesuai pemain lewat setColor().
 * Detail yang tidak ikut diwarnai: kaca, ban, mata, hidung, jendela, krom, krem.
 *
 *   const factory = createPawnFactory(THREE);
 *   const p = factory.make('mobil', { color: 0xd6283b });   // THREE.Mesh, 2 material (tint + detail) = 2 draw call
 *   scene.add(p);  p.userData.setColor(0x2f6fd6);            // ganti warna pemain kapan saja
 *
 * Satuan: alas bulat berjari-jari 1.0, tinggi total <= ~2.8. Depan pion menghadap +Z. Pivot di tengah dasar.
 */
export const PAWN_TYPES = ['pion', 'mobil', 'topi', 'pesawat', 'anjing', 'kapal'];
export const PAWN_LABELS = { pion: 'Pion klasik', mobil: 'Mobil', topi: 'Topi', pesawat: 'Pesawat', anjing: 'Anjing', kapal: 'Kapal' };
export const NATURAL = 0xf2eadb;

export function createPawnFactory(THREE, { natural = NATURAL, quality = 1 } = {}) {
  const T = THREE, PI = Math.PI, seg = n => Math.max(6, Math.round(n * quality));
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  /* ---------- pembuat bentuk dasar ---------- */
  const lathe = (pts, n = 44) => new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), seg(n));
  const sph = (r, ws = 22, hs = 14) => new T.SphereGeometry(r, seg(ws), seg(hs));
  const cyl = (rt, rb, h, n = 36, open = false, ts = 0, tl = PI * 2) => new T.CylinderGeometry(rt, rb, h, seg(n), 1, open, ts, tl);
  const tor = (R, r, arc = PI * 2, rs = 12, ts = 32) => new T.TorusGeometry(R, r, seg(rs), seg(ts), arc);
  const cone = (r, h, n = 24) => new T.ConeGeometry(r, h, seg(n));
  function rbox(w, h, d, r, sg = 3) {                      // kotak bersudut membulat dengan normal halus di sudut
    const g = new T.BoxGeometry(w, h, d, sg, sg, sg), pos = g.attributes.position, nor = g.attributes.normal, v = new T.Vector3(), kx = w / 2 - r, ky = h / 2 - r, kz = d / 2 - r;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i); const ix = clamp(v.x, -kx, kx), iy = clamp(v.y, -ky, ky), iz = clamp(v.z, -kz, kz), dx = v.x - ix, dy = v.y - iy, dz = v.z - iz, len = Math.hypot(dx, dy, dz);
      if (len > 1e-6) { pos.setXYZ(i, ix + dx / len * r, iy + dy / len * r, iz + dz / len * r); nor.setXYZ(i, dx / len, dy / len, dz / len); }
    }
    return g;
  }
  function extrudeXZ(points, depth, bevel = .03) {         // titik (x,z) tampak atas -> prisma setebal `depth` ke bawah (sumbu -y)
    const sh = new T.Shape(); points.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])));
    const g = new T.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 }); g.rotateX(PI / 2); return g;
  }

  /* ---------- perakit bagian ---------- */
  function Builder() {
    const parts = [], stack = [new T.Matrix4()];
    const compose = (p, r, s) => new T.Matrix4().compose(new T.Vector3(...p), new T.Quaternion().setFromEuler(new T.Euler(...r)), new T.Vector3(...s));
    return {
      push(p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) { stack.push(stack[stack.length - 1].clone().multiply(compose(p, r, s))); },
      pop() { stack.pop(); },
      /** g = abu-abu 0..1 (bagian bodi, ikut diwarnai pemain) ; c = warna hex tetap (detail) */
      add(geo, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], g, c } = {}) {
        const m = stack[stack.length - 1].clone().multiply(compose(p, r, s)); geo = geo.index ? geo.toNonIndexed() : geo.clone(); geo.applyMatrix4(m); parts.push({ geo, tint: g !== undefined, g, c });
      },
      finish() {
        const P = [], N = [], K = [], groups = []; let count = 0; const col = new T.Color();
        for (const tint of [true, false]) {
          const start = count;
          for (const part of parts.filter(q => q.tint === tint)) {
            const p = part.geo.attributes.position.array, n = part.geo.attributes.normal.array; if (!tint) col.setHex(part.c);
            for (let i = 0; i < p.length; i += 3) { P.push(p[i], p[i + 1], p[i + 2]); N.push(n[i], n[i + 1], n[i + 2]); if (tint) K.push(part.g, part.g, part.g); else K.push(col.r, col.g, col.b); count++; }
          }
          if (count > start) groups.push([start, count - start, tint ? 0 : 1]);
        }
        const G = new T.BufferGeometry(); G.setAttribute('position', new T.Float32BufferAttribute(P, 3)); G.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); G.setAttribute('color', new T.Float32BufferAttribute(K, 3));
        groups.forEach(g => G.addGroup(g[0], g[1], g[2])); G.computeBoundingBox(); G.computeBoundingSphere(); return G;
      },
    };
  }
  const BASE_TOP = 0.30;
  function base(b) { b.add(cyl(1.0, 1.04, .22, 56), { p: [0, .11, 0], g: .80 }); b.add(cyl(.93, .97, .08, 56), { p: [0, .26, 0], g: .94 }); }

  /* ---------- model ---------- */
  const MODELS = {
    pion(b) {
      b.push([0, BASE_TOP, 0]);
      b.add(lathe([[0, 0], [.66, 0], [.69, .08], [.6, .25], [.46, .55], [.33, .9], [.25, 1.15], [.22, 1.28], [0, 1.28]], 56), { g: 1 });
      b.add(tor(.26, .06, PI * 2, 12, 32), { p: [0, 1.28, 0], r: [PI / 2, 0, 0], g: .96 });
      b.add(sph(.4, 36, 24), { p: [0, 1.66, 0], g: 1 });
      b.pop();
    },
    topi(b) {
      b.push([0, BASE_TOP + .06, 0], [0, 0.35, 0.09]);
      b.add(lathe([[0, 0], [.98, 0], [1.04, .05], [1.0, .12], [.60, .12]], 56), { g: .93 });
      b.add(cyl(.60, .64, 1.15, 48), { p: [0, .685, 0], g: 1 });
      b.add(tor(.6, .045, PI * 2, 10, 40), { p: [0, 1.26, 0], r: [PI / 2, 0, 0], g: .98 });
      b.add(cyl(.655, .668, .27, 48), { p: [0, .33, 0], g: .52 });
      b.pop();
    },
    mobil(b) {
      b.push([0, BASE_TOP, 0]);
      const G = 1, chrome = 0xdadde5, dark = 0x2d2f36, glass = 0xbfe3f5, seat = 0x2b2b35;
      b.add(rbox(.95, .34, 1.9, .11), { p: [0, .5, 0], g: G });                              // sasis
      b.add(rbox(.86, .28, .78, .11), { p: [0, .62, .62], g: G });                           // kap mesin
      b.add(rbox(.86, .3, .6, .11), { p: [0, .62, -.68], g: .97 });                          // bagasi
      b.add(rbox(.72, .1, .62, .04), { p: [0, .69, -.1], c: seat });                         // lantai kabin
      b.add(rbox(.66, .34, .12, .05), { p: [0, .92, -.4], c: seat });                        // sandaran jok
      b.add(rbox(.62, .12, .34, .05), { p: [0, .76, -.14], c: seat });                       // dudukan jok
      b.add(rbox(.74, .34, .04, .015), { p: [0, .95, .27], r: [-.38, 0, 0], c: glass });       // kaca depan
      for (const sx of [-1, 1]) { b.add(cyl(.028, .028, .38, 10), { p: [sx * .39, .95, .27], r: [-.38, 0, 0], c: chrome }); b.add(sph(.04, 10, 8), { p: [sx * .39, 1.14, .21], c: chrome }); }
      b.add(cyl(.02, .02, .76, 10), { p: [0, 1.13, .21], r: [0, 0, PI / 2], c: chrome });
      for (const sx of [-1, 1]) for (const z of [.62, -.62]) {
        b.add(cyl(.27, .27, .2, 28), { p: [sx * .52, .27, z], r: [0, 0, PI / 2], c: dark });
        b.add(cyl(.13, .13, .22, 20), { p: [sx * .52, .27, z], r: [0, 0, PI / 2], c: chrome });
        b.add(rbox(.2, .12, .6, .06), { p: [sx * .46, .55, z], g: .95 });                    // spatbor
      }
      for (const sx of [-1, 1]) b.add(sph(.1, 16, 12), { p: [sx * .3, .78, .98], c: 0xfff2c0 }); // lampu depan
      b.add(rbox(.4, .28, .06, .02), { p: [0, .58, .97], c: chrome });                       // gril
      b.add(rbox(1.04, .08, .12, .04), { p: [0, .4, 1.0], c: chrome }); b.add(rbox(1.04, .08, .12, .04), { p: [0, .4, -1.0], c: chrome });
      b.pop();
    },
    pesawat(b) {
      b.push([0, BASE_TOP, 0]);
      b.add(cyl(.15, .22, .8, 24), { p: [0, .4, 0], g: .8 });                                // tiang
      b.push([0, 1.0, 0], [-.13, 0, .1]);                                                    // pesawat miring: hidung naik, sayap condong
      b.add(lathe([[0, -1.3], [.1, -1.25], [.22, -1.0], [.34, -.55], [.39, 0], [.39, .5], [.34, .9], [.22, 1.15], [0, 1.32]], 40), { r: [PI / 2, 0, 0], g: 1 }); // badan
      const wing = sgn => extrudeXZ([[sgn * .3, .45], [sgn * 1.5, -.34], [sgn * 1.5, -.7], [sgn * .3, -.4]], .08, .03);
      for (const sgn of [1, -1]) {
        b.add(wing(sgn), { p: [0, .02, 0], g: .93 });                                         // sayap utama
        b.add(extrudeXZ([[sgn * .15, -.95], [sgn * .72, -1.22], [sgn * .72, -1.42], [sgn * .15, -1.3]], .06, .025), { p: [0, .12, 0], g: .9 }); // sayap ekor
        b.add(cyl(.15, .12, .6, 20), { p: [sgn * .78, -.16, .12], r: [PI / 2, 0, 0], g: .88 });                                              // mesin
        b.add(cyl(.1, .1, .04, 16), { p: [sgn * .78, -.16, .44], r: [PI / 2, 0, 0], c: 0x39414f });
      }
      { const sh = new T.Shape(); sh.moveTo(-.7, .3); sh.lineTo(-1.18, .98); sh.lineTo(-1.38, .98); sh.lineTo(-1.2, .3); const g = new T.ExtrudeGeometry(sh, { depth: .08, bevelEnabled: true, bevelThickness: .025, bevelSize: .025, bevelSegments: 2 }); g.rotateY(-PI / 2); b.add(g, { p: [.04, .0, 0], g: .86 }); }
      b.add(sph(.22, 20, 14), { p: [0, .26, .8], s: [1, .62, 1.5], c: 0x24324f });          // kaca kokpit
      for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) b.add(sph(.06, 10, 8), { p: [sx * .385, .1, -.62 + i * .27], s: [.45, 1, 1], c: 0x24324f }); // jendela
      b.pop(); b.pop();
    },
    anjing(b) {
      b.push([0, BASE_TOP, 0]);
      const cream = 0xfff0d6, dark = 0x2a2020;
      b.add(sph(.6, 28, 18), { p: [0, .72, -.08], s: [.74, .64, 1.0], g: 1 });                // badan
      b.add(sph(.34, 22, 14), { p: [0, .64, .46], s: [.82, .95, .7], c: cream });            // dada krem
      for (const sx of [-1, 1]) for (const z of [.38, -.5]) {
        b.add(cyl(.115, .105, .5, 14), { p: [sx * .25, .27, z], g: .98 });                    // kaki
        b.add(sph(.15, 14, 10), { p: [sx * .25, .07, z + .05], s: [1, .62, 1.35], c: cream }); // telapak
      }
      b.add(sph(.46, 28, 18), { p: [0, 1.24, .52], s: [1.08, .94, 1], g: 1 });               // kepala (agak lebar)
      b.add(sph(.2, 18, 12), { p: [0, 1.1, .9], s: [.95, .68, 1.45], c: cream });            // moncong
      b.add(sph(.062, 12, 8), { p: [0, 1.17, 1.14], c: dark });                               // hidung
      for (const sx of [-1, 1]) {
        b.add(sph(.2, 16, 12), { p: [sx * .29, 1.1, .7], c: cream });                         // pipi
        b.add(sph(.055, 10, 8), { p: [sx * .18, 1.3, .93], c: dark });                        // mata
        b.add(cone(.22, .5, 4), { p: [sx * .27, 1.72, .46], r: [-.12, PI / 4, sx * -.2], g: 1 });   // telinga tegak
        b.add(cone(.13, .32, 4), { p: [sx * .27, 1.68, .52], r: [-.12, PI / 4, sx * -.2], c: 0xffc9a8 }); // dalam telinga
      }
      b.add(sph(.13, 12, 8), { p: [0, .98, -.7], g: 1 });
      b.add(tor(.23, .1, 4.9, 10, 22), { p: [0, 1.22, -.72], r: [0, PI / 2, PI * .3], g: 1 });  // ekor melingkar
      b.pop();
    },
    kapal(b) {
      b.push([0, BASE_TOP, 0]);
      b.add(cyl(.3, .38, .84, 28), { p: [0, .42, 0], g: .8 });                                 // tiang
      const outline = [[0, 1.35], [.18, 1.1], [.4, .6], [.5, .1], [.5, -.9], [.4, -1.1], [-.4, -1.1], [-.5, -.9], [-.5, .1], [-.4, .6], [-.18, 1.1]];
      b.add(extrudeXZ(outline, .4, .11), { p: [0, 1.17, 0], g: .86 });                         // lambung tebal membulat
      b.add(extrudeXZ(outline.map(p => [p[0] * .93, p[1] * .93 - .02]), .06, .02), { p: [0, 1.36, 0], g: 1 }); // geladak
      b.add(rbox(.72, .3, 1.1, .07), { p: [0, 1.52, -.12], g: 1 });
      b.add(rbox(.54, .26, .78, .07), { p: [0, 1.79, -.2], g: .95 });
      b.add(rbox(.4, .2, .36, .06), { p: [0, 2.02, .0], g: 1 });
      for (const sx of [-1, 1]) {
        b.add(cyl(.12, .14, .42, 20), { p: [sx * .15, 2.13, -.4], g: .78 });                  // cerobong
        b.add(cyl(.12, .12, .05, 20), { p: [sx * .15, 2.36, -.4], c: 0x3a3a45 });
        for (const z of [.3, .1, -.1, -.3, -.5]) b.add(rbox(.04, .1, .12, .02), { p: [sx * .37, 1.56, z], c: 0x24324f });
        for (const z of [-.05, -.25, -.45]) b.add(rbox(.04, .09, .1, .02), { p: [sx * .28, 1.81, z], c: 0x24324f });
        for (let i = 0; i < 5; i++) b.add(cyl(.045, .045, .03, 12), { p: [sx * .52, 1.0, -.7 + i * .35], r: [0, 0, PI / 2], c: 0x24324f }); // lubang jendela lambung
      }
      b.add(rbox(.3, .08, .16, .03), { p: [0, 2.04, .2], c: 0x24324f });                      // kaca anjungan
      b.pop();
    },
  };

  /* ---------- fabrik ---------- */
  const cache = {}, fixedMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: .42, metalness: .05 });
  function geometry(type) {
    if (!MODELS[type]) throw new Error('Tipe pion tidak dikenal: ' + type + ' (pilih: ' + PAWN_TYPES.join(', ') + ')');
    if (!cache[type]) { const b = Builder(); base(b); MODELS[type](b); cache[type] = b.finish(); } return cache[type];
  }
  const tintMaterial = color => new T.MeshPhysicalMaterial({ vertexColors: true, color, roughness: .32, metalness: 0, clearcoat: .55, clearcoatRoughness: .25 });
  function make(type, { color = natural, scale = 1, shadows = true } = {}) {
    const tint = tintMaterial(color), mesh = new T.Mesh(geometry(type), [tint, fixedMat]);
    mesh.scale.setScalar(scale); mesh.castShadow = shadows; mesh.receiveShadow = false; mesh.name = 'pion_' + type;
    mesh.userData = { pawnType: type, tintMaterial: tint, setColor: c => { tint.color.set(c); return mesh; } };
    return mesh;
  }
  return {
    make, geometry, types: PAWN_TYPES, labels: PAWN_LABELS, natural, fixedMaterial: fixedMat, tintMaterial,
    triangles: type => geometry(type).attributes.position.count / 3,
    dispose() { Object.values(cache).forEach(g => g.dispose()); fixedMat.dispose(); },
  };
}
