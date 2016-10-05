#!/bin/bash

function edit_config() {
    read -p "Opening config in your default editor. Press [enter] to continue..."
    nano config/config.json
    check_auth
}

function check_auth() {
    AUTHENTICATED=$(node lib/test.js)
    if [ "$AUTHENTICATED" = true ] ; then
        echo "Successfully authenticated! You're now ready to use the Systemapic API."
    else
        echo "Authentication failed! Please revise your config."
        edit_config
    fi
}


echo "Installing dependencies"
npm --loglevel=silent install 

echo "Copying config template"
cp config/config.template.json config/config.json
unlink config.json
ln -s config/config.json config.json

# add creds to config
edit_config