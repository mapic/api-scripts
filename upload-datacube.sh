#!/bin/bash
DATACUBE=$1
# node lib/upload_datacube.js $DATACUBE

DATAPATH=$(node lib/get-data-path.js $1)

echo $DATAPATH

docker run -v $PWD:/sdk/ -v /:/data --env MAPIC_DOMAIN -it node:4 node /sdk/lib/upload_datacube.js $DATACUBE