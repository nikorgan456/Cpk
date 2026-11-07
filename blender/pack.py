# Converts a Blender-exported .glb into the game's small model format (.cpkm, gzipped):
#   u32 json length | json | pad to 4 | binary (quantised uint16 positions, int8 normals, uint16/uint32 indices)
import sys, json, struct, gzip, numpy as np

def srgb(c):
    c = max(0., min(1., c)); return c * 12.92 if c <= .0031308 else 1.055 * c ** (1 / 2.4) - .055

def hexc(v): return "#" + "".join(f"{int(round(srgb(x) * 255)):02x}" for x in v[:3])

def pack(src, dst):
    d = open(src, "rb").read()
    jl = struct.unpack("<I", d[12:16])[0]; J = json.loads(d[20:20 + jl])
    bo = 20 + jl; bl = struct.unpack("<I", d[bo:bo + 4])[0]; BIN = d[bo + 8:bo + 8 + bl]
    def acc(i):
        a = J["accessors"][i]; v = J["bufferViews"][a["bufferView"]]
        dt = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8}[a["componentType"]]
        n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[a["type"]]
        off = v.get("byteOffset", 0) + a.get("byteOffset", 0)
        return np.frombuffer(BIN, dtype=dt, count=a["count"] * n, offset=off).reshape(a["count"], n) if n > 1 else np.frombuffer(BIN, dtype=dt, count=a["count"], offset=off)
    mats = []
    for m in J.get("materials", []):
        pb = m.get("pbrMetallicRoughness", {}); bc = pb.get("baseColorFactor", [1, 1, 1, 1])
        e = m.get("emissiveFactor", [0, 0, 0]); es = m.get("extensions", {}).get("KHR_materials_emissive_strength", {}).get("emissiveStrength", 1)
        mats.append({"n": m["name"], "c": hexc(bc), "r": round(pb.get("roughnessFactor", 1), 3), "m": round(pb.get("metallicFactor", 1), 3),
                     "e": hexc(e) if max(e) > 0 else None, "ei": round(es, 3), "a": round(bc[3], 3) if m.get("alphaMode") == "BLEND" else 1})
    out = bytearray(); meshes = []
    def put(b):
        nonlocal out
        while len(out) % 4: out += b"\0"
        o = len(out); out += b; return o
    for me in J["meshes"]:
        prims = []
        for p in me["primitives"]:
            P = acc(p["attributes"]["POSITION"]).astype(np.float64); N = acc(p["attributes"]["NORMAL"]).astype(np.float64); I = acc(p["indices"])
            lo, hi = P.min(0), P.max(0); span = np.maximum(hi - lo, 1e-6)
            q = np.round((P - lo) / span * 65535).astype(np.uint16)
            nq = np.round(np.clip(N, -1, 1) * 127).astype(np.int8)
            nq4 = np.zeros((len(nq), 4), np.int8); nq4[:, :3] = nq
            idx = I.astype(np.uint16 if len(P) < 65536 else np.uint32)
            prims.append({"mat": p.get("material", 0), "vc": len(P), "ic": len(I), "lo": [round(x, 5) for x in lo], "hi": [round(x, 5) for x in hi],
                          "po": put(q.tobytes()), "no": put(nq4.tobytes()), "io": put(idx.tobytes()), "i32": idx.dtype == np.uint32})
        meshes.append(prims)
    nodes = []
    parent = {}
    for i, n in enumerate(J["nodes"]):
        for c in n.get("children", []): parent[c] = i
    for i, n in enumerate(J["nodes"]):
        nodes.append({"n": n["name"], "p": parent.get(i, -1), "t": n.get("translation"), "r": n.get("rotation"), "s": n.get("scale"), "m": n.get("mesh")})
    js = json.dumps({"nodes": nodes, "meshes": meshes, "mats": mats}, separators=(",", ":")).encode()
    blob = struct.pack("<I", len(js)) + js
    while len(blob) % 4: blob += b" "
    raw = blob + bytes(out)
    open(dst, "wb").write(gzip.compress(raw, 9))
    print(dst, len(raw), "->", len(gzip.compress(raw, 9)))

if __name__ == "__main__": pack(sys.argv[1], sys.argv[2])
