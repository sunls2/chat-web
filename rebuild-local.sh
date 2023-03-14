#!/usr/bin/env bash

set -e

rm -rf build/* && npm run build
tar -czvf chat-web.tar.gz -C build .