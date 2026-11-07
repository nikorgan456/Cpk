# Builds public/models/bean.glb: the bean body, face, hands, feet and every outfit item.
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from mathutils import Vector
reset(); random.seed(7)
PI = math.pi

# --- body profile (radius, height) – same silhouette the game always had, just smoother ---
P = [(.001, 0), (.36, .02), (.48, .1), (.53, .25), (.535, .42), (.5, .65), (.42, .88), (.3, 1.07), (.15, 1.2), (.001, 1.25)]
def cr(p0, p1, p2, p3, t):
    return tuple(.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t * t + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t ** 3) for i in range(2))
SM = []
for i in range(len(P) - 1):
    for k in range(6): SM.append(cr(P[max(i - 1, 0)], P[i], P[i + 1], P[min(i + 2, len(P) - 1)], k / 6))
SM.append(P[-1])
OFF = .08
def R(z):
    z -= OFF
    for i in range(len(SM) - 1):
        if SM[i][1] <= z <= SM[i + 1][1]:
            t = (z - SM[i][1]) / max(1e-6, SM[i + 1][1] - SM[i][1]); return SM[i][0] + (SM[i + 1][0] - SM[i][0]) * t
    return .001
def onbody(x, z, out=0.):
    """Point on the front of the body at side offset x and height z, pushed out by `out`. Returns (pos, yaw)."""
    r = R(z); y = -math.sqrt(max(0, r * r - x * x)); n = Vector((x, y, 0)).normalized()
    return Vector((x, y, z)) + n * out, math.atan2(x, -y)

# ---------------- body ----------------
b = lathe([(r, z + OFF) for (r, z) in SM], seg=48)
# a little tummy bulge at the front
for vv in b.verts:
    f = max(0, -vv.co.y / max(.01, math.hypot(vv.co.x, vv.co.y))) ** 2 * math.exp(-((vv.co.z - .45) / .28) ** 2)
    vv.co.y -= .025 * f
Part("body").add(b, mat("TINT")).build()

TINT = mat("TINT")
W = mat("#ffffff", .12); K = mat("#1a1030", .15); PINK = mat("#ff7aa8", .6)
# ---------------- face: eyes + mouth + cheeks (hidden by the visor) ----------------
face = Part("face")
for sd in (-1, 1):
    pos, yaw = onbody(sd * .165, .86, -.035)
    face.add(xf(sphere(1, 24, 16), pos, (0, 0, yaw), (.135, .09, .175)), W)
    pp, _ = onbody(sd * .158, .84, .035)
    face.add(xf(sphere(1, 16, 12), pp, (0, 0, yaw), (.072, .03, .095)), K)
    hp, _ = onbody(sd * .14 + .03, .885, .06)
    face.add(xf(sphere(1, 10, 8), hp, (0, 0, yaw), (.026, .012, .03)), mat("#ffffff", .3, 0, "#ffffff", 1))
    cp, _ = onbody(sd * .3, .67, -.01)
    face.add(xf(sphere(1, 14, 10), cp, (0, 0, onbody(sd * .3, .67)[1]), (.075, .02, .045)), PINK)
mp, _ = onbody(0, .675, -.005)
face.add(xf(torus(.1, .03, 20, 10, PI), mp + Vector((0, -.012, .03)), (PI / 2, PI, 0)), K)
face.build()

# ---------------- hands & feet (centred on their own origin; the game places & swings them) ----------------
Part("hand").add(xf(sphere(1, 16, 12), (0, 0, 0), (0, 0, 0), (.09, .1, .12)), TINT).build()
foot = Part("foot")
foot.add(bend(xf(sphere(1, 20, 12), (0, 0, 0), (0, 0, 0), (.15, .2, .09)), lambda c: (c.x, c.y, max(c.z, -.035) + (.0 if c.z > -.035 else 0))), TINT)
foot.build()

# ---------------- outfit items ----------------
HT = 1.33   # top of the head
def item(n): return Part(n)

def dome(p, col, cz=1.04, rr=.45, sz=.78, seg=40):
    p.add(xf(lathe([(rr * math.cos(a), rr * math.sin(a)) for a in [i / 12 * PI / 2 for i in range(13)]], seg), (0, 0, cz), (0, 0, 0), (1, 1, sz)), col)

# cap
p = item("hat_cap"); red = mat("#e83a3a", .55); dred = mat("#b81e1e", .55)
dome(p, red)
p.add(bend(xf(roundbox(.5, .42, .035, .015), (0, -.43, 1.07), (-.12, 0, 0)), lambda c: (c.x, c.y, c.z - (c.x * c.x) * .35)), dred)
p.add(xf(sphere(.05, 12, 8), (0, 0, 1.39)), dred)
for k in range(6):
    a = k / 6 * 2 * PI
    p.add(tube([Vector((math.cos(a) * .452 * math.cos(t), math.sin(a) * .452 * math.cos(t), 1.04 + .352 * math.sin(t))) for t in [i / 10 * PI / 2 for i in range(11)]], [.008] * 11, 6), dred)
p.build()

# beanie
p = item("hat_beanie"); bl = mat("#3a8aff", .8); dbl = mat("#2a6ad8", .8)
dome(p, bl, 1.03, .46, 1.0)
rib = lathe([(.475, .96), (.49, 1.0), (.49, 1.08), (.475, 1.12)], 48)
p.add(rib, lambda f: dbl if int((math.atan2(f.calc_center_median().y, f.calc_center_median().x) + PI) / (2 * PI) * 24) % 2 else bl)
pom = ico(.11, 3)
for vv in pom.verts: vv.co *= 1 + random.uniform(-.12, .12)
p.add(xf(pom, (0, 0, 1.5)), mat("#ffffff", .95))
p.build()

# party hat
p = item("hat_party"); pk = mat("#ff4ab8", .4); yl = mat("#ffe23a", .4)
cone = lathe([(.2 * (1 - i / 16), 1.2 + .58 * i / 16) for i in range(17)], 32)
p.add(cone, lambda f: yl if int((f.calc_center_median().z - 1.2) / .58 * 6) % 2 else pk)
p.add(xf(ico(.075, 2), (0, 0, 1.8)), yl)
p.build()

# crown
p = item("hat_crown"); G = mat("#ffd23a", .25, .6, "#a87000", .6)
p.add(lathe([(.29, 1.14), (.32, 1.14), (.33, 1.2), (.32, 1.32), (.3, 1.32), (.29, 1.2)], 48), G)
for k in range(5):
    a = k / 5 * 2 * PI - PI / 2
    p.add(xf(cyl(.07, .005, .2, 10), (math.cos(a) * .305, math.sin(a) * .305, 1.42)), G)
    p.add(xf(sphere(.035, 10, 8), (math.cos(a) * .305, math.sin(a) * .305, 1.52)), G)
for (a, c) in [(-PI / 2, "#e83a3a"), (-PI / 2 + 1.0, "#3a8aff"), (-PI / 2 - 1.0, "#3ad87a")]:
    p.add(xf(ico(.05, 1), (math.cos(a) * .33, math.sin(a) * .33, 1.24), (0, 0, 0), (1, .6, 1)), mat(c, .05, .1, c, .3), smooth=False)
p.build()

# top hat
p = item("hat_tophat"); blk = mat("#1a1a24", .35); rd = mat("#e83a3a", .5)
p.add(lathe([(.25, 1.14), (.4, 1.14), (.46, 1.18), (.45, 1.19), (.38, 1.165), (.25, 1.17)], 48), blk)
p.add(lathe([(.23, 1.16), (.24, 1.3), (.255, 1.62), (.001, 1.62)], 40), blk)
p.add(lathe([(.245, 1.18), (.25, 1.27)], 40, close=False), rd)
p.build()

# cowboy hat
p = item("hat_cowboy"); br = mat("#a8722a", .7); dbr = mat("#5a3a1a", .6)
brim = lathe([(.22, 1.14), (.45, 1.14), (.62, 1.16), (.65, 1.19), (.6, 1.17), (.22, 1.165)], 56)
p.add(bend(brim, lambda c: (c.x, c.y, c.z + .16 * (c.x / .65) ** 2 * (1 if abs(c.x) > .3 else (abs(c.x) / .3) ** 2))), br)
crown = lathe([(.27, 1.15), (.28, 1.3), (.25, 1.44), (.12, 1.47), (.001, 1.44)], 40)
p.add(bend(crown, lambda c: (c.x, c.y, c.z - .06 * math.exp(-(c.x / .1) ** 2) * max(0, (c.z - 1.38) / .09))), br)
p.add(lathe([(.282, 1.17), (.287, 1.24)], 40), dbr)
p.build()

# viking helmet
p = item("hat_viking"); st = mat("#a8b4c4", .3, .7); iv = mat("#fff4dc", .5); gd = mat("#c8a040", .3, .8)
dome(p, st, 1.02, .46, .82)
p.add(lathe([(.47, .99), (.49, 1.02), (.49, 1.08), (.47, 1.1)], 48), gd)
p.add(lathe([(.03, 1.02), (.04, 1.1), (.035, 1.3), (.001, 1.42)], 12, ), gd) if False else None
for k in range(12):
    a = k / 12 * 2 * PI; p.add(xf(sphere(.022, 8, 6), (math.cos(a) * .495, math.sin(a) * .495, 1.05)), gd)
for sd in (-1, 1):
    pts = [Vector((sd * (.4 + .3 * math.sin(t * 1.4)), .0, 1.18 + .45 * t * t - .05 * t)) for t in [i / 14 for i in range(15)]]
    p.add(tube(pts, [.1 * (1 - i / 14) ** .8 + .002 for i in range(15)], 14), iv)
p.build()

# chef hat
p = item("hat_chef"); wh = mat("#ffffff", .85)
p.add(lathe([(.3, 1.13), (.31, 1.36), (.3, 1.37)], 40), wh)
for (x, y, z, r) in [(0, 0, 1.55, .26), (.19, 0, 1.48, .2), (-.19, 0, 1.48, .2), (0, .19, 1.48, .2), (0, -.19, 1.48, .2)]:
    p.add(xf(sphere(r, 24, 16), (x, y, z), (0, 0, 0), (1, 1, .85)), wh)
p.build()

# halo
p = item("hat_halo"); p.add(xf(torus(.28, .045, 40, 12), (0, 0, 1.58), (.15, 0, 0)), mat("#ffe23a", .2, .3, "#ffc000", 1.5)); p.build()

# bunny ears
p = item("hat_bunny"); wh = mat("#ffffff", .7); pk2 = mat("#ffb8d8", .6)
p.add(lathe([(.3, 1.12), (.32, 1.15), (.3, 1.18)], 40), mat("#ff7ab8", .5))
for sd in (-1, 1):
    p.add(xf(sphere(1, 20, 14), (sd * .16, 0, 1.5), (0, sd * -.18, 0), (.1, .06, .33)), wh)
    p.add(xf(sphere(1, 16, 12), (sd * .16 + sd * .005, -.035, 1.52), (0, sd * -.18, 0), (.055, .03, .24)), pk2)
p.build()

# frog hat
p = item("hat_frog"); gr = mat("#5ad85a", .6); dgr = mat("#3aa83a", .6)
dome(p, gr, 1.03, .46, .82)
for sd in (-1, 1):
    p.add(xf(sphere(.14, 20, 14), (sd * .19, -.12, 1.36)), gr)
    p.add(xf(sphere(.085, 16, 12), (sd * .2, -.21, 1.39)), mat("#ffffff", .15))
    p.add(xf(sphere(.045, 12, 8), (sd * .2, -.275, 1.39)), mat("#111111", .15))
p.add(xf(torus(.2, .018, 24, 8, PI), (0, -.43, 1.12), (PI / 2, PI, 0), (1, 1, .5)), dgr)
p.build()

# propeller cap (blades are a separate node named "prop" so the game can spin them)
p = item("hat_propeller"); cols = [mat("#e83a3a", .5), mat("#ffe23a", .5), mat("#3a8aff", .5), mat("#3ad87a", .5)]
d = lathe([(.45 * math.cos(a), .45 * math.sin(a)) for a in [i / 12 * PI / 2 for i in range(13)]], 48); xf(d, (0, 0, 1.04), (0, 0, 0), (1, 1, .78))
p.add(d, lambda f: cols[int((math.atan2(f.calc_center_median().y, f.calc_center_median().x) + PI) / (2 * PI) * 8) % 4])
p.add(xf(cyl(.018, .018, .12, 8), (0, 0, 1.44)), mat("#888888", .3, .8))
p.add(xf(sphere(.035, 10, 8), (0, 0, 1.5)), mat("#e83a3a", .4))
ob = p.build()
pr = Part("prop", ob, (0, 0, 1.5))
for sd in (-1, 1):
    pr.add(xf(roundbox(.34, .085, .02, .01), (sd * .19, 0, 1.5), (sd * .25, 0, 0)), mat("#3ad8ff", .4))
pr.build()

# flower crown
p = item("hat_s1_flower"); p.add(xf(torus(.31, .025, 40, 8), (0, 0, 1.17)), mat("#5ab84a", .6))
fc = ["#ff7ab8", "#ffffff", "#ffd23a", "#c79aff", "#ff8a6a", "#ff7ab8", "#ffd23a", "#c79aff"]
for k in range(8):
    a = k / 8 * 2 * PI - PI / 2; c = Vector((math.cos(a) * .31, math.sin(a) * .31, 1.19))
    for j in range(5):
        b2 = j / 5 * 2 * PI
        p.add(xf(sphere(1, 7, 5), c + Vector((math.cos(a) * math.cos(b2) * .05, math.sin(a) * math.cos(b2) * .05, math.sin(b2) * .05)), (0, 0, a), (.02, .045, .045)), mat(fc[k], .5))
    p.add(xf(sphere(.025, 8, 6), c + Vector((math.cos(a) * .02, math.sin(a) * .02, 0))), mat("#ffb02a", .5))
p.build()

# pirate hat (tricorne)
p = item("hat_s1_pirate"); blk = mat("#1a1a24", .5); gd = mat("#ffd23a", .3, .8)
p.add(lathe([(.33, 1.12), (.32, 1.3), (.22, 1.42), (.001, 1.45)], 40), blk)
tri = lathe([(.3, 1.13), (.56, 1.13), (.57, 1.16), (.3, 1.16)], 60)
def tric(c):
    a = math.atan2(c.y, c.x); r = math.hypot(c.x, c.y); up = max(0, (r - .3) / .27) * (.5 + .5 * math.cos(3 * (a + PI / 2)))
    return (c.x, c.y, c.z + up * .26)
p.add(bend(tri, tric), blk)
p.add(bend(lathe([(.565, 1.15), (.575, 1.165)], 60), tric), gd)
p.add(xf(sphere(1, 16, 12), (0, -.33, 1.3), (0, 0, 0), (.075, .03, .065)), mat("#ffffff", .5))
for sd in (-1, 1):
    p.add(xf(sphere(.018, 8, 6), (sd * .028, -.362, 1.305)), blk)
    p.add(xf(roundbox(.17, .02, .022, .01), (0, -.345, 1.21), (0, sd * .6, 0)), mat("#ffffff", .5))
p.build()

# dragon horns
p = item("hat_s1_horns"); org = mat("#ff8a2a", .4); yl2 = mat("#ffd23a", .4)
for sd in (-1, 1):
    pts = [Vector((sd * (.2 + .18 * t), .06 + .12 * t * t, 1.18 + .42 * t - .08 * t * t)) for t in [i / 12 for i in range(13)]]
    p.add(tube(pts, [.08 * (1 - i / 12) + .002 for i in range(13)], 12), org)
for k in range(4):
    z = 1.32 - k * .1; y = -.05 + k * .14
    p.add(xf(cyl(.05, .002, .14, 6), (0, y, z + .06), (-.4 - k * .25, 0, 0)), yl2)
p.build()

# space helmet (glass + collar)
p = item("hat_s1_astro")
p.add(xf(sphere(.68, 40, 28), (0, 0, .82)), mat("#cfeaff", .04, .1, a=.22, name="glass"))
p.add(xf(torus(.52, .07, 48, 12), (0, 0, .32)), mat("#e8eef8", .3, .4))
p.add(xf(cyl(.015, .015, .18, 8), (.25, .1, 1.5)), mat("#b8c0d0", .3, .8))
p.add(xf(sphere(.045, 10, 8), (.25, .1, 1.6)), mat("#ff4a5a", .3, 0, "#ff2a3a", 1))
p.build()

# wizard hat (bent cone)
p = item("hat_s1_wizard"); pu = mat("#5a2ad8", .55); gd = mat("#ffd23a", .3, .7)
p.add(lathe([(.25, 1.13), (.52, 1.13), (.54, 1.15), (.5, 1.155), (.25, 1.16)], 56), pu)
pts = [Vector((0, .1 * t ** 2.2 * 2.2, 1.14 + .75 * t - .12 * t ** 3)) for t in [i / 16 for i in range(17)]]
p.add(tube(pts, [.27 * (1 - i / 16) ** 1.1 + .002 for i in range(17)], 24), pu)
p.add(lathe([(.268, 1.17), (.258, 1.24)], 40), gd)
for (x, z, s) in [(.08, 1.42, .07), (-.1, 1.32, .045), (.05, 1.6, .035)]:
    pp, yaw = Vector((x, -.21 + (z - 1.3) * .2, z)), 0
    p.add(xf(extrude_shape(star2d(s, s * .45), .02), pp, (0, 0, 0)), mat("#ffe23a", .3, .2, "#ffc000", .6), smooth=False)
p.build()

# ---- face items ----
def lens_pos(sd, out=.06): return onbody(sd * .165, .86, out)
p = item("face_shades"); blk = mat("#111118", .08, .3)
for sd in (-1, 1):
    pos, yaw = lens_pos(sd, .075)
    p.add(xf(roundbox(.25, .045, .17, .05), pos, (0, 0, yaw)), blk)
p.add(xf(roundbox(.1, .03, .03, .012), onbody(0, .88, .1)[0]), blk)
for sd in (-1, 1):
    p.add(tube([onbody(sd * .29, .88, .05)[0], Vector((sd * .45, -.1, .88)), Vector((sd * .46, .15, .86))], [.015] * 3, 6), blk)
p.build()

p = item("face_nerd"); fr = mat("#3a2a1a", .4); gl = mat("#dff4ff", .05, 0, a=.25, name="lens")
for sd in (-1, 1):
    pos, yaw = lens_pos(sd, .075)
    p.add(xf(torus(.135, .025, 28, 8), pos, (PI / 2, 0, yaw)), fr)
    p.add(xf(cyl(.13, .13, .01, 28), pos, (PI / 2, 0, yaw)), gl)
p.add(xf(torus(.05, .018, 12, 6, PI), onbody(0, .88, .1)[0], (PI / 2, 0, 0)), fr)
for sd in (-1, 1):
    p.add(tube([onbody(sd * .3, .88, .05)[0], Vector((sd * .45, -.1, .88)), Vector((sd * .46, .15, .86))], [.018] * 3, 6), fr)
p.build()

p = item("face_monocle"); gd = mat("#d8a020", .25, .9)
pos, yaw = lens_pos(1, .075)
p.add(xf(torus(.14, .022, 28, 8), pos, (PI / 2, 0, yaw)), gd)
p.add(xf(cyl(.135, .135, .008, 28), pos, (PI / 2, 0, yaw)), mat("#dff4ff", .05, 0, a=.25, name="lens"))
chain = [pos + Vector((.12, 0, -.1)), onbody(.32, .62, .04)[0], onbody(.25, .45, .04)[0]]
p.add(tube(chain, [.008] * 3, 6), gd)
p.build()

p = item("face_visor")
v = lathe([(.475, .76), (.485, .8), (.485, .92), (.475, .96)], 40, a0=-PI / 2 - 1.15, a1=-PI / 2 + 1.15)
p.add(v, mat("#2affd8", .08, .2, "#1abfa8", 1.2))
p.add(lathe([(.47, .955), (.49, .965)], 40, a0=-PI / 2 - 1.15, a1=-PI / 2 + 1.15), mat("#1a6a6a", .3, .6))
p.add(lathe([(.47, .755), (.49, .765)], 40, a0=-PI / 2 - 1.15, a1=-PI / 2 + 1.15), mat("#1a6a6a", .3, .6))
p.add(lathe([(.49, .83), (.495, .87)], 20, a0=-PI / 2 - .7, a1=-PI / 2 - .2), mat("#ffffff", .1, 0, "#ffffff", 1.5))
p.build()

p = item("face_mask"); nv = mat("#2a2aa8", .5)
band = lathe([(.462, .76), (.478, .78), (.478, .94), (.462, .96)], 64)
p.add(band, nv)
for sd in (-1, 1):
    p.add(tube([Vector((sd * .05, .45, .86)), Vector((sd * .14, .62, .8)), Vector((sd * .2, .72, .68))], [.035, .03, .012], 8), nv)
p.build()

p = item("face_s1_star")
for sd in (-1, 1):
    pos, yaw = lens_pos(sd, .08)
    p.add(xf(extrude_shape(star2d(.16, .075), .035), pos, (0, 0, yaw)), mat("#ff4ab8", .25, .1), smooth=False)
p.add(xf(roundbox(.1, .03, .03, .012), onbody(0, .88, .1)[0]), mat("#a01a6a", .3))
p.build()

p = item("face_s1_heart")
for sd in (-1, 1):
    pos, yaw = lens_pos(sd, .08)
    p.add(xf(extrude_shape(heart2d(.15), .035), pos, (0, 0, yaw)), mat("#ff2a5a", .25, .1), smooth=False)
p.add(xf(roundbox(.1, .03, .03, .012), onbody(0, .9, .1)[0]), mat("#a0103a", .3))
p.build()

p = item("face_s1_goggles")
p.add(lathe([(.47, .79), (.49, .8), (.49, .92), (.47, .93)], 48), mat("#2a2a3a", .7))
g = lathe([(.48, .75), (.53, .76), (.55, .86), (.53, .96), (.48, .97)], 32, a0=-PI / 2 - .85, a1=-PI / 2 + .85)
gc = [mat("#ffb02a", .05, .5), mat("#ff4a8a", .05, .5), mat("#9a4aff", .05, .5)]
p.add(g, lambda f: gc[min(2, int((math.atan2(f.calc_center_median().y, f.calc_center_median().x) + PI / 2 + .85) / 1.7 * 3))])
for zz in (.75, .97): p.add(lathe([(.49, zz - .012), (.535, zz - .012), (.54, zz), (.535, zz + .012), (.49, zz + .012)], 32, a0=-PI / 2 - .87, a1=-PI / 2 + .87), mat("#ffffff", .4))
p.build()

# ---- neck items ----
p = item("neck_scarf"); rd = mat("#e83a3a", .85); wh = mat("#ffffff", .85)
sc = torus(.555, .085, 48, 12)
p.add(xf(sc, (0, 0, .52)), lambda f: wh if int((math.atan2(f.calc_center_median().y, f.calc_center_median().x) + PI) / (2 * PI) * 16) % 4 == 0 else rd)
tail = roundbox(.16, .05, .34, .03)
p.add(xf(tail, onbody(.22, .38, .07)[0], (.08, 0, .35)), rd)
p.add(xf(roundbox(.16, .052, .04, .015), onbody(.22, .28, .075)[0], (.08, 0, .35)), wh)
p.build()

p = item("neck_bowtie"); bt = mat("#e83a6a", .4); dbt = mat("#a01a40", .4)
c, yaw = onbody(0, .52, .04)
for sd in (-1, 1):
    w = xf(lathe([(.001, 0), (.05, .02), (.07, .08), (.065, .13), (.001, .15)], 16), (0, 0, 0), (0, sd * PI / 2, 0), (1, .7, 1))
    p.add(xf(w, c), bt)
p.add(xf(sphere(.04, 12, 8), c + Vector((0, -.02, 0))), dbt)
p.build()

p = item("neck_cape"); rc = mat("#d82a4a", .65, 0)
cl = Part("cloth", None, (0, .5, .63))
cape = roundbox(.95, .03, .82, .012, 8)
def capef(c):
    t = (.41 - c.z) / .82; return (c.x * (.85 + .3 * t), c.y + .1 * (c.x / .5) ** 2 - .02 + .03 * math.sin(c.x * 12) * t, c.z)
cl.add(xf(bend(cape, capef), (0, .5, .22)), rc)
p.add(xf(sphere(.05, 10, 8), onbody(-.3, .6, .03)[0]), mat("#ffd23a", .3, .8))
p.add(xf(sphere(.05, 10, 8), onbody(.3, .6, .03)[0]), mat("#ffd23a", .3, .8))
p.add(xf(torus(.5, .03, 40, 8, PI), (0, 0, .62), (0, 0, 0)), rc)
ob = p.build(); cl.parent = ob; cl.build()

p = item("neck_wings"); wh = mat("#ffffff", .6); bl2 = mat("#e8f0ff", .6)
for sd in (-1, 1):
    for k in range(5):
        L = .55 - k * .08; a = .3 + k * .28
        p.add(xf(sphere(1, 14, 10), (sd * (.25 + L * .45 * math.cos(a)), .48, .72 + L * .45 * math.sin(a) - .1), (0, sd * -(a - .2), 0), (L * .5, .035, .09)), wh if k % 2 == 0 else bl2)
p.build()

p = item("neck_backpack"); org = mat("#ff8a2a", .6); dor = mat("#c05a10", .6)
p.add(xf(roundbox(.44, .24, .5, .08), (0, .6, .5)), org)
p.add(xf(roundbox(.32, .07, .2, .05), (0, .73, .4)), dor)
p.add(xf(roundbox(.3, .25, .06, .03), (0, .6, .77)), dor)
for sd in (-1, 1):
    p.add(tube([Vector((sd * .17, .5, .74)), onbody(sd * .2, .78, .02)[0], onbody(sd * .22, .5, .03)[0], onbody(sd * .24, .3, .02)[0], Vector((sd * .2, .5, .28))], [.025] * 5, 6), dor)
p.build()

p = item("neck_medal"); bl3 = mat("#3a6aff", .6); gd = mat("#ffd23a", .2, .9)
for sd in (-1, 1):
    p.add(tube([onbody(sd * .35, .62, .01)[0], onbody(sd * .12, .48, .02)[0], onbody(0, .42, .03)[0]], [.03] * 3, 6), bl3)
mp, yaw = onbody(0, .36, .05)
p.add(xf(cyl(.1, .1, .03, 28), mp, (PI / 2, 0, yaw)), gd)
p.add(xf(extrude_shape(star2d(.06, .027), .02), mp + Vector((0, -.018, 0))), mat("#ffeaa0", .2, .9), smooth=False)
p.build()

p = item("neck_s1_jetpack"); mt = mat("#b8c0d0", .25, .8); dm = mat("#6a7890", .3, .8)
for sd in (-1, 1):
    p.add(xf(lathe([(.001, .3), (.1, .32), (.12, .38), (.12, .74), (.1, .8), (.001, .84)], 24), (sd * .16, .58, 0)), mt)
    p.add(xf(cyl(.06, .09, .1, 16), (sd * .16, .58, .26)), dm)
p.add(xf(roundbox(.2, .1, .3, .03), (0, .55, .58)), dm)
for sd in (-1, 1):
    p.add(tube([Vector((sd * .1, .52, .78)), onbody(sd * .25, .8, .02)[0], onbody(sd * .3, .45, .03)[0], Vector((sd * .3, .45, .3))], [.022] * 4, 6), dm)
ob = p.build()
for sd in (-1, 1):
    fl = Part("flame", ob, (sd * .16, .58, .21))
    fl.add(xf(lathe([(.001, 0), (.07, -.05), (.06, -.18), (.001, -.32)], 16), (sd * .16, .58, .21)), mat("#ffa02a", .5, 0, "#ff8000", 2.5))
    fl.build()

p = item("neck_s1_lei"); lc = ["#ff4a8a", "#ffd23a", "#ff8a3a", "#ff4ab8"]
for k in range(14):
    a = k / 14 * 2 * PI; c = Vector((math.cos(a) * .53, math.sin(a) * .53, .5 - .06 * max(0, -math.sin(a))))
    for j in range(5):
        b2 = j / 5 * 2 * PI
        p.add(xf(sphere(1, 7, 5), c + Vector((math.cos(a) * math.cos(b2) * .04, math.sin(a) * math.cos(b2) * .04, math.sin(b2) * .04)), (0, 0, a), (.025, .04, .04)), mat(lc[k % 4], .5))
    p.add(xf(sphere(.02, 8, 6), c + Vector((math.cos(a) * .025, math.sin(a) * .025, 0))), mat("#fff6c8", .5))
p.build()

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "bean.glb")
os.makedirs(os.path.dirname(out), exist_ok=True); export(out)
print("OK", os.path.getsize(out))
