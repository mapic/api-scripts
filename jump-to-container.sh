#!/bin/bash
# docker run -v $PWD:/sdk/ -v /:/data --env MAPIC_DOMAIN -it node:4 node /sdk/lib/upload_datacube.js $DATACUBE
docker run -v $PWD:/jump/ -v /:/data -w /jump/ --env MAPIC_DOMAIN -it node:4 bash