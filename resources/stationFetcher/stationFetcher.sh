#!/usr/bin/env bash

set -eu

cd $(dirname $0)
mkdir -p tmp
for LETTER in a b c d e f g h i j k l m n o p q r s t u v w x y z; do 
    curl https://stationpicker.nationalrail.co.uk/stationPicker/$LETTER -H 'Accept: */*' -H 'Referer: https://www.nationalrail.co.uk/' -H 'Origin: https://www.nationalrail.co.uk' > tmp/$LETTER.json
done
python3 jsonProcessor.py
rm -r tmp
