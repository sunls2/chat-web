#!/usr/bin/env bash

set -e

rm -rf build/*  && npm run build

sudo rm -rf /var/www/chat/* && sudo cp -r build/* /var/www/chat/