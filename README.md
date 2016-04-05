# Systemapic API scripts
Scripts in Bash and NodeJS for interacting with the Systemapic API

#### Configuration
Start by running `./install.sh` script. This will install dependencies and copy the config template. You'll also be prompted to add your credentials to the config. The config should end with the message: `You're now ready to use the Systemapic API!`

#### Upload data

Create your own `dataset.json` file from [`dataset.json.template`](https://github.com/systemapic/api-scripts/blob/master/dataset.json.template). 

```json
{
    "folder" : "/home/test-snow/",
    "title" : "Snow raster 11"
}
```
Add the folder containing snow raster GeoTIFF's, and add a title for your timeseries dataset (aka cube).

**Upload and create cube with:** 
`./upload_dataset.sh dataset.json`.
