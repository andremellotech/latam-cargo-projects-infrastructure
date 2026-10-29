"""Gera data/americas-paths.json a partir do Natural Earth (dominio publico).
Requer: geopandas, shapely. Uso: python scripts/build-map.py <caminho do shapefile naturalearth_lowres.shp>
"""
import json, sys
import geopandas as gpd
from shapely.geometry import box
LON0, LON1, LAT0, LAT1, K = -95, -30, -40, 32, 10  # recorte e escala
src = sys.argv[1]
g = gpd.read_file(src)
clip = box(LON0, LAT0, LON1, LAT1)
out = []
def ring(coords):
    pts = [f"{(x-LON0)*K:.1f},{(LAT1-y)*K:.1f}" for x, y in coords]
    return "M" + "L".join(pts) + "Z"
for _, r in g.iterrows():
    geom = r.geometry.intersection(clip)
    if geom.is_empty: continue
    geom = geom.simplify(0.08)
    polys = [geom] if geom.geom_type == "Polygon" else [p for p in getattr(geom, "geoms", []) if p.geom_type == "Polygon"]
    d = "".join(ring(p.exterior.coords) for p in polys if not p.is_empty)
    if d: out.append({"name": r.get("name") or r.get("NAME"), "iso": r.get("iso_a3") or r.get("ISO_A3"), "d": d})
json.dump({"viewBox": [0, 0, (LON1-LON0)*K, (LAT1-LAT0)*-K if False else (LAT1-LAT0)*K], "lon0": LON0, "lat1": LAT1, "k": K,
           "source": "Natural Earth (dominio publico)", "countries": out}, open("data/americas-paths.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(len(out), "paises")
