#!/bin/bash
docker run -v $PWD:/sdk/ -v /:/data --env MAPIC_DOMAIN -it node:4 node /sdk/lib/upload_datacube.js $1