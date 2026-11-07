# Shared Blender helpers for cpk models. Coordinates are Blender's: x right, y BACK (front of the bean is -y), z up.
# Units match the game (bean is ~1.33 tall). Every model is built as one merged mesh with several materials,
# plus a few separate child objects for parts the game animates.
import bpy, bmesh, math, random
from mathutils import Vector, Matrix

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def lin(c):
    c = c / 255
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4

def rgba(h, a=1):
    h = h.lstrip("#"); return (lin(int(h[0:2], 16)), lin(int(h[2:4], 16)), lin(int(h[4:6], 16)), a)

MATS = {}
def mat(col, r=.45, m=0., e=None, ei=1., a=1., name=None):
    """col '#rrggbb' or 'TINT' (the game swaps TINT for the player's colour)."""
    key = name or (col if col == "TINT" else f"{col}|{r}|{m}|{e}|{ei}|{a}")
    if key in MATS: return MATS[key]
    mt = bpy.data.materials.new(key); mt.use_nodes = True
    b = mt.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = rgba("#3ab8ff" if col == "TINT" else col)
    b.inputs["Roughness"].default_value = r; b.inputs["Metallic"].default_value = m
    if e:
        b.inputs["Emission Color"].default_value = rgba(e); b.inputs["Emission Strength"].default_value = ei
    if a < 1:
        b.inputs["Alpha"].default_value = a
        try: mt.surface_render_method = "BLENDED"
        except Exception: pass
        mt.blend_method = "BLEND" if hasattr(mt, "blend_method") else None
    MATS[key] = mt; return mt

# ---------------- primitive builders: each returns a fresh bmesh ----------------
def _bm(): return bmesh.new()

def sphere(r=1, u=24, v=16):
    bm = _bm(); bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=r); return bm

def ico(r=1, sub=2):
    bm = _bm(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r); return bm

def cyl(r1=1, r2=1, h=1, seg=24, caps=True):
    bm = _bm(); bmesh.ops.create_cone(bm, cap_ends=caps, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=h); return bm

def box(x=1, y=1, z=1):
    bm = _bm(); bmesh.ops.create_cube(bm, size=1)
    for vv in bm.verts: vv.co = Vector((vv.co.x * x, vv.co.y * y, vv.co.z * z))
    return bm

def lathe(prof, seg=32, a0=0, a1=2 * math.pi, close=True):
    """prof: list of (r, z) from bottom to top. Revolves around z."""
    bm = _bm(); full = abs(a1 - a0 - 2 * math.pi) < 1e-6; n = seg if full else seg + 1
    rings = []
    for (r, z) in prof:
        ring = []
        for i in range(n):
            a = a0 + (a1 - a0) * i / seg
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        rings.append(ring)
    pairs = list(range(len(rings) - 1))
    closed = close and len(prof) > 2 and prof[0][0] > .01 and prof[-1][0] > .01
    if closed: pairs.append(-1)
    for k in pairs:
        A, B = rings[k], rings[k + 1]
        for i in range(n if full else n - 1):
            j = (i + 1) % n
            try: bm.faces.new((A[i], A[j], B[j], B[i]))
            except ValueError: pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    if closed: bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def torus(R=1, r=.2, seg=32, tseg=12, arc=2 * math.pi):
    bm = _bm(); full = abs(arc - 2 * math.pi) < 1e-6; n = seg if full else seg + 1; rings = []
    for i in range(n):
        a = arc * i / seg; c, s = math.cos(a), math.sin(a); ring = []
        for k in range(tseg):
            b = 2 * math.pi * k / tseg; rr = R + r * math.cos(b)
            ring.append(bm.verts.new((rr * c, rr * s, r * math.sin(b))))
        rings.append(ring)
    for i in range(n if full else n - 1):
        A, B = rings[i], rings[(i + 1) % n]
        for k in range(tseg):
            l = (k + 1) % tseg; bm.faces.new((A[k], B[k], B[l], A[l]))
    if not full:
        for ring in (rings[0], rings[-1]): bm.faces.new(ring if ring is rings[-1] else list(reversed(ring)))
    return bm

def tube(pts, radii, tseg=12, caps=True):
    """Sweep a circle along a list of points (Vectors), radius per point."""
    bm = _bm(); rings = []; up = Vector((0, 0, 1))
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        ref = up if abs(t.dot(up)) < .95 else Vector((1, 0, 0))
        n1 = t.cross(ref).normalized(); n2 = t.cross(n1).normalized(); r = radii[i]
        rings.append([bm.verts.new(p + (n1 * math.cos(2 * math.pi * k / tseg) + n2 * math.sin(2 * math.pi * k / tseg)) * r) for k in range(tseg)])
    for i in range(len(rings) - 1):
        A, B = rings[i], rings[i + 1]
        for k in range(tseg):
            l = (k + 1) % tseg; bm.faces.new((A[k], A[l], B[l], B[k]))
    if caps:
        if radii[0] > 1e-4: bm.faces.new(list(rings[0]))
        if radii[-1] > 1e-4: bm.faces.new(list(reversed(rings[-1])))
        else: bmesh.ops.pointmerge(bm, verts=rings[-1], merge_co=pts[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def roundbox(x, y, z, r, cuts=6):
    """Box with rounded edges, size x*y*z (full), corner radius r."""
    bm = _bm(); bmesh.ops.create_cube(bm, size=2)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
    hx, hy, hz = x / 2 - r, y / 2 - r, z / 2 - r
    for vv in bm.verts:
        p = Vector((vv.co.x * x / 2, vv.co.y * y / 2, vv.co.z * z / 2))
        q = Vector((max(-hx, min(hx, p.x)), max(-hy, min(hy, p.y)), max(-hz, min(hz, p.z))))
        d = p - q
        vv.co = q + (d.normalized() * r if d.length > 1e-6 else d)
    return bm

def extrude_shape(pts2d, depth, bevel=0.0):
    """Flat 2D outline (x, z pairs, CCW seen from front) extruded along y. Centered on y=0."""
    bm = _bm(); f = [bm.verts.new((x, -depth / 2, z)) for (x, z) in pts2d]; b = [bm.verts.new((x, depth / 2, z)) for (x, z) in pts2d]
    n = len(pts2d)
    bm.faces.new(f)
    bm.faces.new(list(reversed(b)))
    for i in range(n):
        j = (i + 1) % n; bm.faces.new((f[i], b[i], b[j], f[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.triangulate(bm, faces=[fc for fc in bm.faces if len(fc.verts) > 4])
    return bm

def star2d(R, r, n=5, cx=0, cz=0, rot=math.pi / 2):
    return [(cx + math.cos(rot + i * math.pi / n) * (R if i % 2 == 0 else r), cz + math.sin(rot + i * math.pi / n) * (R if i % 2 == 0 else r)) for i in range(n * 2)]

def heart2d(s, cx=0, cz=0, n=40):
    out = []
    for i in range(n):
        t = 2 * math.pi * i / n
        x = 16 * math.sin(t) ** 3; z = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        out.append((cx + x * s / 16, cz + z * s / 16))
    return out

def xf(bm, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    """Scale, then rotate (XYZ euler, radians), then move."""
    from mathutils import Euler
    S = Matrix.Diagonal((*scale, 1)); R = Euler(rot, "XYZ").to_matrix().to_4x4(); T = Matrix.Translation(loc)
    bmesh.ops.transform(bm, matrix=T @ R @ S, verts=bm.verts); return bm

def bend(bm, fn):
    for vv in bm.verts: vv.co = Vector(fn(vv.co.copy()))
    return bm

# ---------------- assembling parts into one object ----------------
class Part:
    def __init__(self, name, parent=None, origin=(0, 0, 0)):
        self.name, self.parent, self.origin = name, parent, Vector(origin)
        self.bm = _bm(); self.mats = []
    def add(self, src, m, smooth=True, sharp=35, faces=None):
        """Merge bmesh src with material m (or a function face->material for multi-material parts)."""
        vmap = {}
        for vv in src.verts: vmap[vv] = self.bm.verts.new(vv.co - self.origin)
        src.faces.ensure_lookup_table()
        for f in src.faces:
            mm = m(f) if callable(m) else m
            if mm not in self.mats: self.mats.append(mm)
            try: nf = self.bm.faces.new([vmap[x] for x in f.verts])
            except ValueError: continue
            nf.material_index = self.mats.index(mm); nf.smooth = smooth
        if smooth and sharp:
            lim = math.radians(sharp)
            for e in src.edges:
                if len(e.link_faces) == 2 and e.calc_face_angle(0) > lim:
                    de = self.bm.edges.get([vmap[x] for x in e.verts])
                    if de: de.smooth = False
        src.free(); return self
    def build(self, col=None):
        me = bpy.data.meshes.new(self.name); self.bm.normal_update(); self.bm.to_mesh(me); self.bm.free()
        for m in self.mats: me.materials.append(m)
        ob = bpy.data.objects.new(self.name, me); ob.location = self.origin
        (col or bpy.context.scene.collection).objects.link(ob)
        if self.parent is not None:
            ob.parent = self.parent; ob.location = self.origin - wloc(self.parent)
        return ob

def wloc(ob):
    p = Vector((0, 0, 0))
    while ob is not None: p += ob.location; ob = ob.parent
    return p

def empty(name, loc=(0, 0, 0), parent=None):
    ob = bpy.data.objects.new(name, None); ob.location = loc; bpy.context.scene.collection.objects.link(ob)
    if parent: ob.parent = parent; ob.location = Vector(loc) - wloc(parent)
    return ob

def export(path):
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", export_yup=True, export_apply=True,
                              export_texcoords=False, export_normals=True, export_materials="EXPORT",
                              export_cameras=False, export_lights=False, export_animations=False)
