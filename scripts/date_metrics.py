#!/usr/bin/env python3
import argparse
import collections
import datetime as dt
import xml.etree.ElementTree as ET


DATE_FIELDS = {
    "publicacion": [
        "Fecha_publicacion",
        "Fecha_Publicacion",
        "FECHA_PUBLICACION",
        "Fecha_Publicación",
    ],
    "inicio": [
        "Fecha_Inicio",
        "FECHA_INICIO",
        "Fecha_inicio",
    ],
    "termino": [
        "Fecha_Terminacion",
        "Fecha_Termino",
        "FECHA_TERMINACION",
        "FECHA_TERMINO",
        "Fecha_Término",
    ],
}


def get_text(item, tags):
    for tag in tags:
        node = item.find(tag)
        if node is not None and node.text and node.text.strip():
            return node.text.strip()
    return ""


def parse_date(value):
    value = value.strip()
    if not value:
        return None

    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return dt.datetime.strptime(value[:10], fmt).date()
        except ValueError:
            pass

    return None


def summarize_dates(items, field_name, tags, sample_days):
    dates = []
    missing = 0
    invalid = 0

    for item in items:
        raw_value = get_text(item, tags)
        if not raw_value:
            missing += 1
            continue

        parsed = parse_date(raw_value)
        if parsed is None:
            invalid += 1
            continue

        dates.append(parsed)

    print(f"\n{field_name}")
    print(f"  validas: {len(dates)}")
    print(f"  vacias: {missing}")
    print(f"  invalidas: {invalid}")

    if not dates:
        return

    min_date = min(dates)
    max_date = max(dates)
    print(f"  minimo: {min_date}")
    print(f"  maximo: {max_date}")

    by_month = collections.Counter((date.year, date.month) for date in dates)
    print("  por mes:")
    for (year, month), count in sorted(by_month.items()):
        print(f"    {year}-{month:02d}: {count}")

    print("  muestras de rango:")
    for days in sample_days:
        end_date = min_date + dt.timedelta(days=days)
        count = sum(min_date <= date <= end_date for date in dates)
        print(f"    {min_date} a {end_date}: {count}")


def main():
    parser = argparse.ArgumentParser(
        description="Calcula metricas de fechas para XML de Construleads."
    )
    parser.add_argument("xml_path", help="Ruta al XML/TXT exportado del WS")
    parser.add_argument(
        "--days",
        default="0,1,7,30,90,180",
        help="Rangos de dias a probar desde la fecha minima",
    )
    args = parser.parse_args()

    sample_days = [
        int(value.strip())
        for value in args.days.split(",")
        if value.strip()
    ]

    root = ET.parse(args.xml_path).getroot()
    items = root.findall(".//datos")

    print(f"archivo: {args.xml_path}")
    print(f"registros: {len(items)}")

    for field_name, tags in DATE_FIELDS.items():
        summarize_dates(items, field_name, tags, sample_days)


if __name__ == "__main__":
    main()
