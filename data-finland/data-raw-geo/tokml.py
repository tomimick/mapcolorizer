#!/usr/bin/python
# -*- coding: utf-8 -*-

# tokml.py: convert Kuntarajat2013.csv to single .kml and then convert it to
# .geojson with GeoJSON.js.
#
# Author: Tomi.Mickelsson@iki.fi
#   31.10.2013 - Created

import sys
import csv
# import xml.etree.ElementTree as ET


# increase limit
csv.field_size_limit(500000)

# inits lib
def read(fname):
#     klist = []
#     json = {"type":"FeatureCollection", "features":klist}

    dest = open("kunta.kml", "w")
    dest.write("""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">""")

    with open(fname, 'rb') as csvfile:
        spamreader = csv.reader(csvfile, delimiter=',')
        for i, row in enumerate(spamreader):
            if i == 0: continue

            print(i, row[0])
            dest.write("""  <Placemark>
    <name>%s</name>""" % row[0])
            dest.write(row[2])
            dest.write("""  </Placemark>
            """)

#             print(row[2])

#             root = ET.fromstring(row[2])
#             print root
#             for child in root.findall(":
#                 print child.tag, child.attrib

#             if i > 50: break

    dest.write("</kml>")
    dest.close()

# unit tests
if __name__ == '__main__':
    read("Kuntarajat2013.csv")

