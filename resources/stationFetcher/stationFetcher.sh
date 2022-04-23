#!/usr/bin/env bash

set -eu

cd $(dirname $0)
mkdir tmp
for LETTER in a b c d e f g h i j k l m n o p q r s t u v w x y z; do curl https://ojp.nationalrail.co.uk/find/stationsDLRLU/$LETTER > tmp/$LETTER.json; done
python jsonProcessor.py
rm -r tmp


