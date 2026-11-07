# Builds the arena prop models (football, bomb, bumper car, kart, candy decorations, cake drips...).
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from mathutils import Vector
reset(); random.seed(11)
PI = math.pi
TINT = mat("TINT")
def cen(f): return f.calc_center_median()

# ---------- football: a real truncated icosahedron (black pentagons, white hexagons), pushed out to a sphere ----------
bm = ico(1, 1); bm.edges.ensure_lookup_table()
L = bm.edges[0].calc_length()
bmesh.ops.bevel(bm, geom=list(bm.verts), offset=L / 3, offset_type="OFFSET", affect="VERTICES", segments=1)
print("FACES", sorted(len(f.verts) for f in bm.faces).count(5), sorted(len(f.verts) for f in bm.faces).count(6), len(bm.faces))
bm.faces.ensure_lookup_table()
for f in bm.faces: f.material_index = 1 if len(f.verts) == 5 else 0
bmesh.ops.triangulate(bm, faces=bm.faces[:])
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=2, use_grid_fill=True)
for vv in bm.verts: vv.co = vv.co.normalized()
WH = mat("#f8f8f8", .35); BK = mat("#1e1e28", .35)
p = Part("ball_football"); p.add(bm, lambda f: BK if f.material_index == 1 else WH, sharp=0); p.build()

# ---------- bomb ----------
p = Part("bomb", None, (0, 0, 0))
p.add(sphere(.42, 32, 24), mat("#22222e", .22, .5))
p.add(xf(cyl(.13, .13, .14, 20), (0, 0, .42)), mat("#8a8a98", .3, .8))
p.add(xf(torus(.13, .025, 20, 8), (0, 0, .49)), mat("#8a8a98", .3, .8))
p.add(tube([Vector((0, 0, .48)), Vector((.03, 0, .6)), Vector((.1, .02, .66)), Vector((.16, .03, .64))], [.022] * 4, 8), mat("#c8a070", .9))
p.add(xf(sphere(1, 16, 12), (-.16, -.24, .22), (0, 0, 0), (.07, .04, .1)), mat("#ffffff", .2, 0, "#ffffff", .6))
ob = p.build()
sp = Part("spark", ob, (.16, .03, .66))
for k in range(6):
    a = k / 6 * 2 * PI
    sp.add(xf(cyl(.03, .001, .14, 6), (.16 + math.cos(a) * .06, .03 + math.sin(a) * .06, .66), (math.sin(a) * 1.2, -math.cos(a) * 1.2, 0)), mat("#ffd23a", .5, 0, "#ffb000", 2))
sp.add(xf(ico(.05, 1), (.16, .03, .66)), mat("#fff6a0", .5, 0, "#ffe060", 3))
sp.build()

# ---------- bumper car (TINT body), front is -y ----------
p = Part("car_bumper")
body = roundbox(1.2, 1.5, .38, .14)
p.add(xf(body, (0, 0, .24)), TINT)
p.add(xf(torus(1, .14, 48, 12), (0, 0, .16), (0, 0, 0), (.72, .9, 1)), mat("#26262e", .85))
p.add(xf(roundbox(.7, .5, .35, .1), (0, .25, .55), (-.2, 0, 0)), mat("#2a2a38", .7))
p.add(xf(roundbox(.72, .14, .5, .06), (0, .48, .7), (.1, 0, 0)), mat("#2a2a38", .7))
p.add(xf(cyl(.04, .04, .4, 8), (0, -.32, .55), (-.6, 0, 0)), mat("#888898", .3, .8))
p.add(xf(torus(.15, .03, 20, 8), (0, -.43, .72), (-.6 + PI / 2, 0, 0)), mat("#1a1a22", .5))
p.add(xf(cyl(.035, .035, 1.5, 8), (0, .6, 1.15)), mat("#b8b8c8", .3, .8))
for sd in (-1, 1):
    p.add(xf(sphere(.075, 12, 10), (sd * .38, -.74, .32), (0, 0, 0), (1, .5, 1)), mat("#fff6c8", .2, 0, "#fff0a0", 1.2))
p.add(xf(roundbox(1.0, .08, .08, .03), (0, -.76, .2)), mat("#d8d8e4", .2, .8))
ob = p.build()
s2 = Part("spark", ob, (0, .6, 1.93))
s2.add(xf(ico(.07, 1), (0, .6, 1.93)), mat("#ffe23a", .5, 0, "#ffd000", 3)); s2.build()

# ---------- go-kart (TINT), front is -y ----------
p = Part("kart")
p.add(xf(roundbox(.9, 1.5, .22, .08), (0, .05, .24)), TINT)
p.add(xf(roundbox(.66, .55, .2, .08), (0, -.85, .22), (.12, 0, 0)), TINT)
p.add(xf(roundbox(1.1, .2, .1, .04), (0, -1.1, .17)), mat("#26262e", .7))
p.add(xf(roundbox(.5, .42, .12, .06), (0, .25, .38)), mat("#22222c", .7))
p.add(xf(roundbox(.5, .12, .42, .06), (0, .48, .55), (.2, 0, 0)), mat("#22222c", .7))
p.add(xf(cyl(.03, .03, .4, 8), (0, -.3, .5), (-.8, 0, 0)), mat("#888898", .3, .8))
p.add(xf(torus(.12, .025, 18, 8), (0, -.42, .62), (-.8 + PI / 2, 0, 0)), mat("#1a1a22", .5))
for sd in (-1, 1):
    p.add(xf(cyl(.05, .04, .22, 10), (sd * .22, .82, .36), (PI / 2 + .3, 0, 0)), mat("#b8b8c8", .25, .9))
    p.add(xf(cyl(.025, .025, .25, 6), (sd * .45, .78, .45)), mat("#22222c", .5))
p.add(xf(roundbox(1.15, .3, .07, .03), (0, .82, .6)), TINT)
wm = mat("#1a1a1e", .9); hub = mat("#d8d8e4", .25, .85)
for (x, y, r) in [(-.55, -.55, .2), (.55, -.55, .2), (-.58, .6, .25), (.58, .6, .25)]:
    p.add(xf(torus(r * .72, r * .3, 24, 10), (x, y, r), (0, PI / 2, 0)), wm)
    p.add(xf(cyl(r * .5, r * .5, .16, 16), (x, y, r), (0, PI / 2, 0)), hub)
p.build()

# ---------- lollipop tree (TINT swirl) ----------
p = Part("tree_lolli"); wh = mat("#ffffff", .3)
p.add(xf(cyl(.09, .11, 1.6, 12), (0, 0, .8)), wh)
dz = lathe([(.001, -.2), (.6, -.18), (.85, -.08), (.9, 0), (.85, .08), (.6, .18), (.001, .2)], 48)
def swirl(f):
    c = cen(f); a = math.atan2(c.z, c.x); r = math.hypot(c.x, c.z)
    return TINT if int((a / (2 * PI) + r * 1.6) * 6) % 2 == 0 else wh
p.add(xf(dz, (0, 0, 2.2), (PI / 2, 0, 0)), swirl, sharp=0)
p.build()

# ---------- floating candy decorations (all ~2.5 units, TINT = the arena's accent colour) ----------
p = Part("deco_donut"); dough = mat("#e8a860", .7)
p.add(torus(1.0, .45, 40, 18), dough)
ic = torus(1.0, .47, 40, 18)
for vv in ic.verts:
    a = math.atan2(vv.co.y, vv.co.x); lim = .05 + .12 * math.sin(a * 7) + .06 * math.sin(a * 13)
    if vv.co.z < lim: vv.co.z = lim + (vv.co.z - lim) * .02
p.add(ic, TINT)
sc = ["#ffffff", "#ffe23a", "#3ad8ff", "#5ae07a", "#9a6aff", "#ff4ab8"]
for k in range(42):
    a = random.uniform(0, 2 * PI); b2 = random.uniform(.25, 1.25)
    c = Vector((math.cos(a) * (1 + .44 * math.cos(b2)), math.sin(a) * (1 + .44 * math.cos(b2)), .47 * math.sin(b2) + .01))
    p.add(xf(cyl(.035, .035, .16, 6), c, (PI / 2, 0, random.uniform(0, PI))), mat(random.choice(sc), .4))
p.build()

p = Part("deco_lolli")
p.add(xf(cyl(.07, .07, 2.2, 10), (0, 0, -1.1)), mat("#ffffff", .3))
dz = lathe([(.001, -.22), (.9, -.2), (1.1, -.08), (1.15, 0), (1.1, .08), (.9, .2), (.001, .22)], 56)
p.add(xf(dz, (0, 0, .2), (PI / 2, 0, 0)), swirl, sharp=0)
p.build()

p = Part("deco_cupcake"); wr = mat("#ffffff", .5)
cup = lathe([(.001, -1), (.6, -1), (.85, 0), (.88, .02), (.001, .02)], 24)
p.add(cup, lambda f: wr if int((math.atan2(cen(f).y, cen(f).x) + PI) / (2 * PI) * 24) % 2 else mat("#ffd8ea", .5))
fro = [(.001, 1.1)]
for i in range(16):
    t = i / 15; fro.append((max(.02, .95 * (1 - t) ** .7), .02 + t * 1.05 + .08 * math.sin(t * PI * 4)))
fro.append((.001, 1.12))
fr = lathe(list(reversed(fro)), 40)
for vv in fr.verts:
    a = math.atan2(vv.co.y, vv.co.x); k = 1 + .08 * math.sin(a * 8 + vv.co.z * 6)
    vv.co.x *= k; vv.co.y *= k
p.add(fr, TINT)
p.add(xf(sphere(.2, 16, 12), (0, 0, 1.25)), mat("#e8203a", .2))
p.add(tube([Vector((0, 0, 1.4)), Vector((.08, 0, 1.6)), Vector((.18, 0, 1.68))], [.025] * 3, 6), mat("#3a8a3a", .6))
p.build()

p = Part("deco_gumdrop")
gd = lathe([(.001, -.8), (1.0, -.8), (1.05, -.7), (.95, -.1), (.7, .45), (.35, .72), (.001, .78)], 40)
for vv in gd.verts: vv.co += Vector((random.uniform(-.006, .006), random.uniform(-.006, .006), 0))
p.add(gd, TINT)
for k in range(30):
    a = random.uniform(0, 2 * PI); z = random.uniform(-.7, .6); r = .98 - (z + .1) * .45 if z > -.1 else 1.0
    p.add(xf(cyl(.05, .05, .02, 5), (math.cos(a) * r, math.sin(a) * r, z), (PI / 2, 0, a + PI / 2)), mat("#ffffff", .3, a=.85), smooth=False)
p.build()

p = Part("deco_candy"); wh = mat("#ffffff", .3)
c = sphere(1, 32, 20); xf(c, (0, 0, 0), (0, 0, 0), (1.0, .75, .75))
p.add(c, lambda f: TINT if int((cen(f).x + 2) * 3.2) % 2 else wh)
for sd in (-1, 1):
    w = lathe([(.001, 0), (.25, .05), (.55, .55), (.62, .62), (.001, .58)], 24)
    for vv in w.verts:
        a = math.atan2(vv.co.y, vv.co.x); k = 1 + .18 * math.sin(a * 6) * vv.co.z
        vv.co.x *= k; vv.co.y *= k
    p.add(xf(w, (sd * .9, 0, 0), (0, sd * PI / 2, 0)), TINT)
p.build()

p = Part("deco_cone")
cone = lathe([(.001, -1.6), (.62, 0), (.65, .05), (.001, .05)], 32)
p.add(cone, lambda f: mat("#c8843a", .7) if (int((math.atan2(cen(f).y, cen(f).x) + PI) * 3) + int(cen(f).z * 5)) % 2 else mat("#e8a860", .7))
for (z, r, m) in [(.35, .68, TINT), (.95, .58, mat("#fff6ea", .5))]:
    s = sphere(r, 32, 20)
    for vv in s.verts:
        if vv.co.z < -r * .3: vv.co.z = -r * .3 + .08 * math.sin(math.atan2(vv.co.y, vv.co.x) * 9)
    p.add(xf(s, (0, 0, z)), m)
p.add(xf(sphere(.13, 14, 10), (0, 0, 1.55)), mat("#e8203a", .2))
p.build()

p = Part("deco_star")
st = extrude_shape(star2d(1.2, .55), .45)
for vv in st.verts:
    r = math.hypot(vv.co.x, vv.co.z); vv.co.y *= max(.35, 1 - r * .45)
p.add(st, TINT, sharp=50)
p.add(xf(extrude_shape(star2d(.9, .41), .02), (0, -.12, 0)), mat("#ffffff", .3, 0, "#ffffff", .2), smooth=False)
p.build()

# ---------- King of the Hill crown ----------
p = Part("crown"); G = mat("#ffd23a", .25, .6, "#a87000", .7)
p.add(lathe([(.3, -.13), (.34, -.13), (.35, -.05), (.34, .1), (.31, .1), (.3, 0)], 48), G)
for k in range(5):
    a = k / 5 * 2 * PI
    p.add(xf(cyl(.075, .005, .24, 10), (math.cos(a) * .325, math.sin(a) * .325, .22)), G)
    p.add(xf(sphere(.04, 10, 8), (math.cos(a) * .325, math.sin(a) * .325, .34)), mat("#ffffff", .1, .3))
for k in range(5):
    a = (k + .5) / 5 * 2 * PI
    p.add(xf(ico(.05, 1), (math.cos(a) * .355, math.sin(a) * .355, -.03)), mat(["#e83a3a", "#3a8aff", "#3ad87a", "#e83a3a", "#9a5aff"][k], .05, .1, None), smooth=False)
p.build()

# ---------- coin, egg, dodgeball ----------
p = Part("coin"); G = mat("#ffd23a", .25, .6, "#a87000", .7)
p.add(xf(lathe([(.001, -.04), (.3, -.04), (.32, -.02), (.32, .02), (.3, .04), (.001, .04)], 40), (0, 0, 0), (PI / 2, 0, 0)), G)
for sd in (-1, 1):
    p.add(xf(extrude_shape(star2d(.17, .075), .03), (0, sd * .04, 0)), mat("#fff0a0", .25, .6, "#c89000", .7), smooth=False)
p.build()

p = Part("egg")
eg = lathe([(.001, -.3), (.2, -.27), (.3, -.12), (.3, .02), (.24, .2), (.13, .32), (.001, .36)], 28)
p.add(eg, mat("#fff6ea", .35))
for k in range(9):
    a = random.uniform(0, 2 * PI); z = random.uniform(-.15, .22); r = .3 - max(0, z) * .45
    p.add(xf(sphere(1, 10, 8), (math.cos(a) * r, math.sin(a) * r, z), (0, 0, a), (.012, .05, .04)), mat(random.choice(["#ff7ab8", "#3ad8ff", "#ffd23a", "#9a6aff"]), .5))
p.build()

p = Part("ball_dodge")
db = sphere(.32, 32, 20)
p.add(db, lambda f: mat("#1a1a22", .6) if min(abs(cen(f).z), abs(cen(f).x)) < .03 else TINT, sharp=0)
p.build()

# ---------- icing drips: a collar that hugs the top edge of a round platform of radius 1 (top at z=0) ----------
p = Part("drip")
ring = []
N = 120; DR = []
for i in range(N):
    a = i / N * 2 * PI
    d = .05 + .04 * math.sin(a * 5)
    for j in range(9):
        c = (j + .5) / 9 * 2 * PI
        d += max(0, math.cos((a - c + PI) % (2 * PI) - PI) ** 300) * (.25 + .2 * math.sin(j * 2.3))
    DR.append(d)
prof_bm = bmesh.new()
rows = []
for i in range(N):
    a = i / N * 2 * PI; ca, sa = math.cos(a), math.sin(a); d = DR[i]
    pts = [(1.0, .02), (1.025, .015), (1.04, -.02), (1.04, -d + .02), (1.02, -d - .01), (1.0, -d)]
    rows.append([prof_bm.verts.new((r * ca, r * sa, z)) for (r, z) in pts])
for i in range(N):
    A, B = rows[i], rows[(i + 1) % N]
    for k in range(len(A) - 1): prof_bm.faces.new((A[k], B[k], B[k + 1], A[k + 1]))
bmesh.ops.recalc_face_normals(prof_bm, faces=prof_bm.faces)
p.add(prof_bm, TINT, sharp=0)
for j in range(9):
    c = (j + .5) / 9 * 2 * PI; d = .05 + .04 * math.sin(c * 5) + .25 + .2 * math.sin(j * 2.3)
    p.add(xf(sphere(1, 12, 8), (math.cos(c) * 1.03, math.sin(c) * 1.03, -d + .01), (0, 0, c), (.022, .03, .035)), TINT)
p.build()

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "props.glb")
os.makedirs(os.path.dirname(out), exist_ok=True); export(out)
print("OK", os.path.getsize(out))
