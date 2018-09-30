## Nest
Set temperature and mode of Nest thermostat

### Setup
Copy config.example.json to config.json and include your client token and device id. The [Nest API](https://developers.nest.com/guides/api/thermostat-guide) docs are pretty good about all the information you could possibly want for this.

### Usage
`nest`               | reads temperature

`nest 72`            | sets temperature to 72

`nest --mode cool 72`| sets mode to cool and temperature to 72

### Options
`--help`               Show help

`--mode string`        Accepts cool or heat, sets mode of thermostat

`--temp number`        Temperature to set thermostat to

If no options provided, reads current temperature
