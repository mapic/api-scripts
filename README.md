# Systemapic API scripts
_Scripts in Bash and NodeJS for interacting with the Systemapic API_

### Install
1. Clone this repository to your localhost: `git clone https://github.com/systemapic/api-scripts.git`
2. Enter folder: `cd api-scripts`
3. Run `./install.sh` script. This will install dependencies and copy the [config template](https://github.com/systemapic/api-scripts/blob/master/config.json.template). You'll also be prompted to add your credentials to the config. The config should end with the message: `You're now ready to use the Systemapic API!`

### Upload data

Create your own `datacube.json` file from [`datacube.json.template`](https://github.com/systemapic/api-scripts/blob/master/datacube.json.template):

```javascript
{
    "folder" : "/home/test-snow/", 	// absolute path of folder containing .tiff's
    "title" : "Snow raster 11" 		// name of cube
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


### Date parsing
Dates are added to metadata from filename. 

Currently with [this helper function](https://github.com/systemapic/api-scripts/blob/master/lib/upload_rasters_to_cube.js#L19), where `SCF_MOD_2014_001.tif` is parsed to `Jan 01 2014`.

It's possible to implement your own date parser, and change [this](https://github.com/systemapic/api-scripts/blob/master/lib/upload_rasters_to_cube.js#L102) fn call.

----

#### Dependencies:
- Git: https://git-scm.com/download/
- NodeJS: https://nodejs.org/en/download/