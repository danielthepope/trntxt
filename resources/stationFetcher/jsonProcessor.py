#!/usr/bin/env python

import csv
import json
import re

CRS_RE = re.compile(r'[A-Z]{3}')


class Station(dict):
    def __init__(self, code, name) -> None:
        self['stationCode'] = code
        self['stationName'] = name

    def __hash__(self) -> int:
        return hash((self['stationCode'], self['stationName']))

    def __eq__(self, __o: object) -> bool:
        return type(__o) == Station and self['stationCode'] == __o['stationCode'] and self['stationName'] == __o['stationName']

    def __repr__(self) -> str:
        return '{' + self['stationName'] + ', ' + self['stationCode'] + '}'


stations = set()

for letter in ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']:
    data = json.load(open(f'tmp/{letter}.json'))
    for station in data:
        if CRS_RE.match(station[0]) and station[10] != '':
            stations.add(Station(station[0], station[1]))

with open('stations.csv', 'w', newline='') as out_file:
    writer = csv.DictWriter(out_file, fieldnames=['stationName', 'stationCode'])
    writer.writeheader()
    sorted_stations = sorted(list(stations), key=lambda s: s['stationName'])
    writer.writerows(sorted_stations)

print('done')
