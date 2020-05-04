USER_AGENT="Mozilla/5.0 (X11; Linux x86_64; rv:71.0) Gecko/20100101 Firefox/71.0"
echo "$USER_AGENT"

mkdir -p ./dist/data

## GeoJSON
curl --compressed -o "./dist/data/vic.geo.json" -A "$USER_AGENT" "https://emergency.vic.gov.au/public/osom-geojson.json"
curl --compressed -o "./dist/data/nsw.geo.json" -A "$USER_AGENT" "https://www.rfs.nsw.gov.au/feeds/majorIncidents.json"
curl --compressed -o "./dist/data/wa.geo.json" -A "$USER_AGENT" "https://www.emergency.wa.gov.au/data/incident_FCAD.json"
curl --compressed -o "./dist/data/wa-warn.geo.json" -A "$USER_AGENT" "https://www.emergency.wa.gov.au/data/message_warnings.json"
curl --compressed -o "./dist/data/sa-warn.geo.json" -A "$USER_AGENT" -H "Origin: https://apps.geohub.sa.gov.au" "https://services.geohub.sa.gov.au/v1CFSHA/featurelayer/server/rest/services/Hosted/CFS_Warning_Points_Public/FeatureServer/0/query?f=geojson&where=public%20%3D%20%27true%27%20AND%20expiry%20%3E%20CURRENT_TIMESTAMP&returnGeometry=true&spatialRel=esriSpatialRelIntersects&outFields=*&outSR=4326&resultOffset=0&resultRecordCount=1000&geometryPrecision=6&maxAllowableOffset=20"

## Other JSON
curl --compressed -o "./dist/data/nt.json" -A "$USER_AGENT" "https://www.pfes.nt.gov.au/incidentmap/json/ntfrsincidents.json"
curl --compressed -o "./dist/data/nt-warn.json" -A "$USER_AGENT" "https://www.pfes.nt.gov.au/incidentmap/json/warnings.json"

## KML
curl --compressed -o "./dist/data/sa-cfs.kml" -A "$USER_AGENT" "http://data.eso.sa.gov.au/prod/cfs/criimson/cfs_incident_placemark.xml"
curl --compressed -o "./dist/data/sa-mfs.kml" -A "$USER_AGENT" "http://data.eso.sa.gov.au/prod/mfs/criimson/mfs_incident_placemark.xml"
curl --compressed -o "./dist/data/tas.kml" -A "$USER_AGENT" "http://www.fire.tas.gov.au/Show?pageId=bfKml&t=26306052"
curl --compressed -o "./dist/data/tas-warn.kml" -A "$USER_AGENT" "http://www.fire.tas.gov.au/Show?pageId=alertKml&t=26306052"
curl --compressed -o "./dist/data/qld.zip" -A "$USER_AGENT" "https://www.qfes.qld.gov.au/data/alerts/bushfireAlert.kmz" && cd ./dist/data && unzip qld.zip && mv doc.kml qld.kml && cd -

ls -1 ./dist/data
