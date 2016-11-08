#!/bin/bash

# DATACUBE=$1
# deprecated! todo: use docker container
# node lib/replace_datasets_in_cube.js $DATACUBE

DATACUBE=$1
DATAPATH=$(node lib/get-data-path.js $1)
docker run -v $PWD:/sdk/ -v /:/data --env MAPIC_DOMAIN -it node:4 node /sdk/lib/replace-datasets-in-cube.js $DATACUBE