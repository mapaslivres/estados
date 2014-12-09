# Brazilian States

Data about Brazilian federatives units.

## Download data

Choose a format:

* CSV
* TopoJSON

You can transform this data to shapefile or GeoJSON in geojson.io accessing this link.

## Updating data

Raw data is downloaded from OpenStreetMap using a Overpass query:

```
[out:json];
area[boundary=administrative][name="Brasil"];
(
  rel
  ["boundary"="administrative"]
  ["admin_level"="4"]
  ({{bbox}});
);
(._;>;);
out qt;
```  
