# BinWhere Data Sources

## Overview

Data is sourced from [data.gov.sg](https://data.gov.sg) and NEA. **These are static datasets with annual updates, NOT real-time APIs.**

## Available Datasets

| Dataset | Points | Last Updated | Update Freq | Format | Size |
|---------|--------|--------------|-------------|--------|------|
| Recycling Bins (Blue Bins) | 12,578 | 2024-06-06 | Unknown | GeoJSON | 19MB |
| E-waste Collection | 718 | 2025-11-08 | Annual | GeoJSON | 661KB |
| Textile/Clothing | N/A | - | - | - | - |

**Note:** Textile recycling data is NOT available as a separate dataset. Options:
1. Use "2nd Hand Goods Collection Points" from NEA
2. Scrape from recycle.gov.sg
3. Contact NEA for data access

## Data Schemas

### Recycling Bins (recycling-bins.geojson)
```
Properties embedded in HTML Description field:
- ADDRESSBLOCKHOUSENUMBER: string
- ADDRESSBUILDINGNAME: string
- ADDRESSFLOORNUMBER: string
- ADDRESSPOSTALCODE: string
- ADDRESSSTREETNAME: string
- ADDRESSTYPE: "H" (HDB)
- DESCRIPTION: string
- HYPERLINK: string
- NAME: "Recycling Bins in HDB Estates"
- PHOTOURL: string
- INC_CRC: string (checksum)
- FMEL_UPD_D: string (yyyymmddHHMMSS)

Geometry:
- type: "Point"
- coordinates: [lng, lat, altitude]
```

### E-waste Collection (ewaste.geojson)
```
Properties:
- OBJECTID: number
- NAME: string (operator name)
- ADDRESSBLOCKHOUSENUMBER: string | null
- ADDRESSBUILDINGNAME: string
- ADDRESSFLOORNUMBER: string | null
- ADDRESSPOSTALCODE: string
- ADDRESSSTREETNAME: string
- ADDRESSUNITNUMBER: string | null
- DESCRIPTION: string (e.g., "E-waste accepted: ICT equipment, Batteries and Lamps only")
- HYPERLINK: string (operator website)
- PHOTOURL: string | null
- ACCESSRESTRICTION: "Public" | "Private"
- LANDXADDRESSPOINT: number
- LANDYADDRESSPOINT: number
- INC_CRC: string (checksum)
- FMEL_UPD_D: string (yyyymmddHHMMSS) - Last update: mostly 2022

Geometry:
- type: "Point"
- coordinates: [lng, lat]
```

## Data Quality Issues

1. **E-waste data is outdated**: Most records show `FMEL_UPD_D` from 2022
2. **Recycling bins Description parsing required**: Data is embedded in HTML table
3. **Missing coordinates**: Some records have `LANDXADDRESSPOINT: 0`
4. **No textile-specific dataset available**

## Maintenance Strategy

Since data is updated **annually** (not real-time):

1. **Monthly check**: Run script to compare file hash with source
2. **Manual refresh**: Re-download when source updates
3. **User feedback**: Allow users to report outdated/incorrect points
4. **Show freshness**: Display "Data as of: {date}" in UI

### Automated Update Check Script
```bash
# Check if source has been updated (compare file hash)
curl -s "https://api-open.data.gov.sg/v1/public/api/datasets/d_4dde14826642f49eefff48b7832b90db/metadata" | jq '.lastUpdatedAt'
```

## API Endpoints

### Poll-Download Pattern
```
GET https://api-open.data.gov.sg/v1/public/api/datasets/{dataset_id}/poll-download
Response: { "code": 0, "data": { "url": "https://s3...signed-url" } }
```

### Dataset IDs
- Recycling Bins: `d_4dde14826642f49eefff48b7832b90db`
- E-waste: `d_db40d004afeb5a7f0f555fdcc34934cc`

## Additional Data Sources

From [sg3rdata](https://github.com/cheeaun/sg3rdata):
- 2nd Hand Goods Collection Points
- Cash For Trash
- Lighting Waste Collection Points

Source: https://www.nea.gov.sg/our-services/waste-management/3r-programmes-and-resources/recycling-collection-points
