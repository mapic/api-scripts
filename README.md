![Mapic Logo](https://cloud.githubusercontent.com/assets/2197944/19607635/5c434458-97cb-11e6-941b-e74e83b385ba.png)

# Mapic API SDK
Scripts in Bash and NodeJS for interacting with Mapic Services.

#### Current SDK's / scripts
1. Upload datasets to timeseries (aka a `cube`)
2. Replace datasets in timeseries 
3. Sync datasets from FTP server 
_...more to come!_

## Dependencies
You need to install [`git`](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git), and [Docker](https://docs.docker.com/engine/installation/).

## Install

1. Clone this repository to your harddrive,
2. Enter folder
3. Run configure script
like so:

```bash
git clone https://github.com/mapic/sdk.git
cd sdk
./configure.sh
```

## Usage

All available scripts are found in the root folder with `api.` prefix.

### Upload datasets

Create your own `datacube.json` file from [`datacube.json.template`](https://github.com/mapic/sdk/blob/master/datasets/datacube.template.json):

```javascript
{
    "title" : "Hallingdal Snow Cover - 2016",
    "options" : {
        "type" : "scf",
        "dateformat" : "YYYYMMDD"
    },
    "datasets" : "/home/ftp/snow/datasets/2016/",
    "masks" : [
        {
            "title" : "hallingdal",
            "description" : "Nedbørsfelt: Hallingdalsvassdraget",
            "geojson" : "/home/ftp/snow/masks/hallingdal/hallingdal.geojson",
            "data" : "/home/ftp/snow/masks/hallingdal/hallingdal.scf.json"
        },
        {
            "title" : "rjukan",
            "description" : "Kraftverk",
            "geojson" : "/home/ftp/snow/masks/rjukan/rjukan.union.geojson",
            "data" : "/home/ftp/snow/masks/rjukan/rjukan.scf.json"
        }
    ]
}
```

**Then run script:**   
`./upload_datacube.sh datacube.json`.

This will do the following:  
1. Create a cube  
2. Upload all rasters in folder  
3. Add all rasters to cube  
4. Create a project  
5. Add cube layer to project  


### Replace datasets

You can replace datasets in a cube, by using the `./replace_datasets.sh` script with the `replace_datasets.json` configuration:

```json
{
    "folder" : "/home/ftp_globesar/2016_02/",
    "cube_id" : "cube-535a0ec3-8705-4215-8c94-8786b9680598",
    "granularity" : "day",
    "date_format" : "x_x_YYYYMMDD"
}
```


Simply add the `cube_id` for the cube which you would like to replace datasets in, and the folder from which to upload data. The `granularity` option is used when comparing dates of datasets (see below for more info on date parsing). `'day'` is appropriate for daily rasters. The `date_format` corresponds to the pre-defined functions created to parse date strings (see `Date parsing` below). 

**Then run script:**   
`./replace_datasets.sh replace_datasets.json`.


NB: Note that you may have to reload a couple of times in order to get the new datasets showing (work in progress).

To get the `cube_id`:  
![get-cubeid](https://cloud.githubusercontent.com/assets/2197944/15475233/561f349e-2109-11e6-8587-55c3cfb37631.gif)




#### Note about date parsing:
Dates are added to metadata from filename. 

Currently with [these helper functions](https://github.com/mapic/sdk/blob/master/lib/upload_rasters_to_cube.js#L20-L38), where `SCF_MOD_2014_001.tif` is parsed to `Jan 01 2014`.

It's possible to implement your own date parser, and change [this function call](https://github.com/mapic/sdk/blob/master/lib/upload_rasters_to_cube.js#L113).


## Dependencies:
- Git: https://git-scm.com/download/
- NodeJS: https://nodejs.org/en/download/
