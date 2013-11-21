#!/usr/bin/python
# -*- coding: utf-8 -*-

# conv.py: convert data from various raw formats to .json
#
# Author: Tomi.Mickelsson@iki.fi
#   07.11.2013 - Created

import sys
import json


# creates a sample .json file to be filled with data
def create_codes(writefile=False):
    lines = open("kuntakoodit.txt").readlines()

    obj = {}

    for mun in lines:
        if not mun.strip():
            break

        code, name = mun.split('\t')

        # strip swedish ending
        if name.startswith("Maarianhamina"):
            name = "Maarianhamina"

        obj["area"+code] = name.strip().decode("utf8")

    if writefile:
        write_file("../data/0000-esimerkkidata.json", obj, True)
    return obj


# injects areaNNN codes into .geojson
def inject_codes_into_geojson():
    codes = create_codes()

    obj = json.load(open("../data-raw-geo/kunnat-orig.geojson"))

    munlist = obj["features"]
    print len(munlist)

    for m in munlist:
        name = m["properties"]["name"]

        found = None
        for key, value in codes.iteritems():
#             if unicode(value, "utf8") == name:
            if value == name:
                found = key
                break

        if found:
            m["properties"]["code"] = found
        else:
            print "NOT found", name

    # limit during dev
    LIMIT = 1000
    obj["features"] = obj["features"][:LIMIT]

    write_file("../data/kuntarajat.geojson", obj)

# picks selected municipalities from whole finland
# arealist is names, not areacodes
def build_geojson(arealist, fname):
    obj = json.load(open("../data/kuntarajat.geojson"))

    print "given area count:", len(arealist)

    areas = []

    for m in obj["features"]:
        name = m["properties"]["name"]
        if name in arealist:
            areas.append(m)

    obj["features"] = areas

    for m in obj["features"]:
        name = m["properties"]["name"]
        code = m["properties"]["code"]
        print "  ", name, code

    print "picked area count", len(areas)

    write_file(fname, obj)


# build tax data: .csv -> .json
def build_tax_data():
    lines = open("2001-2013verodata.csv").readlines()

    codes = create_codes()

    obj2001 = {}
    obj2013 = {}
    obj2012 = {}
    obj2013diff = {}
    obj2013diff2 = {}

    for mun in lines:
        mun = mun.strip()
        if not mun:
            break
        if mun.startswith("#"):
            continue

        parts = mun.split('\t')
        code = "area%03d" % int(parts[0]) # ensure 3 digits

        obj2001[code] = float(parts[2].replace(',', '.').strip())
        obj2013[code] = float(parts[14].replace(',', '.').strip())
        obj2012[code] = float(parts[13].replace(',', '.').strip())
        obj2013diff[code] = "%.2f" % (float(obj2013[code]) - float(obj2012[code]))
        obj2013diff2[code] = "%.2f" % (float(obj2013[code]) - float(obj2001[code]))

    write_file("../data/2001-tulovero.json", obj2001)
    write_file("../data/2012-tulovero.json", obj2012)
    write_file("../data/2013-tulovero.json", obj2013)
    write_file("../data/20122013-tulovero.json", obj2013diff)
    write_file("../data/20012013-tulovero.json", obj2013diff2)

# build tax data: .csv -> .json
# 2014 tax data was published in Nov 19, and was in different format!
def build_tax_data_2014():
    lines = open("Liite3_Kuntien_tuloveroprosentit_2014.csv").readlines()

    codes = create_codes()

    # read 2013 for diff
    obj2013 = json.load(open("../data/2013-tulovero.json"))

    obj2014 = {}
    obj2014diff = {}

    for mun in lines:
        mun = mun.strip()
        if not mun:
            break
        if mun.startswith("#"):
            continue

        parts = mun.split(';')
        code = find_code(codes, parts[0], "utf8")
        print "  ", code, parts[0]
        if not code:
            continue

        obj2014[code] = float(parts[2].replace(',', '.').replace('"', '').strip())
        obj2014diff[code] = "%.2f" % (float(obj2014[code]) - float(obj2013[code]))

    write_file("../data/2014-tulovero.json", obj2014)
    write_file("../data/20132014-tulovero.json", obj2014diff)


# build data: .csv -> .json
# http://tilastokeskus.fi/tup/kunnat/
def build_tilastokeskus_data():
    lines = open("tilastokeskus.csv").readlines()

    codes = create_codes()

    obj2012vakiluku = {}
    obj2012muuttovoitto = {}
    obj2011tulot = {}
    obj2011tyottomyys = {}
    obj2011elake = {}

    for mun in lines:
        mun = mun.strip()
        if not mun:
            break
        if mun.startswith("#"):
            continue

        parts = mun.split(';')

        # find code
        code = find_code(codes, parts[0])

        if code in obj2012vakiluku.keys():
            print "on jo!", code, parts[0]

        obj2012vakiluku[code] = float(parts[3].replace(',', '.').strip())
        obj2012muuttovoitto[code] = float(parts[10].replace(',', '.').strip())
        obj2011tulot[code] = float(parts[13].replace(',', '.').strip())
        obj2011tyottomyys[code] = float(parts[22].replace(',', '.').strip())
        obj2011elake[code] = float(parts[30].replace(',', '.').strip())

    write_file("../data/2012-vakiluku.json", obj2012vakiluku)
    write_file("../data/2012-muuttovoitto.json", obj2012muuttovoitto)
    write_file("../data/2011-tulot.json", obj2011tulot)
    write_file("../data/2011-tyottomyys.json", obj2011tyottomyys)
    write_file("../data/2011-elakelaisia.json", obj2011elake)


# returns municipality code for a given name
def find_code(codes, name, charset="latin1"):
    name = unicode(name,charset)
    name = name.split("-")[0].strip()

    if name.startswith('"'):
        name = name[1:]
    if name.endswith('"'):
        name = name[:-1]

    name = name.strip()

    for code, n in codes.items():
        if name == n:
            return code

    if name == u"Mänttä":
        return "area508" # "Mänttä-Vilppula"

    print "Not found! '%s'" % name


# writes a dict as json into file
def write_file(fname, jsondict, prettify=False):
    if prettify:
        jsondata = json.dumps(jsondict, ensure_ascii=False, sort_keys=True, indent=2)
    else:
        jsondata = json.dumps(jsondict, ensure_ascii=False)

    f = open(fname, "w")
    f.write(jsondata.encode("utf8"))
    f.close()


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv)>1 else ""

    if cmd == "codes":
        create_codes(True)
    elif cmd == "geojson":
        inject_codes_into_geojson()
    elif cmd == "tax":
        build_tax_data()
    elif cmd == "tax2014":
        build_tax_data_2014()
    elif cmd == "tilasto":
        build_tilastokeskus_data()
    elif cmd == "uusimaa":
        # Uudenmaan kunnat
        arealist = [
        u"Askola", u"Espoo", u"Hanko", u"Helsinki", u"Hyvinkää",
        u"Inkoo", u"Järvenpää", u"Karkkila", u"Kauniainen", u"Kerava",
        u"Kirkkonummi",
        u"Lapinjärvi", u"Lohja", u"Loviisa", u"Myrskylä", u"Mäntsälä",
        u"Nurmijärvi",
        u"Pornainen", u"Porvoo", u"Pukkila", u"Raasepori", u"Sipoo",
        u"Siuntio", u"Tuusula", u"Vantaa", u"Vihti"]

        build_geojson(arealist, "../data/kuntarajat-uusimaa.geojson")
    elif cmd == "varsinais":
        # varsinais-suomen kunnat
        arealist = [
        u"Aura", u"Kaarina", u"Kemiönsaari", u"Koski Tl", u"Kustavi",
        u"Laitila", u"Lieto", u"Loimaa", u"Marttila", u"Masku", u"Mynämäki",
        u"Naantali", u"Nousiainen", u"Oripää", u"Paimio", u"Parainen",
        u"Pyhäranta", u"Pöytyä", u"Raisio", u"Rusko", u"Salo", u"Sauvo",
        u"Somero", u"Taivassalo", u"Tarvasjoki", u"Turku", u"Uusikaupunki",
        u"Vehmaa"]

        build_geojson(arealist, "../data/kuntarajat-varsinaissuomi.geojson")
    else:
        print "unknown command!"

