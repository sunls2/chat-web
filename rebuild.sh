#!/usr/bin/env bash

set -e

WEB_DIR=/var/www/chat
[ -d ${WEB_DIR} ] || sudo mkdir -p ${WEB_DIR}

rm -rf build/* && npm run build

sudo rm -rf ${WEB_DIR}/* && sudo cp -r build/* ${WEB_DIR}/