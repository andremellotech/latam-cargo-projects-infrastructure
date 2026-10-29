"""Gera data/americas-paths.json a partir do Natural Earth (dominio publico).
Uso: python scripts/build-map.py <caminho/naturalearth_lowres.shp>   (requer geopandas e shapely)"""
import json, sys
import geopandas as gpd
from shapely.geometry import box
LON0, LON1, LAT0, LAT1, K = -95, -30, -40, 32, 10
g = gpd.read_file(sys.argv[1]); clip = box(LON0, LAT0, LON1, LAT1); out = []
ring = lambda cs: "M" + "L".join(f"{(x-LON0)*K:.1f},{(LAT1-y)*K:.1f}" for x, y in cs) + "Z"
for _, r in g.iterrows():
    geom = r.geometry.intersection(clip)
    if geom.is_empty: continue
    geom = geom.simplify(0.08)
    polys = [geom] if geom.geom_type == "Polygon" else [p for p in getattr(geom, "geoms", []) if p.geom_type == "Polygon"]
    d = "".join(ring(p.exterior.coords) for p in polys if not p.is_empty)
    if d: out.append({"name": r.get("name") or r.get("NAME"), "iso": r.get("iso_a3") or r.get("ISO_A3"), "d": d})
json.dump({"viewBox": [0, 0, (LON1-LON0)*K, (LAT1-LAT0)*K], "lon0": LON0, "lat1": LAT1, "k": K,
           "source": "Natural Earth (dominio publico)", "countries": out}, open("data/americas-paths.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(len(out), "paises")
