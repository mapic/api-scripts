#!/bin/bash

function edit_config() {
    read -p "Opening config in your default editor. Press [enter] to continue..."
    cp config/config.template.json config/config.json
    nano config/config.json
}

function check_auth() {
    echo "Authenticating..."
    cat config.json
    AUTHENTICATED=$(docker run -v $PWD:/sdk/ --env MAPIC_DOMAIN -it node:4 node /sdk/lib/verify-config.js)
    if [[ $AUTHENTICATED == *"1"* ]]
    then
        echo "Successfully authenticated! You're now ready to use the Mapic API."
    else
        echo "Authentication failed! Please revise your config."
        edit_config
    fi
}


echo "Installing dependencies"
docker run -v $PWD:/sdk/ --env MAPIC_DOMAIN -w /sdk/ -it node:4 npm --loglevel=silent install 

if [ ! -f config/config.json ]; then
    echo "Copying config template"
    edit_config
fi

unlink config.json
ln -s config/config.json config.json

check_auth