#!/bin/bash
docker run -v $PWD:/sdk/ -v /:/data -w /sdk/ --env MAPIC_DOMAIN -it node:4 node /sdk/lib/upload-deformation-raster-series.js $1