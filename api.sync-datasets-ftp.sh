#!/bin/bash
# docker run -v $PWD:/sdk/ -v /:/data --env MAPIC_DOMAIN -it node:4 node /sdk/lib/sync-ftp-datasets.js $1
docker run -v $PWD:/sdk/ --rm --env MAPIC_DOMAIN -it node:4 node /sdk/lib/sync-ftp-datasets.js $1