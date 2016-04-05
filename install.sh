#!/bin/bash

function edit_config() {
    read -p "Opening config in your default editor. Press [enter] to continue..."
    nano config.json
    check_auth
}

function check_auth() {
    AUTHENTICATED=$(node lib/test.js)
    if [ "$AUTHENTICATED" = true ] ; then
        echo "You're now ready to use the Systemapic API!"
    else
        echo "Authentication failed! Please revise your config."
        edit_config
    fi
}


echo "Installing dependencies"
npm install 

echo "Copying config template"
cp config.json.template config.json

# add creds to config
edit_config