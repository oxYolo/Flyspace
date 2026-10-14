function calculateFOVFromZoom(U, t = 35, e = 0.3, i = 90) {
  const o = Math.max(2, Math.min(200, U)),
    r = t * Math.pow(2 / o, 0.75);
  return Math.max(e, Math.min(i, r));
}
const ZOOM_FOV_PRESETS = {
  "2x": 35,
  "3x": 25,
  "5x": 17,
  "10x": 8.5,
  "13x": 6,
  "20x": 3.8,
  "30x": 2.5,
  "45x": 1.7,
  "60x": 1.3,
  "80x": 1,
  "100x": 0.8,
  "120x": 0.65,
  "150x": 0.52,
  "180x": 0.44,
  "200x": 0.4,
};
function calculateFOVFromPresets(U) {
  const t = function (l, u) {
      return l >= u;
    },
    e = function (l, u) {
      return l - u;
    },
    i = function (l, u) {
      return l < u;
    },
    o = function (l, u) {
      return l + u;
    },
    r = function (l, u) {
      return l / u;
    },
    n = function (l, u) {
      return l - u;
    },
    s = Object.entries(ZOOM_FOV_PRESETS)
      .map(([l, u]) => ({
        zoom: parseFloat(l.replace("x", "")),
        fov: u,
      }))
      .sort((l, u) => l.zoom - u.zoom);
  if (U <= s[0].zoom) return s[0].fov;
  if (t(U, s[s.length - 1].zoom)) return s[e(s.length, 1)].fov;
  for (let l = 0; i(l, e(s.length, 1)); l++) {
    const u = s[l],
      c = s[o(l, 1)];
    if (t(U, u.zoom) && U <= c.zoom) {
      const d = r(U - u.zoom, n(c.zoom, u.zoom));
      return o(u.fov, (c.fov - u.fov) * d);
    }
  }
  return 45;
}
function createFrustumGeometry(U, t, e, i, o = {}) {
  const r = function (F, I) {
      return F * I;
    },
    n = function (F, I) {
      return F < I;
    },
    s = "#99FF99",
    l = function (F, I) {
      return F === I;
    },
    u = "string",
    c = function (F, I) {
      return F !== I;
    },
    d = "ScwMF",
    _ = function (F, I) {
      return F < I;
    },
    f = function (F, I) {
      return F * I;
    },
    a = function (F, I) {
      return F / I;
    },
    h = function (F, I) {
      return F !== I;
    },
    y = "dVael",
    g = function (F, I) {
      return F % I;
    },
    x = function (F, I) {
      return F + I;
    },
    p = "Color",
    C = function (F, I) {
      return F < I;
    },
    D = "bRKID",
    b = {
      material: Cesium.Color.fromCssColorString(s).withAlpha(0.22),
      outlineColor: Cesium.Color.fromCssColorString("#006600"),
      outlineWidth: 2,
      depthFailMaterial: Cesium.Color.fromCssColorString(s).withAlpha(0.1),
      outline: !0,
      fill: !0,
      heightReference: Cesium.HeightReference.NONE,
      classificationType: Cesium.ClassificationType.BOTH,
      shadows: Cesium.ShadowMode.ENABLED,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e4),
      ...o,
    };
  b.material &&
    l(typeof b.material, u) &&
    (b.material = Cesium.Color.fromCssColorString(b.material).withAlpha(0.22)),
    b.outlineColor &&
      typeof b.outlineColor === u &&
      (b.outlineColor = Cesium.Color.fromCssColorString(b.outlineColor)),
    b.depthFailMaterial &&
      typeof b.depthFailMaterial === u &&
      (b.depthFailMaterial = Cesium.Color.fromCssColorString(
        b.depthFailMaterial,
      ).withAlpha(0.1));
  const S = Cesium.Cartesian3.fromDegrees(U[0], U[1], U[2] || 0),
    v = _(i, 50) ? f(i, 0.6) : i,
    V = a(e, 2),
    E = r(v, Math.tan(Cesium.Math.toRadians(V))),
    B = Cesium.Transforms.eastNorthUpToFixedFrame(S),
    H = new Cesium.HeadingPitchRoll(
      Cesium.Math.toRadians(t.heading || 0),
      Cesium.Math.toRadians(t.pitch || 0),
      Cesium.Math.toRadians(t.roll || 0),
    ),
    P = Cesium.Transforms.headingPitchRollQuaternion(S, H),
    w = Cesium.Matrix3.fromQuaternion(P),
    m = [
      new Cesium.Cartesian3(-E, -v, -E),
      new Cesium.Cartesian3(E, -v, -E),
      new Cesium.Cartesian3(E, -v, E),
      new Cesium.Cartesian3(-E, -v, E),
    ].map((F) => {
      {
        const I = Cesium.Matrix3.multiplyByVector(
          w,
          F,
          new Cesium.Cartesian3(),
        );
        return Cesium.Matrix4.multiplyByPoint(B, I, new Cesium.Cartesian3());
      }
    }),
    L = [],
    T = globalThis.currentViewer || window.cesiumViewer || window.viewer;
  if (!T) return null;
  try {
    for (let A = 0; A < 4; A++) {
      const z = g(x(A, 1), 4),
        G = new Float64Array([
          S.x,
          S.y,
          S.z,
          m[A].x,
          m[A].y,
          m[A].z,
          m[z].x,
          m[z].y,
          m[z].z,
        ]),
        k = new Cesium.Geometry({
          attributes: {
            position: new Cesium.GeometryAttribute({
              componentDatatype: Cesium.ComponentDatatype.DOUBLE,
              componentsPerAttribute: 3,
              values: G,
            }),
          },
          indices: new Uint16Array([0, 1, 2]),
          primitiveType: Cesium.PrimitiveType.TRIANGLES,
          boundingSphere: Cesium.BoundingSphere.fromVertices(G),
        }),
        Y = {};
      Y.geometry = k;
      const j = {};
      j.color = b.material;
      const W = new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance(Y),
        appearance: new Cesium.MaterialAppearance({
          material: Cesium.Material.fromType(p, j),
          translucent: !0,
          closed: !1,
        }),
        show: !0,
      });
      T.scene.primitives.add(W), L.push(W);
    }
    const F = new Float64Array([
        m[0].x,
        m[0].y,
        m[0].z,
        m[1].x,
        m[1].y,
        m[1].z,
        m[2].x,
        m[2].y,
        m[2].z,
        m[3].x,
        m[3].y,
        m[3].z,
      ]),
      I = new Cesium.Geometry({
        attributes: {
          position: new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: F,
          }),
        },
        indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
        primitiveType: Cesium.PrimitiveType.TRIANGLES,
        boundingSphere: Cesium.BoundingSphere.fromVertices(F),
      }),
      R = {};
    R.geometry = I;
    const N = {};
    N.color = b.material;
    const O = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance(R),
      appearance: new Cesium.MaterialAppearance({
        material: Cesium.Material.fromType(p, N),
        translucent: !0,
        closed: !1,
      }),
      show: !0,
    });
    if ((T.scene.primitives.add(O), L.push(O), b.outline)) {
      const A = [...F, m[0].x, m[0].y, m[0].z],
        z = [];
      for (let W = 0; n(W, 5); W++)
        z.push(
          b.outlineColor.red,
          b.outlineColor.green,
          b.outlineColor.blue,
          b.outlineColor.alpha,
        );
      const G = new Cesium.Geometry({
          attributes: {
            position: new Cesium.GeometryAttribute({
              componentDatatype: Cesium.ComponentDatatype.DOUBLE,
              componentsPerAttribute: 3,
              values: new Float64Array(A),
            }),
            color: new Cesium.GeometryAttribute({
              componentDatatype: Cesium.ComponentDatatype.FLOAT,
              componentsPerAttribute: 4,
              values: new Float32Array(z),
            }),
          },
          indices: new Uint16Array([0, 1, 1, 2, 2, 3, 3, 4]),
          primitiveType: Cesium.PrimitiveType.LINES,
          boundingSphere: Cesium.BoundingSphere.fromVertices(A),
        }),
        k = {};
      k.geometry = G;
      const Y = {
          translucent: !1,
        },
        j = new Cesium.Primitive({
          geometryInstances: new Cesium.GeometryInstance(k),
          appearance: new Cesium.PolylineColorAppearance(Y),
          show: !0,
        });
      T.scene.primitives.add(j), L.push(j);
      for (let W = 0; C(W, 4); W++) {
        const Z = new Float64Array([S.x, S.y, S.z, m[W].x, m[W].y, m[W].z]),
          Q = [
            b.outlineColor.red,
            b.outlineColor.green,
            b.outlineColor.blue,
            b.outlineColor.alpha,
            b.outlineColor.red,
            b.outlineColor.green,
            b.outlineColor.blue,
            b.outlineColor.alpha,
          ],
          $ = new Cesium.Geometry({
            attributes: {
              position: new Cesium.GeometryAttribute({
                componentDatatype: Cesium.ComponentDatatype.DOUBLE,
                componentsPerAttribute: 3,
                values: Z,
              }),
              color: new Cesium.GeometryAttribute({
                componentDatatype: Cesium.ComponentDatatype.FLOAT,
                componentsPerAttribute: 4,
                values: new Float32Array(Q),
              }),
            },
            indices: new Uint16Array([0, 1]),
            primitiveType: Cesium.PrimitiveType.LINES,
            boundingSphere: Cesium.BoundingSphere.fromVertices(Z),
          }),
          q = {};
        q.geometry = $;
        const X = {
            translucent: !1,
          },
          K = new Cesium.Primitive({
            geometryInstances: new Cesium.GeometryInstance(q),
            appearance: new Cesium.PolylineColorAppearance(X),
            show: !0,
          });
        T.scene.primitives.add(K), L.push(K);
      }
    }
    const M = {};
    return (M.primitives = L), (M.apex = S), (M.vertices = m), (M.style = b), M;
  } catch {
    return (
      L.forEach((I) => {
        I && !I.isDestroyed() && (T.scene.primitives.remove(I), I.destroy());
      }),
      null
    );
  }
}
const LabelStyle = {
  FILL: "FILL",
  OUTLINE: "OUTLINE",
  FILL_AND_OUTLINE: "FILL_AND_OUTLINE",
};
class CesiumMapManager {
  constructor(t) {
    if (
      ((this.dataSources = new Map()),
      (this.layerZIndexMap = new Map()),
      (this.eventListeners = new Map()),
      (this.heightLimitedLayers = new Map()),
      (this.cameraHeightListener = null),
      (this.currentCameraHeight = 0),
      (this.routeLayerManagers = new Map()),
      !t)
    )
      throw new Error("Cesium Viewer instance is required");
    (this.viewer = t),
      (globalThis.currentViewer = t),
      this.initCameraHeightListener();
  }
  isMapReady() {
    return !!this.viewer && !this.viewer.isDestroyed();
  }
  getViewer() {
    return this.viewer;
  }
  findDataSourceInViewer(t) {
    const r = function (c, d) {
        return c < d;
      },
      l = function (c, d) {
        return c === d;
      };
    if (!this.viewer) return null;
    for (let c = 0; r(c, this.viewer.dataSources.length); c++) {
      const d = this.viewer.dataSources.get(c);
      if (d && l(d.name, t)) return d;
    }
    return null;
  }
  getOrCreateDataSource(t) {
    if (this.dataSources.has(t)) return this.dataSources.get(t);
    if (!this.viewer) return null;
    const e = this.findDataSourceInViewer(t);
    if (e) return this.dataSources.set(t, e), e;
    const i = new Cesium.CustomDataSource(t);
    return this.viewer.dataSources.add(i), this.dataSources.set(t, i), i;
  }
  addPoint(t, e) {
    const i = "oblique_photography",
      o = function (h, y) {
        return h < y;
      },
      r = function (h, y) {
        return h !== y;
      },
      n = "NxGMj",
      s = this.getOrCreateDataSource(t);
    if (!s) return null;
    const {
      coordinates: l,
      pointStyle: u = {},
      labelStyle: c = {},
      properties: d,
      id: _,
    } = e;
    if (!l || o(l.length, 2)) return null;
    const f = Cesium.Cartesian3.fromDegrees(l[0], l[1], l[2] || 0),
      a = {
        id: _ || "point_" + Date.now() + "_" + Math.random(),
        position: f,
        point: {
          pixelSize: u.pixelSize || 10,
          color: u.color
            ? Cesium.Color.fromCssColorString(u.color)
            : Cesium.Color.YELLOW,
          outlineColor: u.outlineColor
            ? Cesium.Color.fromCssColorString(u.outlineColor)
            : Cesium.Color.BLACK,
          outlineWidth: u.outlineWidth || 2,
        },
      };
    return (
      c.text &&
        (a.label = {
          text: c.text,
          font: c.font || "14pt sans-serif",
          fillColor: c.fillColor
            ? Cesium.Color.fromCssColorString(c.fillColor)
            : Cesium.Color.WHITE,
          outlineColor: c.outlineColor
            ? Cesium.Color.fromCssColorString(c.outlineColor)
            : Cesium.Color.BLACK,
          outlineWidth: c.outlineWidth || 2,
          style: c.style
            ? Cesium.LabelStyle[c.style]
            : Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: c.pixelOffset
            ? new Cesium.Cartesian2(c.pixelOffset[0], c.pixelOffset[1])
            : new Cesium.Cartesian2(0, -40),
          horizontalOrigin: c.horizontalOrigin
            ? Cesium.HorizontalOrigin[c.horizontalOrigin]
            : Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: c.verticalOrigin
            ? Cesium.VerticalOrigin[c.verticalOrigin]
            : Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance:
            c.disableDepthTestDistance ?? Number.POSITIVE_INFINITY,
          eyeOffset: c.eyeOffset
            ? new Cesium.Cartesian3(
                c.eyeOffset[0] || 0,
                c.eyeOffset[1] || 0,
                c.eyeOffset[2] || 0,
              )
            : undefined,
          zIndex: c.zIndex,
        }),
      d && (a.properties = d),
      s.entities.add(a)
    );
  }
  addLine(t, e) {
    const i = this.getOrCreateDataSource(t);
    if (!i) return null;
    const { coordinates: o, lineStyle: r = {}, properties: n, id: s } = e;
    if (!Array.isArray(o) || o.length < 2) return null;
    const l = o.map((c) =>
        Cesium.Cartesian3.fromDegrees(c[0], c[1], c[2] || 0),
      ),
      u = {
        id: s || "line_" + Date.now() + "_" + Math.random(),
        polyline: {
          positions: l,
          width: r.width || 2,
          material: new Cesium.PolylineDashMaterialProperty({
            color: Cesium.Color.fromCssColorString(
              r.material.color || "rgba(0,32,248,0.62)",
            ),
            dashLength: r.material.dashLength || 0,
          }),
        },
      };
    return n && (u.properties = n), i.entities.add(u);
  }
  addPolygon(t, e) {
    var p;
    const i = function (C, D) {
        return C !== D;
      },
      o = function (C, D) {
        return C === D;
      },
      r = function (C, D) {
        return C === D;
      },
      n = function (C, D) {
        return C < D;
      },
      s = function (C, D) {
        return C === D;
      },
      l = this.getOrCreateDataSource(t);
    if (!l) return null;
    const {
      coordinates: u,
      properties: c,
      polygonStyle: d = {},
      outlineStyle: _ = {},
      fenceStyle: f = {},
      labelStyle: a = {},
    } = e;
    if (
      !Array.isArray(u) ||
      r(u.length, 0) ||
      !Array.isArray(u[0]) ||
      n(u[0].length, 3)
    )
      return null;
    const h = u.flat(1 / 0);
    d.material &&
      r(typeof d.material, "string") &&
      (d.material = Cesium.Color.fromCssColorString(d.material)),
      _.material &&
        o(typeof _.material, "string") &&
        (_.material = Cesium.Color.fromCssColorString(_.material)),
      null != (p = f.material) &&
        p.color &&
        "string" == typeof f.material.color &&
        (f.material.color = Cesium.Color.fromCssColorString(f.material.color)),
      a.fillColor &&
        "string" == typeof a.fillColor &&
        (a.fillColor = Cesium.Color.fromCssColorString(a.fillColor)),
      a.outlineColor &&
        "string" == typeof a.outlineColor &&
        (a.outlineColor = Cesium.Color.fromCssColorString(a.outlineColor));
    const y = {
        material: Cesium.Color.fromCssColorString("#FFD54F").withAlpha(0.3),
        outline: !1,
      },
      g = {
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArray(h),
          ),
          ...y,
          ...d,
        },
        properties: c,
      },
      x = l.entities.add(g);
    if (_ && Object.keys(_).length > 0) {
      const C = {
        width: 2,
      };
      (C.material = Cesium.Color.WHITE), (C.clampToGround = !0);
      const D = C,
        b = [...h, h[0], h[1]];
      l.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray(b),
          ...D,
          ..._,
        },
      });
    }
    if (f && Object.keys(f).length > 0 && f.height > 0) {
      const C = {
          height: 2,
          width: 3,
          material: new Cesium.PolylineDashMaterialProperty({
            color: Cesium.Color.CYAN,
            dashLength: 24,
          }),
          ...f,
        },
        D = u[0],
        b = [];
      for (let v = 0; n(v, D.length); v++) b.push(D[v][0], D[v][1], C.height);
      D.length > 0 && b.push(D[0][0], D[0][1], C.height);
      const S = {};
      (S.parentPolygonId = x.id),
        l.entities.add({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(b),
            width: C.width,
            material: C.material,
          },
          properties: S,
        });
    }
    if (a) {
      const C = this.calculatePolygonCenter(u[0]);
      if (C) {
        a.style &&
          "string" == typeof a.style &&
          ("FILL_AND_OUTLINE" === a.style
            ? (a.style = Cesium.LabelStyle.FILL_AND_OUTLINE)
            : s(a.style, "FILL")
              ? (a.style = Cesium.LabelStyle.FILL)
              : s(a.style, "OUTLINE") && (a.style = Cesium.LabelStyle.OUTLINE)),
          a.verticalOrigin &&
            o(typeof a.verticalOrigin, "string") &&
            ("BOTTOM" === a.verticalOrigin
              ? (a.verticalOrigin = Cesium.VerticalOrigin.BOTTOM)
              : "CENTER" === a.verticalOrigin
                ? (a.verticalOrigin = Cesium.VerticalOrigin.CENTER)
                : "TOP" === a.verticalOrigin &&
                  (a.verticalOrigin = Cesium.VerticalOrigin.TOP)),
          a.heightReference &&
            o(typeof a.heightReference, "string") &&
            (a.heightReference = Cesium.HeightReference[a.heightReference]),
          a.pixelOffset &&
            (a.pixelOffset = new Cesium.Cartesian2(
              a.pixelOffset.x,
              a.pixelOffset.y,
            )),
          l.entities.add({
            position: Cesium.Cartesian3.fromDegrees(C[0], C[1]),
            label: {
              text: a.text || "",
              font: a.font || "16px sans-serif",
              style: a.style || Cesium.LabelStyle.FILL_AND_OUTLINE,
              fillColor: a.fillColor || Cesium.Color.BLACK,
              outlineColor: a.outlineColor || Cesium.Color.WHITE,
              outlineWidth: a.outlineWidth || 3,
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              verticalOrigin: a.verticalOrigin || Cesium.VerticalOrigin.CENTER,
              pixelOffset: a.pixelOffset || new Cesium.Cartesian2(0, 0),
              heightReference: a.heightReference,
              disableDepthTestDistance: a.disableDepthTestDistance,
            },
          });
      }
    }
    return x;
  }
  calculatePolygonCenter(t) {
    const e = function (m, L) {
        return m - L;
      },
      i = function (m, L) {
        return m === L;
      },
      o = function (m, L) {
        return m > L;
      },
      r = function (m, L) {
        return m && L;
      },
      n = function (m, L) {
        return m >= L;
      },
      s = function (m, L) {
        return m < L;
      },
      l = function (m, L) {
        return m + L;
      },
      u = function (m, L) {
        return m / L;
      },
      c = function (m, L) {
        return m - L;
      },
      d = function (m, L) {
        return m % L;
      },
      _ = function (m, L) {
        return m - L;
      },
      f = function (m, L) {
        return m * L;
      },
      a = function (m, L) {
        return m * L;
      },
      h = function (m, L) {
        return m * L;
      },
      y = function (m, L) {
        return m + L;
      },
      g = function (m, L) {
        return m / L;
      },
      x = function (m, L) {
        return m / L;
      },
      p = function (m, L) {
        return m * L;
      },
      C = function (m, L) {
        return m % L;
      },
      D = function (m, L) {
        return m + L;
      };
    if (!t || i(t.length, 0)) return null;
    const b = t.slice();
    if (o(b.length, 1)) {
      const m = b[0],
        L = b[e(b.length, 1)];
      r(m, L) &&
        m.length >= 2 &&
        n(L.length, 2) &&
        m[0] === L[0] &&
        i(m[1], L[1]) &&
        b.pop();
    }
    if (s(b.length, 3)) {
      let m = 0,
        L = 0;
      return (
        b.forEach((T) => {
          (m += T[0]), (L += T[1]);
        }),
        [
          e(l(u(m, b.length), 540) % 360, 180),
          Math.max(-90, Math.min(90, L / b.length)),
        ]
      );
    }
    const S = [];
    let v = b[0][0];
    S.push([v, b[0][1]]);
    for (let m = 1; s(m, b.length); m++) {
      let L = b[m][0];
      const T = b[m][1];
      for (; o(L - v, 180); ) L -= 360;
      for (; s(c(L, v), -180); ) L += 360;
      S.push([L, T]), (v = L);
    }
    let V = 0,
      E = 0,
      B = 0;
    for (let m = 0; s(m, S.length); m++) {
      const L = d(m + 1, S.length),
        T = S[m],
        F = S[L],
        I = _(f(T[0], F[1]), a(F[0], T[1]));
      (V += I), (E += f(l(T[0], F[0]), I)), (B += h(y(T[1], F[1]), I));
    }
    const H = g(V, 2);
    if (s(Math.abs(H), 1e-10)) {
      let m = 0,
        L = 0;
      return (
        b.forEach((T) => {
          var F;
          (m += T[0]), (L += T[1]);
        }),
        [
          d(l(x(m, b.length), 540), 360) - 180,
          Math.max(-90, Math.min(90, u(L, b.length))),
        ]
      );
    }
    const P = E / h(6, H),
      w = B / p(6, H);
    return [C(D(P, 540), 360) - 180, Math.max(-90, Math.min(90, w))];
  }
  addBillboard(t, e) {
    const i = {
        EWVGE: function (f, a) {
          return f || a;
        },
      },
      o = this.getOrCreateDataSource(t);
    if (!o) return null;
    const {
      coordinates: r,
      position: n,
      image: s,
      rotation: l,
      billboardStyle: u = {},
      labelStyle: c = {},
      properties: d,
      id: _,
    } = e;
    const a = r || n;
    if (i.EWVGE(!a, !s)) return null;
    const h = Cesium.Cartesian3.fromDegrees(a[0], a[1], a[2] || 0),
      f = {
        id: _ || "billboard_" + Date.now() + "_" + Math.random(),
        position: h,
        billboard: {
          image: s,
          scale: u.scale || 1,
          pixelOffset: u.pixelOffset || Cesium.Cartesian2.ZERO,
          eyeOffset: u.eyeOffset
            ? new Cesium.Cartesian3(
                u.eyeOffset[0],
                u.eyeOffset[1],
                u.eyeOffset[2],
              )
            : Cesium.Cartesian3.ZERO,
          horizontalOrigin: u.horizontalOrigin
            ? Cesium.HorizontalOrigin[u.horizontalOrigin]
            : Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: u.verticalOrigin
            ? Cesium.VerticalOrigin[u.verticalOrigin]
            : Cesium.VerticalOrigin.BOTTOM,
          color: u.color
            ? Cesium.Color.fromCssColorString(u.color)
            : Cesium.Color.WHITE,
          rotation: u.rotation ?? l ?? 0,
          alignedAxis: u.alignedAxis
            ? new Cesium.Cartesian3(
                u.alignedAxis[0],
                u.alignedAxis[1],
                u.alignedAxis[2],
              )
            : Cesium.Cartesian3.ZERO,
          width: u.width,
          height: u.height,
        },
      };
    if (c.text) {
      f.label = {
        show: c.show === void 0 || c.show,
        text: c.text,
        font: c.font || "14pt sans-serif",
        fillColor: c.fillColor
          ? Cesium.Color.fromCssColorString(c.fillColor)
          : Cesium.Color.WHITE,
        outlineColor: c.outlineColor
          ? Cesium.Color.fromCssColorString(c.outlineColor)
          : Cesium.Color.BLACK,
        outlineWidth: c.outlineWidth || 2,
        style: c.style
          ? Cesium.LabelStyle[c.style]
          : Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: c.pixelOffset
          ? new Cesium.Cartesian2(c.pixelOffset[0], c.pixelOffset[1])
          : new Cesium.Cartesian2(0, -40),
        horizontalOrigin: c.horizontalOrigin
          ? Cesium.HorizontalOrigin[c.horizontalOrigin]
          : Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: c.verticalOrigin
          ? Cesium.VerticalOrigin[c.verticalOrigin]
          : Cesium.VerticalOrigin.BOTTOM,
      };
    }
    if (d) f.properties = d;
    return o.entities.add(f);
  }
  updateBillboard(t, e = {}) {
    if (!t) return !1;
    try {
      const {
        coordinates: i,
        position: o,
        image: r,
        rotation: n,
        billboardStyle: s = {},
        properties: l,
      } = e;
      const u = i || o;
      if (u) {
        t.position = Cesium.Cartesian3.fromDegrees(u[0], u[1], u[2] || 0);
      }
      if (t.billboard) {
        if (r) t.billboard.image = r;
        if (s.scale !== void 0) t.billboard.scale = s.scale;
        if (n !== void 0) t.billboard.rotation = n;
        if (s.rotation !== void 0) t.billboard.rotation = s.rotation;
        if (s.pixelOffset !== void 0) {
          t.billboard.pixelOffset = Array.isArray(s.pixelOffset)
            ? new Cesium.Cartesian2(s.pixelOffset[0], s.pixelOffset[1])
            : s.pixelOffset;
        }
        if (s.width !== void 0) t.billboard.width = s.width;
        if (s.height !== void 0) t.billboard.height = s.height;
      }
      if (l) t.properties = l;
      return !0;
    } catch {
      return !1;
    }
  }
  removeBillboard(t, e) {
    if (!e) return !1;
    let i = this.dataSources.get(t);
    if (!i && this.viewer) {
      i = this.findDataSourceInViewer(t);
      if (i) this.dataSources.set(t, i);
    }
    if (!i) return !1;
    try {
      return i.entities.remove(e);
    } catch {
      return !1;
    }
  }
  flyToPosition(t, e, i = 1e3, o = 3) {
    this.viewer &&
      this.viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(t, e, i),
        duration: o,
      });
  }
  flyToBounds(t, e = 3) {
    if (!this.viewer || !t || t.length < 2) return;
    const i = Cesium.Rectangle.fromDegrees(
        Math.min(t[0][0], t[1][0]),
        Math.min(t[0][1], t[1][1]),
        Math.max(t[0][0], t[1][0]),
        Math.max(t[0][1], t[1][1]),
      ),
      o = {};
    (o.destination = i), (o.duration = e), this.viewer.camera.flyTo(o);
  }
  clearDataSource(t) {
    let e = this.dataSources.get(t);
    return (
      !e &&
        this.viewer &&
        ((e = this.findDataSourceInViewer(t)), e && this.dataSources.set(t, e)),
      !!e && (e.entities.removeAll(), !0)
    );
  }
  removeDataSource(t) {
    const e = function (n, s) {
        return n === s;
      },
      i = "joqnt",
      o = "NJVeL";
    let r = this.dataSources.get(t);
    return (
      !r && this.viewer && (r = this.findDataSourceInViewer(t)),
      !(!r || !this.viewer) &&
        (this.viewer.dataSources.remove(r), this.dataSources.delete(t), !0)
    );
  }
  addEventListener(t, e) {
    const i = function (u, c) {
      return u(c);
    };
    if (!this.viewer) return () => {};
    let o, r;
    const n = (u) => {
        {
          const c = this.viewer.scene.pick(u.position),
            d = c ? c.id : void 0,
            _ = {};
          (_.x = u.position.x), (_.y = u.position.y);
          const f = this.pickPosition(_),
            a = {
              ...u,
            };
          (a.pickedEntity = d),
            (a.longitude = null == f ? void 0 : f.longitude),
            (a.latitude = null == f ? void 0 : f.latitude),
            (a.altitude = null == f ? void 0 : f.altitude),
            i(e, a);
        }
      },
      s = (u) => {
        {
          const c = {};
          (c.x = u.endPosition.x), (c.y = u.endPosition.y);
          const d = this.pickPosition(c),
            _ = {
              ...u,
            };
          (_.longitude = null == d ? void 0 : d.longitude),
            (_.latitude = null == d ? void 0 : d.latitude),
            (_.altitude = null == d ? void 0 : d.altitude),
            i(e, _);
        }
      };
    switch (t) {
      case "click":
      case "leftClick":
        (o = Cesium.ScreenSpaceEventType.LEFT_CLICK), (r = n);
        break;
      case "rightClick":
        (o = Cesium.ScreenSpaceEventType.RIGHT_CLICK), (r = n);
        break;
      case "leftDown":
        (o = Cesium.ScreenSpaceEventType.LEFT_DOWN), (r = n);
        break;
      case "leftUp":
        (o = Cesium.ScreenSpaceEventType.LEFT_UP), (r = n);
        break;
      case "mouseMove":
        (o = Cesium.ScreenSpaceEventType.MOUSE_MOVE), (r = s);
        break;
      default:
        return () => {};
    }
    this.viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(r, o);
    const l = () => {
      this.viewer &&
        !this.viewer.isDestroyed() &&
        this.viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(o);
    };
    return (
      this.eventListeners.has(t) || this.eventListeners.set(t, []),
      this.eventListeners.get(t).push(l),
      l
    );
  }
  pickPosition(t) {
    if (!this.viewer) return null;
    const e = this.viewer.camera.pickEllipsoid(
      new Cesium.Cartesian2(t.x, t.y),
      this.viewer.scene.globe.ellipsoid,
    );
    if (!e) return null;
    const i = Cesium.Cartographic.fromCartesian(e);
    return {
      longitude: Cesium.Math.toDegrees(i.longitude),
      latitude: Cesium.Math.toDegrees(i.latitude),
      altitude: i.height,
    };
  }
  zoomToDataSource(t) {
    let e = this.dataSources.get(t);
    !e &&
      this.viewer &&
      ((e = this.findDataSourceInViewer(t)), e && this.dataSources.set(t, e)),
      e && this.viewer && this.viewer.flyTo(e);
  }
  zoomToDataSourceAdvanced(t, e) {
    const i = {
      UBZPF: function (f, a) {
        return f === a;
      },
      jzcMM: "beidou_grid",
      lqALy: "QtBXT",
      HUtbS: function (f, a) {
        return f / a;
      },
      vnjTw: function (f, a) {
        return f || a;
      },
      wrich: function (f, a) {
        return f === a;
      },
    };
    let o = this.dataSources.get(t);
    if (
      (!o &&
        this.viewer &&
        ((o = this.findDataSourceInViewer(t)), o && this.dataSources.set(t, o)),
      !o || !this.viewer)
    )
      return;
    const {
        duration: r = 1,
        heading: n = 0,
        pitch: s = i.HUtbS(-Math.PI, 2),
        roll: l = 0,
        maximumHeight: u,
        cameraHeight: c,
        range: d,
      } = i.vnjTw(e, {}),
      _ = o.entities.values;
    if (0 !== _.length)
      try {
        const f = this.calculateDataSourceBoundingSphere(_);
        if (!f) return;
        const a = {};
        (a.duration = r),
          (a.heading = n),
          (a.pitch = s),
          (a.roll = l),
          (a.maximumHeight = u),
          (a.cameraHeight = c),
          (a.range = d),
          this.flyToBoundingSphereWithCustomView(f, a);
      } catch {
        const a = this.calculateDataSourceBounds(_);
        if (a) {
          if (i.wrich("VVSMg", "XWlUv")) return !1;
          {
            const {
              centerLon: h,
              centerLat: y,
              finalHeight: g,
            } = this.calculateCameraPosition(a, c, u, s);
            this.executeCameraFlyTo(h, y, g, n, s, l, r);
          }
        }
      }
  }
  calculateDataSourceBoundingSphere(t) {
    const e = function (c, d) {
        return c > d;
      },
      i = function (c, d) {
        return c < d;
      },
      o = function (c, d) {
        return c === d;
      },
      r = "EblRP",
      n = "VHmGF",
      s = "HtBSQ",
      l = "gFjuo",
      u = [];
    if (
      (t.forEach((c, d) => {
        var _, f;
        if (c.position) {
          const a = c.position.getValue
            ? c.position.getValue(Cesium.JulianDate.now())
            : c.position;
          a && u.push(a);
        }
        if (null != (_ = c.polyline) && _.positions) {
          const a = c.polyline.positions.getValue
            ? c.polyline.positions.getValue(Cesium.JulianDate.now())
            : c.polyline.positions;
          a && e(a.length, 0) && u.push(...a);
        }
        if (null != (f = c.polygon) && f.hierarchy) {
          const a = c.polygon.hierarchy.getValue
            ? c.polygon.hierarchy.getValue(Cesium.JulianDate.now())
            : c.polygon.hierarchy;
          null != a && a.positions && u.push(...a.positions);
        }
      }),
      o(u.length, 0))
    )
      return null;
    try {
      return Cesium.BoundingSphere.fromPoints(u);
    } catch {
      return null;
    }
  }
  flyToBoundingSphereWithCustomView(t, e) {
    const i = {
        IYfzG: function (f, a) {
          return f > a;
        },
        oxLXH: function (f, a) {
          return f !== a;
        },
        xBfrx: function (f, a) {
          return f(a);
        },
        YoRFm: "RDggX",
        BiHCS: function (f, a) {
          return f / a;
        },
        IiDzO: function (f, a) {
          return f < a;
        },
        aGrJz: function (f, a) {
          return f + a;
        },
        NeDbQ: function (f, a) {
          return f * a;
        },
        kyHue: "pmtBf",
        wRoRZ: function (f, a) {
          return f - a;
        },
        MPQhq: function (f, a) {
          return f * a;
        },
        rZKPd: function (f, a) {
          return f !== a;
        },
        typHs: "TBZae",
      },
      {
        duration: o = 1,
        heading: r = 0,
        pitch: n = i.BiHCS(-Math.PI, 2),
        roll: s = 0,
        maximumHeight: l,
        cameraHeight: u,
        range: c,
      } = e;
    let d = c;
    if (!d) {
      const f = t.radius,
        a = Cesium.Math.toRadians(60),
        h = f / Math.tan(a / 2),
        y = Math.abs(Cesium.Math.toDegrees(n));
      let g = 2;
      if (i.IiDzO(y, 45)) g = i.aGrJz(4, i.NeDbQ(45 - y, 0.1));
      else if (y < 75) g = i.aGrJz(2.5, 0.05 * i.wRoRZ(75, y));
      if (
        ((d = Math.max(i.MPQhq(h, g), i.NeDbQ(f, 3))),
        l && (d = Math.min(d, l)),
        u)
      ) {
        d = u;
      }
    }
    const _ = new Cesium.HeadingPitchRange(Cesium.Math.toRadians(r), n, d);
    try {
      this.viewer.camera.flyToBoundingSphere(t, {
        duration: o,
        maximumHeight: l,
        offset: _,
        complete: () => {
          this.verifyTargetInView(t, r, n, s);
        },
      });
    } catch {
      const a = {};
      (a.duration = o),
        (a.heading = r),
        (a.pitch = n),
        (a.roll = s),
        (a.distance = d),
        this.fallbackCameraPositioning(t, a);
    }
  }
  verifyTargetInView(t, e, i, o) {
    const r = function (s, l) {
        return s === l;
      },
      n = function (s, l) {
        return s % l;
      };
    setTimeout(() => {
      const s = function (x, p) {
          return x / p;
        },
        l = function (x, p) {
          return x / p;
        };
      try {
        const x = t.center,
          p = Cesium.SceneTransforms.wgs84ToWindowCoordinates(
            this.viewer.scene,
            x,
          );
        if (p) {
          const C = this.viewer.canvas;
          !(
            p.x >= 0 &&
            ((_ = p.x), (f = C.clientWidth), _ <= f) &&
            ((d = p.y), d >= 0) &&
            ((u = p.y), (c = C.clientHeight), u <= c)
          ) &&
            this.viewer.camera.setView({
              destination: this.viewer.camera.position,
              orientation: {
                heading: Cesium.Math.toRadians(e),
                pitch: i,
                roll: Cesium.Math.toRadians(o),
              },
            });
        }
      } catch {}
      var u, c, d, _, f, a, h, y, g;
    }, 300);
  }
  fallbackCameraPositioning(t, e) {
    const i = function (a, h) {
        return a / h;
      },
      o = function (a, h) {
        return a * h;
      },
      { duration: r, heading: n, pitch: s, roll: l, distance: u } = e,
      c = t.center,
      d = Cesium.Cartographic.fromCartesian(c),
      _ =
        (Cesium.Math.toDegrees(d.longitude),
        Cesium.Math.toDegrees(d.latitude),
        new Cesium.Cartographic(d.longitude, d.latitude, d.height + u));
    if (Math.abs(s + Math.PI / 2) > 0.01) {
      const a = Math.abs(s),
        h = u * Math.tan(a),
        y = n + Math.PI,
        g = i(o(h / 111320, Math.cos(y)), Math.cos(d.latitude)),
        x = o(i(h, 111320), Math.sin(y));
      (_.longitude += g),
        (_.latitude += x),
        (_.height = d.height + o(u, Math.cos(a)));
    }
    const f = Cesium.Cartographic.toCartesian(_);
    this.viewer.camera.flyTo({
      destination: f,
      orientation: {
        heading: Cesium.Math.toRadians(n),
        pitch: s,
        roll: Cesium.Math.toRadians(l),
      },
      duration: r,
      complete: () => {
        setTimeout(() => {
          this.verifyTargetInView(t, n, s, l);
        }, 100);
      },
    });
  }
  calculateDataSourceBounds(t) {
    const e = {
      qyulH: "0|3|2|1|4",
      lKbKj: "Mtbfl",
    };
    let i = 1 / 0,
      o = 1 / 0,
      r = -1 / 0,
      n = -1 / 0,
      s = !1;
    t.forEach((u) => {
      var _, f;
      const c = {
        VFkQm: function (a, h) {
          return a === h;
        },
      };
      (c.bervV = e.lKbKj),
        (c.TmlHd = "3|2|4|0|1"),
        (c.EkwmV = "tiles"),
        (c.FiwjM = "wms");
      const d = c;
      if (u.position) {
        const a = this.extractPositionCoords(u.position);
        if (a) {
          const h = "0|2|1|4|3".split("|");
          let y = 0;
          for (;;) {
            switch (h[y++]) {
              case "0":
                i = Math.min(i, a.lon);
                continue;
              case "1":
                o = Math.min(o, a.lat);
                continue;
              case "2":
                r = Math.max(r, a.lon);
                continue;
              case "3":
                s = !0;
                continue;
              case "4":
                n = Math.max(n, a.lat);
                continue;
            }
            break;
          }
        }
      }
      if (null != (_ = u.polyline) && _.positions) {
        const a = this.extractPositionsArray(u.polyline.positions);
        a &&
          a.forEach((h) => {
            if (h)
              if (d.VFkQm(d.bervV, d.bervV)) {
                const y = d.TmlHd.split("|");
                let g = 0;
                for (;;) {
                  switch (y[g++]) {
                    case "0":
                      n = Math.max(n, h.lat);
                      continue;
                    case "1":
                      s = !0;
                      continue;
                    case "2":
                      r = Math.max(r, h.lon);
                      continue;
                    case "3":
                      i = Math.min(i, h.lon);
                      continue;
                    case "4":
                      o = Math.min(o, h.lat);
                      continue;
                  }
                  break;
                }
              }
          });
      }
      if (null != (f = u.polygon) && f.hierarchy) {
        const a = u.polygon.hierarchy.getValue
          ? u.polygon.hierarchy.getValue(Cesium.JulianDate.now())
          : u.polygon.hierarchy;
        null != a &&
          a.positions &&
          a.positions.forEach((h) => {
            {
              const y = this.extractPositionCoords(h);
              if (y) {
                const g = e.qyulH.split("|");
                let x = 0;
                for (;;) {
                  switch (g[x++]) {
                    case "0":
                      i = Math.min(i, y.lon);
                      continue;
                    case "1":
                      n = Math.max(n, y.lat);
                      continue;
                    case "2":
                      o = Math.min(o, y.lat);
                      continue;
                    case "3":
                      r = Math.max(r, y.lon);
                      continue;
                    case "4":
                      s = !0;
                      continue;
                  }
                  break;
                }
              }
            }
          });
      }
    });
    const l = {};
    return (
      (l.west = i), (l.east = r), (l.south = o), (l.north = n), s ? l : null
    );
  }
  extractPositionCoords(t) {
    const e = function (r, n) {
        return r !== n;
      },
      i = "fHuOb",
      o = "zsnhh";
    try {
      const r = t.getValue ? t.getValue(Cesium.JulianDate.now()) : t;
      if (r) {
        {
          const n = Cesium.Cartographic.fromCartesian(r);
          if (n)
            return {
              lon: Cesium.Math.toDegrees(n.longitude),
              lat: Cesium.Math.toDegrees(n.latitude),
            };
        }
      }
    } catch {}
    return null;
  }
  extractPositionsArray(t) {
    const e = function (o, r) {
        return o === r;
      },
      i = "eMBrZ";
    try {
      e(i, "ZQxhs");
      {
        const o = t.getValue ? t.getValue(Cesium.JulianDate.now()) : t;
        if (o && o.length > 0)
          return o.map((r) => this.extractPositionCoords(r));
      }
    } catch {}
    return null;
  }
  calculateCameraPosition(t, e, i, o) {
    const r = function (S, v) {
        return S / v;
      },
      n = function (S, v) {
        return S / v;
      },
      s = function (S, v) {
        return S * v;
      },
      l = function (S, v) {
        return S !== v;
      },
      u = function (S, v) {
        return S !== v;
      },
      c = function (S, v) {
        return S / v;
      },
      d = function (S, v) {
        return S <= v;
      },
      _ = function (S, v) {
        return S + v;
      },
      f = function (S, v) {
        return S - v;
      },
      a = function (S, v) {
        return S <= v;
      },
      h = function (S, v) {
        return S * v;
      },
      y = function (S, v) {
        return S - v;
      },
      g = function (S, v) {
        return S - v;
      },
      x = function (S, v) {
        return S * v;
      },
      p = r(t.west + t.east, 2),
      C = n(t.south + t.north, 2);
    let D = e;
    if (!D) {
      const S = t.east - t.west,
        v = t.north - t.south,
        V = Math.max(S, v);
      let E = Math.max(1e4, s(s(V, 111320), 1.5));
      if (l(o, void 0) && u(o, r(-Math.PI, 2))) {
        const B = Math.abs(o);
        if (B < c(Math.PI, 2)) {
          const H = Cesium.Math.toDegrees(B);
          let P = 1;
          d(H, 30)
            ? (P = _(2.5, 0.1 * f(30, H)))
            : a(H, 45)
              ? (P = _(2, h(y(45, H), 0.033)))
              : (P = d(H, 60)
                  ? _(1.5, 0.033 * g(60, H))
                  : 1.2 + x(y(90, H), 0.01)),
            (E *= P),
            (E *= 1.2);
        }
      }
      D = Math.min(E, i || 1e5);
    }
    const b = {};
    return (b.centerLon = p), (b.centerLat = C), (b.finalHeight = D), b;
  }
  executeCameraFlyTo(t, e, i, o, r, n, s) {
    const l = Cesium.Cartesian3.fromDegrees(t, e, i);
    this.viewer.camera.flyTo({
      destination: l,
      orientation: {
        heading: Cesium.Math.toRadians(o),
        pitch: r,
        roll: Cesium.Math.toRadians(n),
      },
      duration: s,
      complete: () => {
        setTimeout(() => {
          try {
            this.viewer.camera.setView({
              destination: l,
              orientation: {
                heading: Cesium.Math.toRadians(o),
                pitch: r,
                roll: Cesium.Math.toRadians(n),
              },
            });
          } catch {}
        }, 100);
      },
    });
  }
  zoomToTarget(t, e) {
    const i = function (p, C) {
        return p / C;
      },
      o = function (p, C) {
        return p / C;
      },
      r = function (p, C) {
        return p / C;
      },
      n = function (p, C) {
        return p / C;
      },
      s = function (p, C) {
        return p + C;
      },
      l = function (p, C) {
        return p * C;
      },
      u = function (p, C) {
        return p & C;
      },
      c = function (p, C) {
        return p & C;
      },
      d = function (p, C) {
        return p === C;
      },
      _ = function (p, C) {
        return p % C;
      },
      f = function (p, C) {
        return p % C;
      },
      a = function (p, C) {
        return p !== C;
      },
      h = "uFcsp",
      y = "IjKGF",
      g = "LPJrK",
      x = Array.isArray(t) ? t : [t];
    for (const p of x) {
      let C = this.dataSources.get(p);
      if (!C && this.viewer) {
        (C = this.findDataSourceInViewer(p)), C && this.dataSources.set(p, C);
      }
      if (C) return this.zoomToDataSourceAdvanced(p, e), !0;
    }
    return !1;
  }
  zoomToLayer(t) {
    this.zoomToDataSource(t);
  }
  clearLayerWithDerivatives(t) {
    const e = function (o, r) {
      return o + r;
    };
    this.clearDataSource(t);
    const i = [];
    this.dataSources.forEach((o, r) => {
      (r.startsWith(e(t, "_")) || r.startsWith(e(t, "-"))) && i.push(r);
    }),
      i.forEach((o) => {
        this.removeDataSource(o);
      });
  }
  clearAllLayers() {
    Array.from(this.dataSources.keys()).forEach((t) => {
      this.removeDataSource(t);
    });
  }
  getAllDataSourceNames() {
    return Array.from(this.dataSources.keys());
  }
  setLayerVisibility(t, e) {
    const i = function (g, x) {
        return g + x;
      },
      o = "oblique_photography",
      r = function (g, x) {
        return g === x;
      },
      n = "wPPku",
      s = function (g, x) {
        return g < x;
      },
      l = function (g, x) {
        return g === x;
      },
      u = "string",
      c = "TyrYT",
      d = function (g, x) {
        return g > x;
      },
      _ = function (g, x) {
        return g === x;
      },
      f = "TeBwG",
      a = function (g, x) {
        return g !== x;
      },
      h = "CtkQM",
      y = "aHbdi";
    if (this.viewer)
      try {
        const g = [];
        if (this.viewer && this.viewer.dataSources) {
          const C = this.viewer.dataSources.length;
          for (let D = 0; s(D, C); D++) {
            const b = this.viewer.dataSources.get(D);
            b && l(typeof b.name, u) && g.push(b.name);
          }
        }
        const x = this.getDataSourcesByName(t, !0);
        if (x && x.length > 0)
          return void x.forEach((C) => {
            C.show = e;
          });
        const p = [];
        if (this.viewer && this.viewer.dataSources) {
          const C = this.viewer.dataSources.length;
          for (let D = 0; s(D, C); D++) {
            const b = this.viewer.dataSources.get(D);
            b && r(typeof b.name, u) && b.name.startsWith(t) && p.push(b);
          }
        }
        if (d(p.length, 0)) return void p.forEach((C) => (C.show = e));
        if (this.viewer.imageryLayers) {
          let C = !1;
          for (let D = 0; s(D, this.viewer.imageryLayers.length); D++) {
            const b = this.viewer.imageryLayers.get(D);
            b && l(b.id, t) && (a(h, y), (b.show = e), (C = !0));
          }
          if (C) return;
        }
      } catch {}
  }
  setMapInteractionEnabled(t) {
    this.viewer &&
      (this.viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(
        t ? void 0 : () => {},
        Cesium.ScreenSpaceEventType.LEFT_CLICK,
      ),
      (this.viewer.scene.screenSpaceCameraController.enableRotate = t),
      (this.viewer.scene.screenSpaceCameraController.enableTranslate = t),
      (this.viewer.scene.screenSpaceCameraController.enableZoom = t));
  }
  getEntityProperty(t, e, i) {
    const o = function (d, _) {
        return d === _;
      },
      r = "object",
      n = function (d, _) {
        return d in _;
      };
    let s = this.dataSources.get(t);
    if (
      (!s &&
        this.viewer &&
        ((s = this.findDataSourceInViewer(t)), s) &&
        this.dataSources.set(t, s),
      !s)
    )
      return;
    const l = s.entities.getById(e);
    if (!l) return;
    const u = i.split(".");
    let c = l;
    for (const d of u) {
      if (!(c && o(typeof c, r) && n(d, c))) return;
      c = c[d];
    }
    return c;
  }
  setEntityProperty(t, e, i, o) {
    const r = function (f, a) {
        return f < a;
      },
      n = function (f, a) {
        return f !== a;
      },
      s = function (f, a) {
        return f in a;
      },
      l = function (f, a) {
        return f - a;
      };
    let u = this.dataSources.get(t);
    if (
      (!u &&
        this.viewer &&
        ((u = this.findDataSourceInViewer(t)), u && this.dataSources.set(t, u)),
      !u)
    )
      return;
    const c = u.entities.getById(e);
    if (!c) return;
    const d = i.split(".");
    let _ = c;
    for (let f = 0; r(f, d.length - 1); f++) {
      const a = d[f];
      !s(a, _) && (_[a] = {}), (_ = _[a]);
    }
    _[d[l(d.length, 1)]] = o;
  }
  getEntityById(t, e) {
    let i = this.dataSources.get(t);
    return (
      !i &&
        this.viewer &&
        ((i = this.findDataSourceInViewer(t)), i) &&
        this.dataSources.set(t, i),
      i ? i.entities.getById(e) : null
    );
  }
  createColor(t, e = 1) {
    if ((i = typeof Cesium) != (o = "undefined")) {
      const i = Cesium.Color.fromCssColorString(t);
      return (i.alpha = e), i;
    }
    var i, o;
    return t;
  }
  createCartesian2(t, e) {
    const i = {
      WzSaN: "2|0|1|3|4",
      DeuVE: function (r, n) {
        return r !== n;
      },
      mhRTD: "undefined",
      yNnyY: "GlWio",
    };
    if (i.DeuVE(typeof Cesium, i.mhRTD)) {
      return new Cesium.Cartesian2(t, e);
    }
    const o = {};
    return (o.x = t), (o.y = e), o;
  }
  addBillboards(t, e) {
    const i = [];
    return (
      e.forEach((o) => {
        {
          const r = {};
          (r.coordinates = o.coordinates),
            (r.image = o.image),
            (r.billboardStyle = o.billboardStyle),
            (r.labelStyle = o.labelStyle),
            (r.properties = o.properties),
            (r.id = o.id);
          const n = this.addBillboard(t, r);
          n && i.push(n);
        }
      }),
      i
    );
  }
  addPoints(t, e) {
    const i = [];
    return (
      e.forEach((o) => {
        {
          const r = {};
          (r.coordinates = o.coordinates),
            (r.pointStyle = o.pointStyle),
            (r.labelStyle = o.labelStyle),
            (r.properties = o.properties),
            (r.id = o.id);
          const n = this.addPoint(t, r);
          n && i.push(n);
        }
      }),
      i
    );
  }
  clearLayer(t) {
    this.removeDataSource(t);
  }
  addDroneFOV(t, e) {
    const i = {
        qvmSo: "0|2|1|4|3",
        xbXUa: "string",
        XbAUe: "presets",
        NwPTL: function (x, p) {
          return x < p;
        },
        lCqTv: "tbOZT",
        VYJPs: function (x, p) {
          return x !== p;
        },
        roMDc: function (x, p) {
          return x === p;
        },
        RrTuc: "ugMYJ",
        Mfmnz: function (x, p) {
          return x !== p;
        },
        hSioh: function (x, p) {
          return x(p);
        },
        skloj: function (x, p, C, D, b, S) {
          return x(p, C, D, b, S);
        },
        evesO: "YJLDn",
        svZzF: "drone_fov_simple",
        vFbAe: "frustum",
      },
      o = this.getOrCreateDataSource(t);
    if (!o || !this.viewer) return null;
    const r = {
        heading: 0,
        pitch: 0,
        roll: 0,
      },
      {
        position: n,
        fov: s,
        zoomLevel: l,
        fovCalculationMethod: u = i.XbAUe,
        height: c = 300,
        orientation: d = r,
        style: _ = {},
        properties: f = {},
      } = e;
    if (!n || i.NwPTL(n.length, 3)) return null;
    let a = 45;
    if (i.VYJPs(s, void 0)) {
      a = s;
    } else
      i.Mfmnz(l, void 0) &&
        (a = i.roMDc(u, i.XbAUe)
          ? i.hSioh(calculateFOVFromPresets, l)
          : i.hSioh(calculateFOVFromZoom, l));
    const h = i.skloj(createFrustumGeometry, n, d, a, c, _);
    if (!h) return null;
    const y = h.apex,
      g = {};
    return (
      (g.position = y),
      (g.properties = {
        ...f,
      }),
      (g.properties._type = i.svZzF),
      (g.properties._primitives = h.primitives),
      (g.properties._apex = y),
      (g.properties._height = c),
      (g.properties.fovType = i.vFbAe),
      (g.properties.calculatedFov = a),
      (g.properties.zoomLevel = l),
      (g.properties.fovCalculationMethod = u),
      (g.properties._style = _),
      o.entities.add(g)
    );
  }
  updateDroneFOV(t, e) {
    var h, y, g;
    const i = function (x, p) {
        return x === p;
      },
      o = function (x, p) {
        return x !== p;
      },
      r = function (x, p) {
        return x !== p;
      },
      n = function (x, p) {
        return x !== p;
      },
      {
        position: s,
        orientation: l,
        fov: u,
        zoomLevel: c,
        fovCalculationMethod: d,
        height: _,
        style: f,
      } = e;
    if (!t) {
      return !1;
    }
    let a = u;
    if (
      (void 0 === u &&
        o(c, void 0) &&
        (a = (
          "presets" ===
            (d ||
              (null ==
              (y = null == (h = t.properties) ? void 0 : h.fovCalculationMethod)
                ? void 0
                : y.getValue()) ||
              "presets")
            ? calculateFOVFromPresets
            : calculateFOVFromZoom
        )(c)),
      o(a, void 0) && t.properties)
    ) {
      t.properties.calculatedFov = a;
    }
    if (
      (void 0 !== c && t.properties && (t.properties.zoomLevel = c),
      o(d, void 0) && t.properties && (t.properties.fovCalculationMethod = d),
      t.properties && t.properties._primitives)
    ) {
      if (!this.viewer) return !1;
      const x = t.properties._height,
        p =
          t.properties._fov ||
          (null == (g = t.properties.calculatedFov) ? void 0 : g.getValue()),
        C = t.properties._style,
        D = r(_, void 0) ? _ : x,
        b = void 0 !== a ? a : p,
        S = n(f, void 0) ? f : C;
      let v;
      if ((this.removeDroneFOV("", t), s)) v = s;
      else if (t.position) {
        const E = Cesium.Cartographic.fromCartesian(
          t.position.getValue(Cesium.JulianDate.now()),
        );
        v = [
          Cesium.Math.toDegrees(E.longitude),
          Cesium.Math.toDegrees(E.latitude),
          E.height,
        ];
      }
      const V = createFrustumGeometry(v, l, b, D, S);
      if (V) {
        const E = "0|1|4|3|5|2".split("|");
        let B = 0;
        for (;;) {
          switch (E[B++]) {
            case "0":
              t.properties._primitives = V.primitives;
              continue;
            case "1":
              t.properties._apex = V.apex;
              continue;
            case "2":
              t.position = V.apex;
              continue;
            case "3":
              t.properties.calculatedFov = b;
              continue;
            case "4":
              t.properties._height = D;
              continue;
            case "5":
              t.properties._style = S;
              continue;
          }
          break;
        }
      }
    }
    return !0;
  }
  removeDroneFOV(t, e) {
    const i = function (n, s) {
        return n === s;
      },
      o = function (n, s) {
        return n !== s;
      },
      r = function (n, s) {
        return n === s;
      };
    if (!e) return !1;
    if (e.properties && e.properties._primitives) {
      const n = this.viewer;
      let s = e.properties._primitives;
      if (s && i(typeof s.getValue, "function")) {
        s = s.getValue();
      }
      s && s._value && Array.isArray(s._value) && (s = s._value),
        n &&
          s &&
          Array.isArray(s) &&
          s.forEach((l, u) => {
            if (l && !l.isDestroyed()) {
              n.scene.primitives.remove(l);
              try {
                l.destroy();
              } catch {}
            }
          });
    }
    if (t) {
      let n = this.dataSources.get(t);
      if (!n && this.viewer) {
        (n = this.findDataSourceInViewer(t)), n && this.dataSources.set(t, n);
      }
      if (n) {
        try {
          return n.entities.remove(e), !0;
        } catch {
          return !1;
        }
      }
    }
    return !0;
  }
  addWaypointArrow(t, e) {
    const i = "/assets/images/drone/arrow.png",
      o = function (d, _) {
        return d || _;
      },
      r = this.getOrCreateDataSource(t);
    if (!r) return null;
    const {
      position: n,
      image: s,
      rotation: l = 0,
      billboardStyle: u = {},
      properties: c,
    } = e;
    return r.entities.add({
      id: e.id || "arrow_" + Date.now(),
      position: Cesium.Cartesian3.fromDegrees(n[0], n[1], n[2] || 0),
      billboard: {
        image: s || i,
        scale: u.scale || 1,
        rotation: Cesium.Math.toRadians(l),
        heightReference: u.heightReference
          ? Cesium.HeightReference[u.heightReference]
          : Cesium.HeightReference.NONE,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      },
      properties: o(c, {}),
    });
  }
  updateWaypointArrow(t, e) {
    const i = "airport-coverage-pulse-",
      o = function (h, y) {
        return h / y;
      },
      r = function (h, y) {
        return h / y;
      },
      n = function (h, y) {
        return h / y;
      },
      s = function (h, y) {
        return h === y;
      },
      l = function (h, y) {
        return h % y;
      },
      u = function (h, y) {
        return h % y;
      },
      c = function (h, y) {
        return h === y;
      },
      d = "kcVWX",
      _ = "rtRVk",
      f = function (h, y) {
        return h !== y;
      },
      a = "fFnsL";
    if (!t) return !1;
    try {
      const { position: h, rotation: y, billboardStyle: g } = e;
      if (
        (h &&
          (t.position = Cesium.Cartesian3.fromDegrees(h[0], h[1], h[2] || 0)),
        f(y, void 0) &&
          t.billboard &&
          (t.billboard.rotation = Cesium.Math.toRadians(y)),
        g && t.billboard && f(g.scale, void 0))
      ) {
        t.billboard.scale = g.scale;
      }
      return !0;
    } catch {
      return !1;
    }
  }
  removeWaypointArrow(t, e) {
    const i = function (d, _) {
        return d * _;
      },
      o = function (d, _) {
        return d < _;
      },
      r = function (d, _) {
        return d * _;
      },
      n = function (d, _) {
        return d + _;
      },
      s = function (d, _) {
        return d || _;
      },
      l = function (d, _) {
        return d === _;
      },
      u = "jCrsI";
    let c = this.dataSources.get(t);
    if (
      (!c &&
        this.viewer &&
        ((c = this.findDataSourceInViewer(t)), c && this.dataSources.set(t, c)),
      s(!c, !e))
    )
      return !1;
    try {
      return c.entities.remove(e), !0;
    } catch {
      return !1;
    }
  }
  addChartlet(t, e) {
    return this.addBillboard(t, e);
  }
  getDataSource(t) {
    const e = function (o, r) {
      return o || r;
    };
    let i = this.dataSources.get(t);
    return (
      !i &&
        this.viewer &&
        ((i = this.findDataSourceInViewer(t)), i) &&
        this.dataSources.set(t, i),
      e(i, null)
    );
  }
  addTdtLayer(t, e) {
    const i = "default",
      o = "tiles",
      { url: n, layer: s, tileMatrixSetID: l } = e,
      u = {};
    (u.url = n),
      (u.layer = s),
      (u.style = i),
      (u.format = o),
      (u.tileMatrixSetID = l),
      (u.subdomains = ["0", "1", "2", "3", "4", "5", "6", "7"]),
      (u.maximumLevel = 18);
    const c = new Cesium.WebMapTileServiceImageryProvider(u),
      d = this.viewer.imageryLayers.addImageryProvider(c),
      _ = {
        type: "wms",
      };
    (_.layer = d), (_.provider = c), this.dataSources.set(t, _);
  }
  getDataSourcesByName(t, e = !1) {
    const i = function (c, d) {
        return c === d;
      },
      o = function (c, d) {
        return c + d;
      },
      r = function (c, d) {
        return c === d;
      },
      n = function (c, d) {
        return c !== d;
      },
      s = function (c, d) {
        return c === d;
      },
      l = function (c, d) {
        return c !== d;
      },
      u = [];
    if (e) {
      const c = this.dataSources.get(t);
      c && u.push(c);
    } else
      this.dataSources.forEach((c, d) => {
        if (d.startsWith(t)) {
          u.push(c);
        }
      });
    if (this.viewer && this.viewer.dataSources) {
      const c = this.viewer.dataSources.length;
      for (let d = 0; d < c; d++) {
        const _ = this.viewer.dataSources.get(d);
        _ &&
          r(typeof _.name, "string") &&
          (e ? s(_.name, t) : _.name.startsWith(t)) &&
          !u.includes(_) &&
          (u.push(_), this.dataSources.set(_.name, _));
      }
    }
    return u;
  }
  createDataSource(t) {
    return this.getOrCreateDataSource(t);
  }
  getDataSources() {
    return this.dataSources;
  }
  fitBounds(t, e) {
    const i = "ENIFk",
      o = "bJOFW",
      r = "LineString",
      n = function (s, l) {
        return s > l;
      };
    if (this.viewer && t)
      try {
        let s;
        if (t.type === r && t.coordinates) s = t.coordinates;
        else if (Array.isArray(t)) s = t;
        else {
          if (!t.features || !n(t.features.length, 0)) return;
          s = t.features.flatMap((y) => {
            var g;
            return null != (g = y.geometry) && g.coordinates
              ? y.geometry.coordinates
              : [];
          });
        }
        if (!s || 0 === s.length) return;
        const l = s.map((y) => y[0]),
          u = s.map((y) => y[1]),
          c = Math.min(...l),
          d = Math.min(...u),
          _ = Math.max(...l),
          f = Math.max(...u),
          a = Cesium.Rectangle.fromDegrees(c, d, _, f),
          h = {};
        (h.destination = a), (h.duration = 3), this.viewer.camera.flyTo(h);
      } catch {}
  }
  addWMSLayer(t, e, i, o = {}) {
    const r = "LAYERS",
      n = "default",
      l = "1.1.1",
      u = "FORMAT",
      c = "image/png",
      d = "TRANSPARENT",
      _ = "true";
    if (this.viewer)
      try {
        const f = new Cesium.WebMapServiceImageryProvider({
            url: t.split("?")[0],
            layers: this.extractWMSParam(t, r) || n,
            parameters: {
              service: "WMS",
              version: l,
              request: "GetMap",
              styles: this.extractWMSParam(t, "STYLES") || "",
              format: this.extractWMSParam(t, u) || c,
              transparent: this.extractWMSParam(t, d) || _,
            },
          }),
          a = this.viewer.imageryLayers.addImageryProvider(f);
        void 0 !== o.opacity && (a.alpha = o.opacity),
          void 0 !== o.visible && (a.show = o.visible);
        const h = {
          type: "wms",
        };
        (h.layer = a), (h.provider = f), this.dataSources.set(e, h);
      } catch {}
  }
  extractWMSParam(t, e) {
    return new URLSearchParams(t.split("?")[1] || "").get(e);
  }
  showLayer(t) {
    const e = function (r, n) {
        return r === n;
      },
      i = function (r, n) {
        return r !== n;
      },
      o = this.dataSources.get(t);
    o &&
      (e(o.type, "wms") && o.layer
        ? (o.layer.show = !0)
        : i(o.show, void 0) && (o.show = !0));
  }
  hideLayer(t) {
    const e = function (s, l) {
        return s === l;
      },
      i = "ObNTb",
      o = "xtTyz",
      r = function (s, l) {
        return s !== l;
      },
      n = this.dataSources.get(t);
    if (n)
      if (e(n.type, "wms") && n.layer) {
        n.layer.show = !1;
      } else r(n.show, void 0) && (n.show = !1);
  }
  addObliquePhotography(t, e = {}) {
    if (!this.viewer) throw new Error("Cesium Viewer instance is required");
    if (!t) throw new Error("URL is required for oblique photography");
    return new Promise((i, o) => {
      try {
        {
          const r = {
              show: !0,
              maximumScreenSpaceError: 16,
              maximumMemoryUsage: 512,
              cullWithChildrenBounds: !0,
              dynamicScreenSpaceError: !0,
              dynamicScreenSpaceErrorDensity: 0.00278,
              dynamicScreenSpaceErrorFactor: 4,
              dynamicScreenSpaceErrorHeightFalloff: 0.25,
              skipLevelOfDetail: !0,
              baseScreenSpaceError: 1024,
              skipScreenSpaceErrorFactor: 16,
              skipLevels: 1,
              immediatelyLoadDesiredLevelOfDetail: !1,
              loadSiblings: !1,
              ...e,
            },
            n = {};
          (n.url = t),
            (n.show = r.show),
            (n.maximumScreenSpaceError = r.maximumScreenSpaceError),
            (n.maximumMemoryUsage = r.maximumMemoryUsage),
            (n.maximumRequestsPerServer = 10),
            (n.cullWithChildrenBounds = r.cullWithChildrenBounds),
            (n.dynamicScreenSpaceError = r.dynamicScreenSpaceError),
            (n.dynamicScreenSpaceErrorDensity =
              r.dynamicScreenSpaceErrorDensity),
            (n.dynamicScreenSpaceErrorFactor = r.dynamicScreenSpaceErrorFactor),
            (n.dynamicScreenSpaceErrorHeightFalloff =
              r.dynamicScreenSpaceErrorHeightFalloff),
            (n.skipLevelOfDetail = r.skipLevelOfDetail),
            (n.baseScreenSpaceError = r.baseScreenSpaceError),
            (n.skipScreenSpaceErrorFactor = r.skipScreenSpaceErrorFactor),
            (n.skipLevels = r.skipLevels),
            (n.immediatelyLoadDesiredLevelOfDetail =
              r.immediatelyLoadDesiredLevelOfDetail),
            (n.loadSiblings = r.loadSiblings),
            (n.clippingPlanes = r.clippingPlanes),
            (n.classificationType = r.classificationType),
            (n.ellipsoid = r.ellipsoid),
            (n.pointCloudShading = r.pointCloudShading),
            (n.imageBasedLightingFactor = r.imageBasedLightingFactor),
            (n.lightColor = r.lightColor),
            (n.luminanceAtZenith = r.luminanceAtZenith),
            (n.sphericalHarmonicCoefficients = r.sphericalHarmonicCoefficients),
            (n.specularEnvironmentMaps = r.specularEnvironmentMaps),
            (n.debugHeatmapTilePropertyName = r.debugHeatmapTilePropertyName),
            (n.debugFreezeFrame = r.debugFreezeFrame),
            (n.debugColorizeTiles = r.debugColorizeTiles),
            (n.debugWireframe = r.debugWireframe),
            (n.debugShowBoundingVolume = r.debugShowBoundingVolume),
            (n.debugShowContentBoundingVolume =
              r.debugShowContentBoundingVolume),
            (n.debugShowViewerRequestVolume = r.debugShowViewerRequestVolume),
            (n.debugShowGeometricError = r.debugShowGeometricError),
            (n.debugShowRenderingStatistics = r.debugShowRenderingStatistics),
            (n.debugShowMemoryUsage = r.debugShowMemoryUsage),
            (n.debugShowUrl = r.debugShowUrl);
          const s = new Cesium.Cesium3DTileset(n),
            l = this.viewer.scene.primitives.add(s),
            u = r.id || "oblique_photography_" + Date.now(),
            c = {
              type: "oblique_photography",
            };
          (c.tileset = s),
            (c.primitive = l),
            (c.url = t),
            (c.options = r),
            this.dataSources.set(u, c),
            s.readyPromise
              .then((d) => {
                i(d);
              })
              .catch((d) => {
                this.viewer.scene.primitives.remove(s),
                  this.dataSources.delete(u),
                  o(d);
              }),
            s.tileFailed.addEventListener((d) => {});
        }
      } catch (r) {
        o(r);
      }
    });
  }
  flyToObliquePhotography(t, e = 3, i) {
    const o = function (y, g) {
        return y + g;
      },
      r = function (y, g) {
        return y * g;
      },
      n = function (y, g) {
        return y - g;
      },
      s = function (y, g) {
        return y === g;
      },
      l = "IXIdg",
      u = "UcFwq",
      c = function (y, g) {
        return y !== g;
      },
      d = "oblique_photography",
      _ = function (y, g) {
        return y === g;
      },
      f = "DGApg",
      a = this.dataSources.get(t);
    if (!a || c(a.type, d)) return;
    const h = a.tileset;
    if (h)
      h.boundingSphere
        ? this.viewer.camera.flyToBoundingSphere(h.boundingSphere, {
            duration: e,
            offset: i || new Cesium.HeadingPitchRange(0, -0.5, 0),
          })
        : h.readyPromise
            .then(() => {
              h.boundingSphere
                ? this.viewer.camera.flyToBoundingSphere(h.boundingSphere, {
                    duration: e,
                    offset: i || new Cesium.HeadingPitchRange(0, -0.5, 0),
                  })
                : false;
            })
            .catch((y) => {});
  }
  setObliquePhotographyVisibility(t, e) {
    const i = "oblique_photography",
      o = this.dataSources.get(t);
    if (!o || o.type !== i) return;
    const r = o.tileset;
    r && (r.show = e);
  }
  removeObliquePhotography(t) {
    const e = function (r, n) {
        return r !== n;
      },
      i = "oblique_photography",
      o = this.dataSources.get(t);
    if (!o || e(o.type, i)) return !1;
    try {
      const r = o.tileset;
      return (
        r &&
          (this.viewer.scene.primitives.remove(r),
          !r.isDestroyed() && r.destroy()),
        this.dataSources.delete(t),
        !0
      );
    } catch {
      return !1;
    }
  }
  getObliquePhotographyInfo(t) {
    const e = function (s, l) {
        return s !== l;
      },
      i = "oblique_photography",
      o = this.dataSources.get(t);
    if (!o || e(o.type, i)) return null;
    const r = o.tileset,
      n = {};
    return (
      (n.id = t),
      (n.url = o.url),
      (n.ready = (null == r ? void 0 : r.ready) || !1),
      (n.show = (null == r ? void 0 : r.show) || !1),
      (n.boundingSphere = null == r ? void 0 : r.boundingSphere),
      (n.geometricError = null == r ? void 0 : r.geometricError),
      (n.statistics = null == r ? void 0 : r.statistics),
      (n.options = o.options),
      n
    );
  }
  getAllObliquePhotographyLayers() {
    const t = "oblique_photography",
      e = function (o, r) {
        return o === r;
      },
      i = [];
    return (
      this.dataSources.forEach((o, r) => {
        o.type === t && i.push(r);
      }),
      i
    );
  }
  addWMTSLayer(t, e = {}) {
    const i = function (o, r) {
      return o(r);
    };
    if (!this.viewer) throw new Error("Cesium Viewer instance is required");
    if (!t) throw new Error("WMTS URL is required");
    return new Promise((o, r) => {
      try {
        const n = {
            show: !0,
            alpha: 1,
            brightness: 1,
            contrast: 1,
            hue: 0,
            saturation: 1,
            gamma: 1,
            maximumLevel: 18,
            minimumLevel: 0,
            tileWidth: 256,
            tileHeight: 256,
            hasAlphaChannel: !0,
            ...e,
          },
          s = new Cesium.UrlTemplateImageryProvider({
            url: t,
            maximumLevel: n.maximumLevel,
            minimumLevel: n.minimumLevel,
            rectangle: n.rectangle,
            tilingScheme:
              n.tilingScheme || new Cesium.WebMercatorTilingScheme(),
            ellipsoid: n.ellipsoid,
            tileWidth: n.tileWidth,
            tileHeight: n.tileHeight,
            hasAlphaChannel: n.hasAlphaChannel,
            credit: n.credit ? new Cesium.Credit(n.credit) : void 0,
            subdomains: n.subdomains,
            getFeatureInfoFormats: n.getFeatureInfoFormats,
          }),
          l = this.viewer.imageryLayers.addImageryProvider(s);
        (l.show = n.show),
          (l.alpha = n.alpha),
          (l.brightness = n.brightness),
          (l.contrast = n.contrast),
          (l.hue = n.hue),
          (l.saturation = n.saturation),
          (l.gamma = n.gamma);
        const u = n.id || "wmts_layer_" + Date.now();
        l.id = u;
        const c = {
          type: "wmts",
        };
        (c.layer = l),
          (c.provider = s),
          (c.url = t),
          (c.options = n),
          this.dataSources.set(u, c),
          i(o, l);
      } catch (n) {
        i(r, n);
      }
    });
  }
  setWMTSLayerVisibility(t, e) {
    const i = "wmts",
      o = function (s, l) {
        return s === l;
      },
      r = this.dataSources.get(t);
    if (!r || r.type !== i) return void 0;
    const n = r.layer;
    n && (n.show = e);
  }
  removeWMTSLayer(t) {
    const e = function (s, l) {
        return s !== l;
      },
      i = function (s, l) {
        return s !== l;
      },
      o = "cONyS",
      r = "MsSzP",
      n = this.dataSources.get(t);
    if (!n || e(n.type, "wmts")) return !1;
    try {
      const s = n.layer;
      return (
        s && (i(o, r), this.viewer.imageryLayers.remove(s)),
        this.dataSources.delete(t),
        !0
      );
    } catch {
      return !1;
    }
  }
  getWMTSLayerInfo(t) {
    const e = function (s, l) {
        return s !== l;
      },
      i = "wmts",
      o = this.dataSources.get(t);
    if (!o || e(o.type, i)) return null;
    const r = o.layer,
      n = {};
    return (
      (n.id = t),
      (n.url = o.url),
      (n.show = (null == r ? void 0 : r.show) || !1),
      (n.alpha = (null == r ? void 0 : r.alpha) || 1),
      (n.brightness = (null == r ? void 0 : r.brightness) || 1),
      (n.contrast = (null == r ? void 0 : r.contrast) || 1),
      (n.hue = (null == r ? void 0 : r.hue) || 0),
      (n.saturation = (null == r ? void 0 : r.saturation) || 1),
      (n.gamma = (null == r ? void 0 : r.gamma) || 1),
      (n.options = o.options),
      n
    );
  }
  getAllWMTSLayers() {
    const t = [];
    return (
      this.dataSources.forEach((e, i) => {
        "wmts" === e.type && t.push(i);
      }),
      t
    );
  }
  addBeidouGrid(t = {}) {
    const e = {
      NbgEQ: "URL is required for oblique photography",
      zgkdW: "#FFFF00",
      JRmHp: function (a, h) {
        return a / h;
      },
      zXYcT: function (a, h) {
        return a / h;
      },
      ymhDv: function (a, h) {
        return a / h;
      },
      ppAPG: function (a, h) {
        return a / h;
      },
      drdYF: function (a, h) {
        return a - h;
      },
      gEHTY: function (a, h) {
        return a + h;
      },
      mfCYM: function (a, h) {
        return a - h;
      },
      YozXl: function (a, h) {
        return a < h;
      },
      UPehw: function (a, h) {
        return a !== h;
      },
      GFtIj: "JCkjz",
      WPNDt: function (a, h) {
        return a === h;
      },
      exrBz: "vMUib",
      XFlYj: function (a, h) {
        return a * h;
      },
      QpoME: function (a, h) {
        return a + h;
      },
      oZNFJ: function (a, h) {
        return a < h;
      },
      bmQOg: "lJQia",
      jjEKN: function (a, h) {
        return a + h;
      },
      vkNVG: "YQtei",
      CXiDx: function (a, h) {
        return a < h;
      },
      ETIXa: function (a, h) {
        return a + h;
      },
      FmxtE: function (a, h) {
        return a + h;
      },
      rmLcy: function (a, h) {
        return a * h;
      },
      ckYdO: function (a, h) {
        return a - h;
      },
      NOPBX: function (a, h) {
        return a < h;
      },
      bcGnt: function (a, h) {
        return a + h;
      },
      OOGHg: "beidou_grid",
      ePAlt: "JEeZQ",
      UKFQB: "CVcHZ",
    };
    if (!this.viewer) return null;
    const {
      id: i = "beidou_grid_" + Date.now(),
      minLon: o = 113.8789,
      minLat: r = 29.5958,
      maxLon: n = 114.1125,
      maxLat: s = 29.8617,
      level: l = 4,
      zLayers: u = 3,
      lineColor: c = e.zgkdW,
      lineAlpha: d = 0.2,
      lineWidth: _ = 0.5,
      show: f = !0,
    } = t;
    try {
      const a = this.getBeidouGridLevelConfig(l);
      if (!a) return null;
      const { lon_step: h, lat_step: y, height_step: g } = a,
        x = Math.floor(e.JRmHp(o, h)),
        p = Math.floor(e.zXYcT(n, h)),
        C = Math.floor(e.ymhDv(r, y)),
        D = Math.floor(e.ppAPG(s, y)),
        b = e.drdYF(p, x) + 1,
        S = e.gEHTY(e.mfCYM(D, C), 1),
        v = [],
        V = [];
      for (let T = 0; e.YozXl(T, u); T++) {
        const F = T * g;
        for (let I = 0; I < S; I++) {
          const R = e.XFlYj(e.QpoME(C, I), y);
          for (let N = 0; e.oZNFJ(N, b); N++) {
            const O = e.XFlYj(e.jjEKN(x, N), h);
            v.push(Cesium.Cartesian3.fromDegrees(O, R, F));
          }
        }
      }
      const E = S * b;
      for (let T = 0; e.YozXl(T, u); T++)
        if ("zSglY" !== e.vkNVG) {
          const F = e.XFlYj(T, E);
          for (let I = 0; I < S; I++) {
            const R = e.jjEKN(F, e.XFlYj(I, b));
            for (let N = 0; e.YozXl(N, e.drdYF(b, 1)); N++)
              V.push(e.jjEKN(R, N), e.jjEKN(e.gEHTY(R, N), 1));
          }
          for (let I = 0; e.oZNFJ(I, b); I++)
            for (let R = 0; e.CXiDx(R, S - 1); R++)
              V.push(
                e.jjEKN(e.QpoME(F, e.XFlYj(R, b)), I),
                e.ETIXa(e.FmxtE(F, e.rmLcy(R + 1, b)), I),
              );
        }
      for (let T = 0; e.CXiDx(T, e.ckYdO(u, 1)); T++) {
        const F = T * E,
          I = (T + 1) * E;
        for (let R = 0; e.NOPBX(R, E); R++)
          V.push(e.QpoME(F, R), e.bcGnt(I, R));
      }
      const B = new Cesium.Geometry({
          attributes: {
            position: new Cesium.GeometryAttribute({
              componentDatatype: Cesium.ComponentDatatype.DOUBLE,
              componentsPerAttribute: 3,
              values: new Float64Array(v.flatMap((T) => [T.x, T.y, T.z])),
            }),
          },
          indices: new Uint32Array(V),
          primitiveType: Cesium.PrimitiveType.LINES,
          boundingSphere: Cesium.BoundingSphere.fromPoints(v),
        }),
        H = {};
      H.lineWidth = _;
      const P = new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: B,
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(
              Cesium.Color.fromCssColorString(c).withAlpha(d),
            ),
          },
        }),
        appearance: new Cesium.PolylineColorAppearance(),
        asynchronous: !1,
        renderState: H,
        show: f,
      });
      this.viewer.scene.primitives.add(P);
      const w = {};
      (w.minLon = o),
        (w.minLat = r),
        (w.maxLon = n),
        (w.maxLat = s),
        (w.level = l),
        (w.zLayers = u),
        (w.lineColor = c),
        (w.lineAlpha = d),
        (w.lineWidth = _),
        (w.show = f);
      const m = {};
      (m.type = e.OOGHg),
        (m.primitive = P),
        (m.id = i),
        (m.options = w),
        (m.show = f);
      const L = m;
      return this.dataSources.set(i, L), L;
    } catch {
      return null;
    }
  }
  setBeidouGridVisibility(t, e) {
    const i = function (s, l) {
        return s !== l;
      },
      o = "beidou_grid",
      r = this.dataSources.get(t);
    if (!r || i(r.type, o)) return;
    const n = r.primitive;
    n && ((n.show = e), (r.show = e));
  }
  removeBeidouGrid(t) {
    const e = function (h, y) {
        return h + y;
      },
      i = function (h, y) {
        return h <= y;
      },
      o = function (h, y) {
        return h - y;
      },
      r = function (h, y) {
        return h - y;
      },
      n = function (h, y) {
        return h + y;
      },
      s = function (h, y) {
        return h * y;
      },
      l = function (h, y) {
        return h - y;
      },
      u = function (h, y) {
        return h !== y;
      },
      c = "beidou_grid",
      d = "sYmMK",
      _ = "lmafj",
      f = "aZLSK",
      a = this.dataSources.get(t);
    if (!a || u(a.type, c)) return !1;
    try {
      const h = a.primitive;
      return (
        h &&
          (this.viewer.scene.primitives.remove(h),
          !h.isDestroyed() && h.destroy()),
        this.dataSources.delete(t),
        !0
      );
    } catch {
      return !1;
    }
  }
  getBeidouGridInfo(t) {
    const e = function (n, s) {
        return n !== s;
      },
      i = "beidou_grid",
      o = this.dataSources.get(t);
    if (!o || e(o.type, i)) return null;
    const r = {};
    return (
      (r.id = t),
      (r.type = o.type),
      (r.show = o.show),
      (r.options = o.options),
      r
    );
  }
  getAllBeidouGridLayers() {
    const t = "beidou_grid",
      e = [];
    return (
      this.dataSources.forEach((i, o) => {
        i.type === t && e.push(o);
      }),
      e
    );
  }
  generateBeidouGridCode(t, e, i, o = 10) {
    const r = this.generateBeidou2DGridCode(t, e, o),
      n = this.encodeBeidouHeight(i, o);
    return this.interleaveBeidouCodes(r, n);
  }
  generateBeidou2DGridCode(t, e, i = 10) {
    const o = function (O, M) {
        return O + M;
      },
      r = function (O, M) {
        return O >= M;
      },
      n = function (O, M) {
        return O + M;
      },
      s = function (O, M) {
        return O / M;
      },
      l = function (O, M) {
        return O / M;
      },
      u = function (O, M) {
        return O % M;
      },
      c = function (O, M) {
        return O % M;
      },
      d = function (O, M) {
        return O / M;
      },
      _ = function (O, M) {
        return O / M;
      },
      f = function (O, M) {
        return O / M;
      },
      a = function (O, M) {
        return O / M;
      },
      h = function (O, M) {
        return O === M;
      },
      y = function (O, M) {
        return O % M;
      },
      g = function (O, M) {
        return O / M;
      },
      x = function (O, M) {
        return O / M;
      },
      p = function (O, M) {
        return O / M;
      },
      C = function (O, M) {
        return O <= M;
      },
      D = function (O, M) {
        return O <= M;
      },
      b = function (O, M) {
        return O - M;
      },
      S = function (O, M) {
        return O % M;
      },
      v = function (O, M) {
        return O / M;
      },
      V = r(e, 0) ? "N" : "S",
      E = Math.abs(e),
      B = n(Math.floor(s(t, 6)) % 60, 1),
      H = Math.min(Math.floor(l(E, 4)), 21);
    let P =
      n(V, ((w = String), (m = B), w(m)).padStart(2, "0")) +
      "ABCDEFGHIJKLMNOPQRSTUV"[H];
    var w, m;
    if (1 === i) return P;
    let L = u(t, 6),
      T = c(E, 4);
    if (i >= 2) {
      const O = Math.floor(s(L, 0.5)),
        M = Math.floor(d(T, 0.5));
      if (
        ((P += O.toString(16).toUpperCase() + M.toString(16).toUpperCase()),
        2 === i)
      )
        return P;
      (L %= 0.5), (T = u(T, 0.5));
    }
    if (r(i, 3)) {
      const O = Math.floor(_(L, 0.25));
      if (
        ((P += ((F = Math.floor(f(T, _(0.5, 3)))), 2 * F + O).toString()),
        3 === i)
      )
        return P;
      (L = u(L, 0.25)), (T = c(T, d(0.5, 3)));
    }
    var F, I, R, N;
    if (r(i, 4)) {
      const O = f(0.25, 15),
        M = a(0.5, 3) / 10,
        A = Math.floor(L / O),
        z = Math.floor(T / M);
      if (
        ((P += A.toString(16).toUpperCase() + z.toString(16).toUpperCase()),
        h(i, 4))
      )
        return P;
      (L = y(L, O)), (T = y(T, M));
    }
    if (i >= 5) {
      const O = g(0.016666666666666666, 15),
        M = x(0.5, 3) / 10 / 15,
        A = Math.floor(l(L, O)),
        z = Math.floor(T / M);
      if (
        ((P += n(A.toString(16).toUpperCase(), z.toString(16).toUpperCase())),
        h(i, 5))
      )
        return P;
      (L = c(L, O)), (T %= M);
    }
    if (i >= 6) {
      const O = p(g(0.25, 15), 15) / 2,
        M = x(0.5 / 3 / 10, 15) / 2,
        A = Math.floor(p(L, O));
      if (
        ((P += ((N = Math.floor(x(T, M))),
        (R = 1 & N),
        2 * R + ((I = A), 1 & I)).toString()),
        6 === i)
      )
        return P;
      (L = u(L, O)), (T = u(T, M));
    }
    for (let O = 7; C(O, i) && D(O, 10); O++) {
      const M = this.getBeidouGridLevelConfig(b(O, 1));
      if (!M) break;
      const A = d(M.lon_step, 8),
        z = M.lat_step / 8,
        G = S(Math.floor(a(L, A)), 8),
        k = c(Math.floor(v(T, z)), 8);
      (P += o(G.toString(16).toUpperCase(), k.toString(16).toUpperCase())),
        (L %= A),
        (T %= z);
    }
    return P;
  }
  encodeBeidouHeight(t, e) {
    const i = "0123456789",
      o = "01234567",
      r = "0123456789ABCDE",
      n = function (S, v) {
        return S >= v;
      },
      s = function (S, v) {
        return S / v;
      },
      l = function (S, v) {
        return S * v;
      },
      u = function (S, v) {
        return S <= v;
      },
      c = function (S, v) {
        return S / v;
      },
      d = function (S, v) {
        return S * v;
      },
      _ = {
        height_m: 445280,
        max_index: 63,
      };
    _.chars = i;
    const f = {
      height_m: 55660,
      max_index: 7,
    };
    f.chars = o;
    const a = {
      height_m: 123.69,
      max_index: 14,
    };
    a.chars = r;
    const h = {
      height_m: 0.97,
      max_index: 7,
    };
    h.chars = o;
    const y = {
      height_m: 0.015,
      max_index: 7,
    };
    y.chars = o;
    const g = {};
    (g[1] = _),
      (g[2] = f),
      (g[3] = {
        height_m: 27830,
        max_index: 1,
        chars: "01",
      }),
      (g[4] = {
        height_m: 1850,
        max_index: 14,
        chars: "0123456789ABCDE",
      }),
      (g[5] = a),
      (g[6] = {
        height_m: 61.84,
        max_index: 1,
        chars: "01",
      }),
      (g[7] = {
        height_m: 7.73,
        max_index: 7,
        chars: "01234567",
      }),
      (g[8] = h),
      (g[9] = {
        height_m: 0.121,
        max_index: 7,
        chars: "01234567",
      }),
      (g[10] = y);
    const x = g;
    let p = "";
    const C = Math.abs(t);
    p += n(t, 0) ? "0" : "1";
    const D = Math.min(63, Math.floor(s(C, x[1].height_m)));
    p += D.toString().padStart(2, "0");
    let b = C - l(D, x[1].height_m);
    for (let S = 2; u(S, Math.min(e, 10)); S++) {
      const v = x[S],
        V = Math.min(v.max_index, Math.floor(c(b, v.height_m)));
      (p += v.chars[V]), (b -= d(V, v.height_m));
    }
    return p.padEnd(12, "0");
  }
  interleaveBeidouCodes(t, e) {
    const i = function (c, d) {
        return c < d;
      },
      o = "二维网格码长度不足，无法交叉编码",
      r = function (c, d) {
        return c < d;
      };
    if (i(t.length, 4)) throw new Error(o);
    const n = [t.substring(0, 4)],
      s = t.substring(4),
      l = e,
      u = Math.max(s.length, l.length);
    for (let c = 0; i(c, u); c++)
      i(c, l.length) && n.push(l[c]), r(c, s.length) && n.push(s[c]);
    return n.join("");
  }
  getBeidouGridLevelConfig(t) {
    const e = function (w, m) {
        return w / m;
      },
      i = function (w, m) {
        return w / m;
      },
      o = function (w, m) {
        return w / m;
      },
      r = function (w, m) {
        return w / m;
      },
      n = function (w, m) {
        return w / m;
      },
      s = function (w, m) {
        return w / m;
      },
      l = function (w, m) {
        return w / m;
      },
      u = function (w, m) {
        return w / m;
      },
      c = function (w, m) {
        return w / m;
      },
      d = function (w, m) {
        return w / m;
      },
      _ = function (w, m) {
        return w / m;
      },
      f = function (w, m) {
        return w / m;
      },
      a = function (w, m) {
        return w / m;
      },
      h = function (w, m) {
        return w / m;
      },
      y = function (w, m) {
        return w / m;
      },
      g = function (w, m) {
        return w / m;
      },
      x = function (w, m) {
        return w / m;
      },
      p = function (w, m) {
        return w / m;
      },
      C = function (w, m) {
        return w / m;
      },
      D = function (w, m) {
        return w / m;
      },
      b = function (w, m) {
        return w / m;
      },
      S = function (w, m) {
        return w / m;
      },
      v = function (w, m) {
        return w / m;
      },
      V = function (w, m) {
        return w / m;
      },
      E = function (w, m) {
        return w / m;
      },
      B = function (w, m) {
        return w / m;
      },
      H = function (w, m) {
        return w / m;
      },
      P = function (w, m) {
        return w / m;
      };
    return (
      {
        1: {
          lon_step: 6,
          lat_step: 4,
          height_step: 445280,
        },
        2: {
          lon_step: 0.5,
          lat_step: 0.5,
          height_step: 55660,
        },
        3: {
          lon_step: 0.25,
          lat_step: e(1, 6),
          height_step: 27830,
        },
        4: {
          lon_step: i(0.25, 15),
          lat_step: i(1, 6) / 10,
          height_step: 1850,
        },
        5: {
          lon_step: e(o(0.25, 15), 15),
          lat_step: i(r(1 / 6, 10), 15),
          height_step: 123.69,
        },
        6: {
          lon_step: i(n(0.25, 15), 15) / 2,
          lat_step: o(s(n(1, 6), 10) / 15, 2),
          height_step: 61.84,
        },
        7: {
          lon_step: l(u(c(0.25, 15), 15) / 2, 8),
          lat_step: n(d(1, 6) / 10, 15) / 2 / 8,
          height_step: 7.73,
        },
        8: {
          lon_step: u(_(f(u(0.25, 15), 15), 2) / 8, 8),
          lat_step: a(n(c(h(y(1, 6), 10) / 15, 2), 8), 8),
          height_step: 0.97,
        },
        9: {
          lon_step: l(g(x(p(e(0.25, 15), 15), 2) / 8, 8), 8),
          lat_step: l(C(p(D(b(1, 6) / 10, 15), 2) / 8, 8), 8),
          height_step: 0.121,
        },
        10: {
          lon_step: S(v(V(E(0.25, 15), 15) / 2, 8), 8) / 8 / 8,
          lat_step: x(B(r(H(P(p(1, 6) / 10, 15), 2), 8) / 8, 8), 8),
          height_step: 0.015,
        },
      }[t] || null
    );
  }
  calculateBeidouGridCell(t, e, i, o = 4) {
    const r = function (E, B) {
        return E / B;
      },
      n = function (E, B) {
        return E * B;
      },
      s = function (E, B) {
        return E + B;
      },
      l = function (E, B) {
        return E * B;
      },
      u = function (E, B) {
        return E * B;
      },
      c = this.getBeidouGridLevelConfig(o);
    if (!c) return null;
    const { lon_step: d, lat_step: _, height_step: f } = c,
      a = Math.floor(t / d),
      h = Math.floor(r(e, _)),
      y = Math.floor(i / f),
      g = n(a, d),
      x = s(a, 1) * d,
      p = h * _,
      C = l(h + 1, _),
      D = n(y, f),
      b = u(s(y, 1), f),
      S = {};
    (S.lon = a), (S.lat = h), (S.z = y);
    const v = {};
    (v.minLon = g),
      (v.maxLon = x),
      (v.minLat = p),
      (v.maxLat = C),
      (v.minHeight = D),
      (v.maxHeight = b);
    const V = {};
    return (V.gridIndex = S), (V.bounds = v), V;
  }
  addBeidouGridCell(t, e, i = {}) {
    if (!this.viewer) return null;
    const {
        fillColor: o = "#00FF00",
        fillAlpha: r = 0.2,
        outlineColor: n = "#00FF00",
        outlineWidth: s = 2,
        show: l = !0,
      } = i,
      u = this.getOrCreateDataSource(t);
    if (!u) return null;
    const c = [
        e.minLon,
        e.minLat,
        e.minHeight,
        e.maxLon,
        e.minLat,
        e.minHeight,
        e.maxLon,
        e.maxLat,
        e.minHeight,
        e.minLon,
        e.maxLat,
        e.minHeight,
      ],
      d = [
        e.minLon,
        e.minLat,
        e.maxHeight,
        e.maxLon,
        e.minLat,
        e.maxHeight,
        e.maxLon,
        e.maxLat,
        e.maxHeight,
        e.minLon,
        e.maxLat,
        e.maxHeight,
      ],
      _ = u.entities.add({
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArrayHeights(c),
          material: Cesium.Color.fromCssColorString(o).withAlpha(r),
          outline: !0,
          outlineColor: Cesium.Color.fromCssColorString(n),
          outlineWidth: s,
          perPositionHeight: !0,
          heightReference: Cesium.HeightReference.NONE,
        },
        show: l,
      }),
      f = u.entities.add({
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArrayHeights(d),
          material: Cesium.Color.fromCssColorString(o).withAlpha(r),
          outline: !0,
          outlineColor: Cesium.Color.fromCssColorString(n),
          outlineWidth: s,
          perPositionHeight: !0,
          heightReference: Cesium.HeightReference.NONE,
        },
        show: l,
      }),
      a = [
        [
          e.minLon,
          e.minLat,
          e.minHeight,
          e.maxLon,
          e.minLat,
          e.minHeight,
          e.maxLon,
          e.maxLat,
          e.minHeight,
          e.minLon,
          e.maxLat,
          e.minHeight,
          e.minLon,
          e.minLat,
          e.minHeight,
        ],
        [
          e.minLon,
          e.minLat,
          e.maxHeight,
          e.maxLon,
          e.minLat,
          e.maxHeight,
          e.maxLon,
          e.maxLat,
          e.maxHeight,
          e.minLon,
          e.maxLat,
          e.maxHeight,
          e.minLon,
          e.minLat,
          e.maxHeight,
        ],
        [e.minLon, e.minLat, e.minHeight, e.minLon, e.minLat, e.maxHeight],
        [e.maxLon, e.minLat, e.minHeight, e.maxLon, e.minLat, e.maxHeight],
        [e.maxLon, e.maxLat, e.minHeight, e.maxLon, e.maxLat, e.maxHeight],
        [e.minLon, e.maxLat, e.minHeight, e.minLon, e.maxLat, e.maxHeight],
      ].map((g) =>
        u.entities.add({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(g),
            width: s,
            material: Cesium.Color.fromCssColorString(n),
            clampToGround: !1,
          },
          show: l,
        }),
      ),
      h = [
        [
          [e.minLon, e.minLat],
          [e.maxLon, e.minLat],
        ],
        [
          [e.maxLon, e.minLat],
          [e.maxLon, e.maxLat],
        ],
        [
          [e.maxLon, e.maxLat],
          [e.minLon, e.maxLat],
        ],
        [
          [e.minLon, e.maxLat],
          [e.minLon, e.minLat],
        ],
      ].map((g) =>
        u.entities.add({
          wall: {
            positions: Cesium.Cartesian3.fromDegreesArray(g.flat()),
            minimumHeights: [e.minHeight, e.minHeight],
            maximumHeights: [e.maxHeight, e.maxHeight],
            material: Cesium.Color.fromCssColorString(o).withAlpha(
              Math.max(r, 0),
            ),
            outline: !1,
          },
          show: l,
        }),
      ),
      y = {};
    return (y.bottom = _), (y.top = f), (y.edges = a), (y.sides = h), y;
  }
  getGridsCrossedByLineSegment(t, e, i) {
    var O;
    const o = "无法获取网格配置，使用 calculateBeidouGridCell 替代方案",
      r = function (M, A) {
        return M <= A;
      },
      n = function (M, A) {
        return M + A;
      },
      s = function (M, A) {
        return M * A;
      },
      l = function (M, A) {
        return M / A;
      },
      u = function (M, A) {
        return M / A;
      },
      c = function (M, A) {
        return M + A;
      },
      d = function (M, A) {
        return M * A;
      },
      _ = function (M, A) {
        return M / A;
      },
      f = function (M, A) {
        return M - A;
      },
      a = function (M, A) {
        return M - A;
      },
      h = function (M, A) {
        return M === A;
      },
      y = "UhDLW",
      g = function (M, A) {
        return M + A;
      },
      x = function (M, A) {
        return M + A;
      },
      p = "tmMcA",
      C = [],
      D =
        null == (O = this.getBeidouGridLevelConfig) ? void 0 : O.call(this, i);
    if (!D) {
      const M = this.calculateBeidouGridCell(t.lon, t.lat, t.height, i),
        A = this.calculateBeidouGridCell(e.lon, e.lat, e.height, i);
      if (M && A) {
        const z = {};
        (z.x = M.gridIndex.lon), (z.y = M.gridIndex.lat), (z.z = M.gridIndex.z);
        const G = z,
          k = {};
        (k.x = A.gridIndex.lon), (k.y = A.gridIndex.lat), (k.z = A.gridIndex.z);
        const Y = k,
          j = Y.x - G.x,
          W = Y.y - G.y,
          Z = Y.z - G.z,
          Q = Math.max(Math.abs(j), Math.abs(W), Math.abs(Z));
        if (0 === Q) return C.push(G), C;
        const $ = new Set();
        for (let q = 0; r(q, Q); q++) {
          const X = {
              x: Math.round(n(G.x, s(l(j, Q), q))),
              y: Math.round(G.y + s(u(W, Q), q)),
              z: Math.round(c(G.z, d(u(Z, Q), q))),
            },
            K = X.x + "_" + X.y + "_" + X.z;
          !$.has(K) && ($.add(K), C.push(X));
        }
      }
      return C;
    }
    const { lon_step: b, lat_step: S, height_step: v } = D,
      V = {
        x: Math.floor(l(t.lon, b)),
        y: Math.floor(t.lat / S),
        z: Math.floor(u(t.height, v)),
      },
      E = {
        x: Math.floor(l(e.lon, b)),
        y: Math.floor(_(e.lat, S)),
        z: Math.floor(e.height / v),
      },
      B = f(E.x, V.x),
      H = a(E.y, V.y),
      P = E.z - V.z,
      w = Math.max(Math.abs(B), Math.abs(H), Math.abs(P));
    if (0 === w) return C.push(V), C;
    const m = B / w,
      L = u(H, w),
      T = _(P, w);
    let F = V.x,
      I = V.y,
      R = V.z;
    const N = new Set();
    for (let M = 0; M <= w; M++) {
      const A = {
          x: Math.floor(F + 0.5),
          y: Math.floor(g(I, 0.5)),
          z: Math.floor(x(R, 0.5)),
        },
        z = A.x + "_" + A.y + "_" + A.z;
      if (!N.has(z)) {
        N.add(z), C.push(A);
      }
      (F += m), (I += L), (R += T);
    }
    return C;
  }
  highlightBeidouGridCell(t, e, i = {}) {
    if (!this.viewer) return;
    const {
        fillColor: o = "#ff8100",
        fillAlpha: r = 0.5,
        outlineColor: n = "#ff8100",
        outlineWidth: s = 3,
      } = i,
      l = this.getDataSource(t);
    l && l.entities.removeAll();
    const u = {};
    (u.fillColor = o),
      (u.fillAlpha = r),
      (u.outlineColor = n),
      (u.outlineWidth = s),
      (u.show = !0),
      this.addBeidouGridCell(t, e, u);
  }
  clearBeidouGridCellHighlight(t) {
    const e = this.getDataSource(t);
    e && e.entities.removeAll();
  }
  createCircleRing(t, e, i, o = 48) {
    const r = function (a, h) {
        return a * h;
      },
      n = function (a, h) {
        return a < h;
      },
      s = function (a, h) {
        return a * h;
      },
      l = function (a, h) {
        return a * h;
      },
      u = function (a, h) {
        return a + h;
      },
      c = function (a, h) {
        return a * h;
      },
      d = [],
      _ = i / 111320,
      f = (a = i) / (h = r(Math.cos(r(e, Math.PI) / 180), 111320) || 1e-6);
    var a, h;
    for (let a = 0; n(a, o); a++) {
      const h = s(l(a / o, Math.PI), 2);
      d.push([t + Math.cos(h) * f, u(e, c(Math.sin(h), _))]);
    }
    return d;
  }
  addAirportSymbolLayer(t, e, i, o = {}) {
    const r = function (n, s) {
      return n === s;
    };
    try {
      if (!this.viewer) return !1;
      const n = this.viewer.dataSources.getByName(t)[0];
      n && this.viewer.dataSources.remove(n, !0);
      const s = new Cesium.CustomDataSource(t);
      this.viewer.dataSources.add(s);
      const l = {
        scale: 0.5,
        allowOverlap: !0,
      };
      (l.verticalOrigin = Cesium.VerticalOrigin.BOTTOM),
        (l.horizontalOrigin = Cesium.HorizontalOrigin.CENTER),
        (l.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND),
        (l.disableDepthTestDistance = Number.POSITIVE_INFINITY);
      const u = l,
        c = {
          field: "nickname",
          textStyle: {},
        };
      (c.textStyle.size = 18),
        (c.textStyle.color = "#FFFFFF"),
        (c.textStyle.haloColor = "#AC561D"),
        (c.textStyle.haloWidth = 20),
        (c.textStyle.offset = [0, 2.5]),
        (c.textStyle.allowOverlap = !0);
      const d = c,
        _ = {
          ...u,
          ...o.iconOptions,
        },
        f = {
          ...d,
          ...o.labelOptions,
        };
      e &&
        e.features &&
        e.features.forEach((h) => {
          if (
            h.geometry &&
            "Point" === h.geometry.type &&
            !r("kTIet", "YkSkk")
          ) {
            const x = h.geometry.coordinates,
              p = h.properties || {},
              C = {
                position: Cesium.Cartesian3.fromDegrees(x[0], x[1], x[2] || 0),
                billboard: {
                  image: i,
                  scale: _.scale,
                  pixelOffset: new Cesium.Cartesian2(
                    Array.isArray(_.pixelOffset) ? Number(_.pixelOffset[0] || 0) : 0,
                    Array.isArray(_.pixelOffset)
                      ? Number(_.pixelOffset[1] || 0)
                      : Number(_.pixelOffsetY || 0),
                  ),
                  verticalOrigin: _.verticalOrigin,
                  horizontalOrigin: _.horizontalOrigin,
                  heightReference: _.heightReference,
                  disableDepthTestDistance: _.disableDepthTestDistance,
                },
                properties: p,
              },
              D = f.field;
            if (D && p[D]) {
              const b = f.textStyle,
                S = b.size || 18,
                v = b.offset || [0, 2.5];
              C.label = {
                text: p[D],
                font: S + "px sans-serif",
                fillColor: Cesium.Color.fromCssColorString(
                  b.color || "#FFFFFF",
                ),
                outlineColor: Cesium.Color.fromCssColorString(
                  b.haloColor || "#AC561D",
                ),
                outlineWidth: b.haloWidth || 20,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                pixelOffset: new Cesium.Cartesian2(
                  v[0] * S,
                  ((y = v[1]), (g = S), y * g),
                ),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
              };
            }
            s.entities.add(C);
          }
          var y, g;
        });
      const a = {
        type: "airport_symbol",
      };
      return (
        (a.dataSource = s),
        (a.show = !0),
        (a.options = o),
        this.dataSources.set(t, a),
        !0
      );
    } catch {
      return !1;
    }
  }
  addAirportPulseCoverage(t, e, i = {}) {
    const o = {
      OYobf: function (r, n) {
        return r / n;
      },
      fpeac: function (r, n) {
        return r - n;
      },
      gERgk: function (r, n) {
        return r < n;
      },
      vDSWh: function (r, n) {
        return r * n;
      },
      FfBQP: "gMouL",
      XpedS: function (r) {
        return r();
      },
      cHNfa: function (r, n) {
        return r * n;
      },
      DHveW: "lACfN",
      gDLkR: function (r, n) {
        return r + n;
      },
      IzizH: function (r, n) {
        return r - n;
      },
      gRRXf: "airport_coverage_pulse",
      YWAWK: function (r, n) {
        return r !== n;
      },
      yimqW: "ukUTi",
      sxShp: "rgba(0,170,255,0.18)",
      OivJv: "rgba(0,170,255,0.35)",
      ZPwhL: function (r, n) {
        return r === n;
      },
      xlgVU: "BNCof",
    };
    try {
      if (!o.YWAWK(o.yimqW, o.yimqW)) {
        if (!this.viewer) return !1;
        const {
            baseRadius: r = 3e3,
            maxRadius: n = 5e3,
            baseColor: s = o.sxShp,
            pulseColor: l = o.OivJv,
            baseOpacity: u = 0.18,
            pulseOpacity: c = 0.35,
          } = i,
          d = 10,
          _ = 220,
          f = 2 * o.vDSWh(d, _),
          a = Date.now(),
          h = () => {
            const x = o.OYobf(o.fpeac(Date.now(), a) % f, f);
            return o.gERgk(x, 0.5) ? o.vDSWh(x, 2) : o.vDSWh(o.fpeac(1, x), 2);
          };
        e.forEach(({ id: x, lon: p, lat: C }) => {
          const D = {
              ZVIaM: function (H, P) {
                return H === P;
              },
              QItsT: o.DHveW,
              oIOBW: function (H) {
                return H();
              },
              konpG: function (H, P) {
                return o.gDLkR(H, P);
              },
              fMxDZ: function (H, P) {
                return o.IzizH(H, P);
              },
            },
            b = this.createCircleRing(p, C, r, 48),
            S = {};
          (S.material = s),
            this.addPolygon("airport-coverage-base-" + x, {
              coordinates: [b],
              polygonStyle: S,
              properties: {
                type: "airport_coverage",
                id: x,
              },
            });
          const v = "airport-coverage-pulse-" + x;
          let V = this.viewer.dataSources.getByName(v)[0];
          !V &&
            ((V = new Cesium.CustomDataSource(v)),
            this.viewer.dataSources.add(V));
          const E = "pulse-poly-" + x;
          let B = (V.entities.getById && V.entities.getById(E)) || null;
          if (!B) {
            const H = this.createCircleRing(p, C, r, 48),
              P = {};
            (P.type = o.gRRXf),
              (P.id = x),
              (B = V.entities.add({
                id: E,
                polygon: {
                  hierarchy: new Cesium.PolygonHierarchy(
                    Cesium.Cartesian3.fromDegreesArray(H.flat()),
                  ),
                  material: Cesium.Color.fromCssColorString(l),
                },
                properties: P,
              }));
          }
          (B.polygon.hierarchy = new Cesium.CallbackProperty(() => {
            if (D.ZVIaM(D.QItsT, D.QItsT)) {
              const H = D.oIOBW(h),
                P = D.konpG(r, D.fMxDZ(n, r) * H),
                w = this.createCircleRing(p, C, P, 48);
              return new Cesium.PolygonHierarchy(
                Cesium.Cartesian3.fromDegreesArray(w.flat()),
              );
            }
          }, !1)),
            (B.polygon.material = new Cesium.ColorMaterialProperty(
              new Cesium.CallbackProperty(() => {
                if (o.FfBQP == o.FfBQP) {
                  const H = o.XpedS(h),
                    P = Math.max(0, o.cHNfa(c, 1 - H));
                  return Cesium.Color.fromCssColorString(
                    "rgba(0,170,255," + P.toFixed(3) + ")",
                  );
                }
                throw new Error("二维网格码长度不足，无法交叉编码");
              }, !1),
            ));
        });
        const y = {
            pulseItems: e,
            ...i,
          },
          g = {
            type: "airport_pulse_coverage",
            dataSource: null,
            show: !0,
          };
        return (g.options = y), this.dataSources.set(t, g), !0;
      }
    } catch {
      return !1;
    }
  }
  removeAirportPulseCoverage(t, e) {
    var i, o;
    try {
      if (!this.viewer) return !1;
      const r = (n) => {
        const s = this.viewer.dataSources.getByName(n)[0];
        s && this.viewer.dataSources.remove(s, !0);
        this.dataSources.delete(n);
      };
      if (Array.isArray(e) && e.length > 0)
        e.forEach((n) => {
          r("airport-coverage-base-" + n), r("airport-coverage-pulse-" + n);
        });
      else {
        const n = [];
        null ==
          (o =
            null == (i = this.viewer.dataSources._dataSources)
              ? void 0
              : i.forEach) ||
          o.call(i, (s) => {
            null != s &&
              s.name &&
              (s.name.startsWith("airport-coverage-base-") ||
                s.name.startsWith("airport-coverage-pulse-")) &&
              n.push(s.name);
          }),
          n.forEach(r);
      }
      return this.dataSources.delete(t), !0;
    } catch {
      return !1;
    }
  }
  removeAirportSymbolLayer(t) {
    const e = function (l, u) {
        return l || u;
      },
      i = "/assets/images/drone/arrow.png",
      o = "rctVM",
      r = function (l, u) {
        return l !== u;
      },
      n = "IFDKT",
      s = "jaVyG";
    try {
      {
        if (!this.viewer) return !1;
        const l = this.viewer.dataSources.getByName(t)[0];
        return (
          l && this.viewer.dataSources.remove(l, !0),
          this.dataSources.delete(t),
          !0
        );
      }
    } catch {
      return !1;
    }
  }
  destroy() {
    if (this.viewer)
      try {
        this.getAllWMTSLayers().forEach((t) => {
          this.removeWMTSLayer(t);
        }),
          this.getAllObliquePhotographyLayers().forEach((t) => {
            this.removeObliquePhotography(t);
          }),
          this.getAllBeidouGridLayers().forEach((t) => {
            this.removeBeidouGrid(t);
          }),
          this.eventListeners.forEach((t) => {
            t.forEach((e) => {
              try {
                e();
              } catch {}
            });
          }),
          this.eventListeners.clear(),
          this.removeCameraHeightListener(),
          this.dataSources.clear(),
          this.viewer.destroy();
      } catch {}
    (this.viewer = null),
      this.dataSources.clear(),
      this.layerZIndexMap.clear(),
      this.eventListeners.clear(),
      this.heightLimitedLayers.clear();
  }
  initCameraHeightListener() {
    this.viewer &&
      !this.cameraHeightListener &&
      (this.cameraHeightListener = this.viewer.camera.changed.addEventListener(
        () => {
          {
            const t = this.viewer.camera.positionCartographic;
            if (t) {
              const e = t.height;
              (this.currentCameraHeight = e), this.checkLayerHeightLimits(e);
            }
          }
        },
      ));
  }
  removeCameraHeightListener() {
    this.cameraHeightListener &&
      (this.cameraHeightListener(), (this.cameraHeightListener = null));
  }
  checkLayerHeightLimits(t) {
    const e = function (i, o) {
      return i !== o;
    };
    this.heightLimitedLayers.forEach((i, o) => {
      const r = this.shouldLayerBeVisible(t, i.minHeight, i.maxHeight);
      e(i.isVisible, r) &&
        ((i.isVisible = r), this.setLayerVisibilityByHeight(o, r));
    });
  }
  shouldLayerBeVisible(t, e, i) {
    const o = function (s, l) {
      return s !== l;
    };
    return !(
      (o(e, void 0) && t < e) ||
      (o(i, void 0) && ((r = t), (n = i), r > n))
    );
    var r, n;
  }
  setLayerVisibilityByHeight(t, e) {
    const i = "_online",
      o = "_offline",
      r = function (l, u) {
        return l < u;
      },
      n = "airport-coverage-base-",
      s = "airport-coverage-pulse-";
    if (
      (this.setLayerVisibility(t, e),
      this.setObliquePhotographyVisibility(t, e),
      this.setWMTSLayerVisibility(t, e),
      this.setBeidouGridVisibility(t, e),
      t.includes(i) || t.includes(o))
    ) {
      const l = this.findDataSourceInViewer(t);
      l && (l.show = e);
    }
    if (t.includes("coverage")) {
      if (this.viewer && this.viewer.dataSources)
        for (let u = 0; r(u, this.viewer.dataSources.length); u++) {
          const c = this.viewer.dataSources.get(u);
          c &&
            c.name &&
            (c.name.startsWith(n) || c.name.startsWith(s)) &&
            (c.show = e);
        }
      const l = this.getDataSource(t);
      l && l.dataSource && (l.dataSource.show = e);
    }
  }
  addLayerHeightLimit(t, e, i) {
    const o = this.currentCameraHeight,
      r = this.shouldLayerBeVisible(o, e, i),
      n = {};
    (n.minHeight = e),
      (n.maxHeight = i),
      (n.isVisible = r),
      this.heightLimitedLayers.set(t, n),
      this.setLayerVisibilityByHeight(t, r);
  }
  removeLayerHeightLimit(t) {
    this.heightLimitedLayers.delete(t);
  }
  getCurrentCameraHeight() {
    return this.currentCameraHeight;
  }
  getLayerHeightLimit(t) {
    return this.heightLimitedLayers.get(t);
  }
  addAirspaceBoxes(t, e, i = {}) {
    const o = "BUgHZ",
      r = function (p, C) {
        return p || C;
      },
      n = function (p, C) {
        return p || C;
      },
      s = "空域范围",
      l = "#00AAFF",
      u = function (p, C) {
        return p % C;
      },
      c = function (p, C) {
        return p + C;
      },
      d = function (p, C) {
        return p !== C;
      },
      _ = "yellow",
      f = function (p, C) {
        return p || C;
      },
      a = function (p, C) {
        return p || C;
      },
      h = function (p, C) {
        return p === C;
      },
      y = "uyvCZ",
      g = "sKxET",
      x = "airspace_boxes";
    if (this.viewer)
      try {
        const p = new Cesium.CustomDataSource(t);
        e.areas.forEach((D, b) => {
          const S_kYgFP = function (w, m) {
              return w === m;
            },
            S_LejAi = "YqBGt",
            S_InPPa = o,
            S_ltLuk = function (w, m) {
              return r(w, m);
            },
            {
              coordinates: v,
              minHeight: V = 0,
              maxHeight: E = 1500,
              name: B,
            } = D,
            H = v.map((w) => Cesium.Cartesian3.fromDegrees(w[0], w[1], V)),
            P = v.map((w) => Cesium.Cartesian3.fromDegrees(w[0], w[1], E));
          p.entities.add({
            id: t + "_bottom_" + b,
            name: n(B, s) + "底面",
            polygon: {
              hierarchy: H,
              material: Cesium.Color.fromCssColorString(
                i.fillColor || l,
              ).withAlpha(i.fillOpacity || 0.3),
              outline: !1,
              height: V,
            },
          }),
            p.entities.add({
              id: t + "_top_" + b,
              name: (B || s) + "顶面",
              polygon: {
                hierarchy: P,
                material: Cesium.Color.fromCssColorString(
                  i.fillColor || "#00AAFF",
                ).withAlpha(i.fillOpacity || 0.3),
                outline: !1,
                height: E,
              },
            });
          for (let w = 0; w < v.length; w++) {
            const m = u(w + 1, v.length),
              L = v[w],
              T = v[m],
              F = [
                Cesium.Cartesian3.fromDegrees(L[0], L[1], V),
                Cesium.Cartesian3.fromDegrees(T[0], T[1], V),
                Cesium.Cartesian3.fromDegrees(T[0], T[1], E),
                Cesium.Cartesian3.fromDegrees(L[0], L[1], E),
              ];
            p.entities.add({
              id: t + "_side_" + b + "_" + w,
              name: r(B, s) + "侧面" + c(w, 1),
              polygon: {
                hierarchy: F,
                material: Cesium.Color.fromCssColorString(
                  i.fillColor || l,
                ).withAlpha(i.fillOpacity || 0.3),
                outline: !1,
              },
            });
          }
          if (d(i.showOutline, !1)) {
            const w = Cesium.Color.fromCssColorString(i.outlineColor || _),
              m = i.outlineWidth || 2,
              L = [...H];
            L.push(L[0]);
            const T = {};
            (T.positions = L),
              (T.width = m),
              (T.material = w),
              (T.clampToGround = !1),
              p.entities.add({
                id: t + "_bottom_outline_" + b,
                name: f(B, s) + "底面边框",
                polyline: T,
              });
            const F = [...P];
            F.push(F[0]);
            const I = {};
            (I.positions = F),
              (I.width = m),
              (I.material = w),
              (I.clampToGround = !1),
              p.entities.add({
                id: t + "_top_outline_" + b,
                name: a(B, s) + "顶面边框",
                polyline: I,
              }),
              v.forEach((R, N) => {
                const O = Cesium.Cartesian3.fromDegrees(R[0], R[1], V),
                  M = Cesium.Cartesian3.fromDegrees(R[0], R[1], E),
                  A = {};
                (A.positions = [O, M]),
                  (A.width = m),
                  (A.material = w),
                  (A.clampToGround = !1),
                  p.entities.add({
                    id: t + "_vertical_outline_" + b + "_" + N,
                    name: S_ltLuk(B, "空域范围") + "垂直边框",
                    polyline: A,
                  });
              });
          }
        }),
          this.viewer.dataSources.add(p);
        const C = {};
        (C.dataSource = p),
          (C.type = x),
          (C.visible = !0),
          this.dataSources.set(t, C);
      } catch {}
  }
  createRouteLayerManager(t, e) {
    this.routeLayerManagers.has(t);
    const i = {
      routeId: t,
      routeLayerId: "route-layer-" + t,
      animatePointLayerId: "route-animate-point-layer-" + t,
      trajectoryGridsLayerId: "route-trajectory-grids-" + t,
      currentGridHighlightLayerId: "route-current-grid-highlight-" + t,
      isVisible: !0,
      visitedGrids: new Set(),
      currentHighlightedGrid: null,
      animationEntity: null,
      animationFrameId: null,
      routeCoordinates: [],
      droneImageUrl: (null == e ? void 0 : e.droneImageUrl) || "",
      beidouGridLevel: (null == e ? void 0 : e.beidouGridLevel) || 5,
    };
    return this.routeLayerManagers.set(t, i), i;
  }
  getRouteLayerManager(t) {
    return this.routeLayerManagers.get(t);
  }
  loadRouteLayer(t, e, i) {
    var _, f, a, h, y, g, x, p, C, D, b, S, v, V;
    let o = this.getRouteLayerManager(t);
    if (!o) {
      const E = {};
      (E.droneImageUrl = null == i ? void 0 : i.droneImageUrl),
        (E.beidouGridLevel = null == i ? void 0 : i.beidouGridLevel),
        (o = this.createRouteLayerManager(t, E));
    }
    if (!o) return;
    null != i && i.droneImageUrl && (o.droneImageUrl = i.droneImageUrl),
      null != i && i.beidouGridLevel && (o.beidouGridLevel = i.beidouGridLevel),
      (o.routeCoordinates = e.coordinates);
    const r = {};
    (r.color =
      (null == (_ = null == i ? void 0 : i.routeStyle) ? void 0 : _.color) ||
      "#0FCCC4"),
      (r.width =
        (null == (f = null == i ? void 0 : i.routeStyle) ? void 0 : f.width) ||
        7),
      (r.alpha =
        (null == (a = null == i ? void 0 : i.routeStyle) ? void 0 : a.alpha) ||
        0.8);
    const n = r,
      s = {};
    (s.fillColor =
      (null == (h = null == i ? void 0 : i.gridStyle) ? void 0 : h.fillColor) ||
      "#00FF00"),
      (s.fillAlpha =
        (null == (y = null == i ? void 0 : i.gridStyle)
          ? void 0
          : y.fillAlpha) || 0),
      (s.outlineColor =
        (null == (g = null == i ? void 0 : i.gridStyle)
          ? void 0
          : g.outlineColor) || "#00FF00"),
      (s.outlineWidth =
        (null == (x = null == i ? void 0 : i.gridStyle)
          ? void 0
          : x.outlineWidth) || 1);
    const l = s,
      u = {};
    (u.fillColor =
      (null == (p = null == i ? void 0 : i.highlightStyle)
        ? void 0
        : p.fillColor) || "#ff8100"),
      (u.fillAlpha =
        (null == (C = null == i ? void 0 : i.highlightStyle)
          ? void 0
          : C.fillAlpha) || 0.2),
      (u.outlineColor =
        (null == (D = null == i ? void 0 : i.highlightStyle)
          ? void 0
          : D.outlineColor) || "#ff8100"),
      (u.outlineWidth =
        (null == (b = null == i ? void 0 : i.highlightStyle)
          ? void 0
          : b.outlineWidth) || 2);
    const c = u;
    try {
      if (
        (this._addRouteLine(o, e.coordinates, n),
        e.coordinates.length > 0 && this._addDroneIcon(o, e.coordinates[0]),
        this._addAllRouteGrids(o, e.coordinates, l),
        e.coordinates.length > 0)
      ) {
        const E = e.coordinates[0];
        this._highlightCurrentRouteGrid(o, E[0], E[1], E[2] || 0, c);
      }
      if (!1 !== (d = null == i ? void 0 : i.autoZoom)) {
        const E = {};
        (E.cameraHeight = (null == i ? void 0 : i.cameraHeight) || 4e3),
          this.zoomToTarget(o.routeLayerId, E);
      }
      if (
        !1 !==
        (null == (S = null == i ? void 0 : i.heightLimit) ? void 0 : S.enabled)
      ) {
        let E =
            null == (v = null == i ? void 0 : i.heightLimit)
              ? void 0
              : v.minHeight,
          B =
            null == (V = null == i ? void 0 : i.heightLimit)
              ? void 0
              : V.maxHeight;
        if (void 0 === E || void 0 === B) {
          const H = e.coordinates.map((m) => m[2] || 0),
            P = Math.min(...H),
            w = Math.max(...H);
          (E = E ?? Math.max(0, P - 100)), (B = B ?? w + 100);
        }
        [
          o.routeLayerId,
          o.animatePointLayerId,
          o.trajectoryGridsLayerId,
          o.currentGridHighlightLayerId,
        ].forEach((H) => {
          this.addLayerHeightLimit(H, E, B);
        });
      }
    } catch {}
    var d;
  }
  _addRouteLine(t, e, i) {
    if (!t) return;
    let o = this.getDataSource(t.routeLayerId);
    if (
      (!o && (o = this.createDataSource(t.routeLayerId)),
      o.entities.removeAll(),
      e.length > 0)
    ) {
      const r = e.map((n) =>
        Cesium.Cartesian3.fromDegrees(n[0], n[1], n[2] || 0),
      );
      o.entities.add({
        polyline: {
          positions: r,
          width: i.width,
          material: this.createColor(i.color, i.alpha),
        },
      });
    }
  }
  _addDroneIcon(t, e) {
    if (!t) return;
    let i = this.getDataSource(t.animatePointLayerId);
    if (
      (i || (i = this.createDataSource(t.animatePointLayerId)),
      i.entities.removeAll(),
      t.droneImageUrl)
    ) {
      const o = i.entities.add({
        position: Cesium.Cartesian3.fromDegrees(e[0], e[1], e[2] || 0),
        billboard: {
          image: t.droneImageUrl,
          scale: 0.12,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        },
      });
      t.animationEntity = o;
    }
  }
  _addAllRouteGrids(t, e, i) {
    const o = function (n, s) {
        return n === s;
      },
      r = function (n, s) {
        return n !== s;
      };
    if (t && !o(e.length, 0))
      try {
        t.visitedGrids.clear(),
          e.forEach((n) => {
            const s = n[0],
              l = n[1],
              u = n[2] || 0,
              c = this.calculateBeidouGridCell(s, l, u, t.beidouGridLevel);
            if (!c) return;
            const d =
              c.gridIndex.lon + "_" + c.gridIndex.lat + "_" + c.gridIndex.z;
            if (!t.visitedGrids.has(d)) {
              {
                t.visitedGrids.add(d);
                const _ = {};
                (_.fillColor = i.fillColor),
                  (_.fillAlpha = i.fillAlpha),
                  (_.outlineColor = i.outlineColor),
                  (_.outlineWidth = i.outlineWidth),
                  (_.show = !0),
                  this.addBeidouGridCell(t.trajectoryGridsLayerId, c.bounds, _);
              }
            }
          });
      } catch {}
  }
  _highlightCurrentRouteGrid(t, e, i, o, r) {
    const n = {
      hzPNT: "1|4|2|3|0",
      bpaub: function (s, l) {
        return s !== l;
      },
      BxkKU: function (s, l) {
        return s === l;
      },
    };
    if (t)
      try {
        const s = this.calculateBeidouGridCell(e, i, o, t.beidouGridLevel);
        if (!s) return;
        const l = s.gridIndex.lon + "_" + s.gridIndex.lat + "_" + s.gridIndex.z;
        if (n.bpaub(t.currentHighlightedGrid, l))
          if (n.BxkKU("BAofB", "BAofB")) {
            t.currentHighlightedGrid = l;
            const u = {};
            (u.fillColor = r.fillColor),
              (u.fillAlpha = r.fillAlpha),
              (u.outlineColor = r.outlineColor),
              (u.outlineWidth = r.outlineWidth),
              this.highlightBeidouGridCell(
                t.currentGridHighlightLayerId,
                s.bounds,
                u,
              );
          }
      } catch {}
  }
  updateDronePosition(t, e, i = !0) {
    const o = function (u, c) {
        return u !== c;
      },
      r = function (u, c) {
        return u === c;
      },
      n = "EjaNU",
      s = "#ff8100",
      l = this.getRouteLayerManager(t);
    if (l && l.animationEntity)
      try {
        if (
          (o("pVHoT", "pVHoT"),
          (l.animationEntity.position = Cesium.Cartesian3.fromDegrees(
            e[0],
            e[1],
            e[2] || 0,
          )),
          i)
        ) {
          r(n, n);
          {
            const u = {};
            (u.fillColor = s),
              (u.fillAlpha = 0.2),
              (u.outlineColor = s),
              (u.outlineWidth = 2);
            const c = u;
            this._highlightCurrentRouteGrid(l, e[0], e[1], e[2] || 0, c);
          }
        }
      } catch {}
  }
  playRouteAnimation(t, e = 60, i, o) {
    const r = function (_, f) {
        return _ - f;
      },
      n = function (_, f) {
        return _ !== f;
      },
      s = this.getRouteLayerManager(t);
    if (!s || 0 === s.routeCoordinates.length) return null;
    null !== s.animationFrameId && cancelAnimationFrame(s.animationFrameId);
    const l = Date.now(),
      u = s.routeCoordinates,
      c = u.length,
      d = () => {
        {
          const _ = r(Date.now(), l) / 1e3,
            f = Math.min(_ / e, 1),
            a = Math.floor(f * r(c, 1));
          if (a < c) {
            const h = u[a];
            this.updateDronePosition(t, h, !0), i && i(f, h);
          }
          if (f < 1) s.animationFrameId = requestAnimationFrame(d);
          else if (((s.animationFrameId = null), o)) {
            o();
          }
        }
      };
    s.animationFrameId = requestAnimationFrame(d);
  }
  stopRouteAnimation(t) {
    const e = this.getRouteLayerManager(t);
    e &&
      null !== e.animationFrameId &&
      (cancelAnimationFrame(e.animationFrameId), (e.animationFrameId = null));
  }
  toggleRouteLayerVisibility(t, e) {
    const i = this.getRouteLayerManager(t);
    i &&
      ((i.isVisible = e),
      [
        i.routeLayerId,
        i.animatePointLayerId,
        i.trajectoryGridsLayerId,
        i.currentGridHighlightLayerId,
      ].forEach((o) => {
        const r = this.getDataSource(o);
        r && (r.show = e);
      }));
  }
  toggleAllRoutesVisibility(t) {
    this.routeLayerManagers.forEach((e, i) => {
      this.toggleRouteLayerVisibility(i, t);
    });
  }
  clearRouteLayer(t) {
    const e = {
        MgHWp: "2|5|4|3|1|0|6",
      },
      i = this.getRouteLayerManager(t);
    if (i)
      try {
        const o = e.MgHWp.split("|");
        let r = 0;
        for (;;) {
          switch (o[r++]) {
            case "0":
              this.routeLayerManagers.delete(t);
              continue;
            case "1":
              this.clearBeidouGridCellHighlight(i.currentGridHighlightLayerId);
              continue;
            case "2":
              this.stopRouteAnimation(t);
              continue;
            case "3":
              this.clearDataSource(i.trajectoryGridsLayerId);
              continue;
            case "4":
              this.clearDataSource(i.animatePointLayerId);
              continue;
            case "5":
              this.clearDataSource(i.routeLayerId);
              continue;
            case "6":
              continue;
          }
          break;
        }
      } catch {}
  }
  clearAllRoutes() {
    Array.from(this.routeLayerManagers.keys()).forEach((t) => {
      this.clearRouteLayer(t);
    });
  }
  getCurrentBeidouGridCode(t, e) {
    const i = this.getRouteLayerManager(t);
    if (!i) return "";
    const o = e[0],
      r = e[1],
      n = e[2] || 0;
    return this.generateBeidouGridCode(o, r, n, i.beidouGridLevel);
  }
  getRouteLayerStatus(t) {
    const e = this.getRouteLayerManager(t);
    return e
      ? {
          initialized: !0,
          visible: e.isVisible,
          routePointsCount: e.routeCoordinates.length,
          visitedGridsCount: e.visitedGrids.size,
          currentGridCode: e.currentHighlightedGrid,
          beidouGridLevel: e.beidouGridLevel,
          isAnimating: ((i = e.animationFrameId), (o = null), i !== o),
        }
      : {
          initialized: !1,
          visible: !1,
          routePointsCount: 0,
          visitedGridsCount: 0,
        };
    var i, o;
  }
  getAllRoutesStatus() {
    const t = {};
    return (
      this.routeLayerManagers.forEach((e, i) => {
        t[i] = this.getRouteLayerStatus(i);
      }),
      t
    );
  }
  getRouteIds() {
    return Array.from(this.routeLayerManagers.keys());
  }
  hasRoute(t) {
    return this.routeLayerManagers.has(t);
  }
}
(CesiumMapManager.LabelStyle = LabelStyle),
  (CesiumMapManager.VerticalOrigin = {
    BASELINE: "BASELINE",
    BOTTOM: "BOTTOM",
    CENTER: "CENTER",
    TOP: "TOP",
  }),
  (CesiumMapManager.HorizontalOrigin = {
    CENTER: "CENTER",
    LEFT: "LEFT",
    RIGHT: "RIGHT",
  }),
  (CesiumMapManager.HeightReference = {
    NONE: "NONE",
    CLAMP_TO_GROUND: "CLAMP_TO_GROUND",
    RELATIVE_TO_GROUND: "RELATIVE_TO_GROUND",
  }),
  (CesiumMapManager.Color = {
    RED: "#FF0000",
    GREEN: "#00FF00",
    BLUE: "#0000FF",
    YELLOW: "#FFFF00",
    CYAN: "#00FFFF",
    MAGENTA: "#FF00FF",
    BLACK: "#000000",
    WHITE: "#FFFFFF",
    GRAY: "#808080",
    TRANSPARENT: "rgba(0,0,0,0)",
  });
export { CesiumMapManager };
export default CesiumMapManager;
