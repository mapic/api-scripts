#!/bin/bash
docker run -v $PWD:/sdk/ -v /:/data --env MAPIC_DOMAIN -it node:4 node /sdk/lib/replace-datasets-in-cube.js $1