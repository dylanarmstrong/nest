#!/usr/bin/env node
'use strict';

/**
 * config.json
 *
 * {
 *   device: "device id",
 *   token: "client token"
 * }
 *
 */

const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
const fs = require('fs');
const path = require('path');
const request = require('request');

const optionDefinitions = [
  {
    description: 'Show help',
    name: 'help',
    type: Boolean
  },
  {
    description: 'Accepts cool or heat, sets mode of thermostat',
    name: 'mode',
    type: String
  },
  {
    defaultOption: true,
    description: 'Temperature to set thermostat to',
    name: 'temp',
    type: Number
  }
];

let options;
try {
  options = commandLineArgs(optionDefinitions);
} catch (e) {
  options = {
    help: true
  }
}

const {
  mode,
  temp
} = options;

if (mode && mode !== 'heat' && mode !== 'cool') {
  console.error(`Invalid mode '${mode}', accepted values are 'heat' and 'cool'`);
  options.help = true;
}

if (temp && (temp > 76 || temp < 65)) {
  console.error(`${temp} is too crazy!`);
  options.help = true;
}

if (options.help) {
  const usage = commandLineUsage([
    {
      content: `Set temperature and mode of nest thermostat
        nest                | reads temperature
        nest 72             | sets temperature to 72
        nest --mode cool 72 | sets mode to cool and temperature to 72`,
      header: 'Nest'
    },
    {
      header: 'Options',
      optionList: optionDefinitions
    },
    {
      content: 'If no options provided, reads current temperature'
    }
  ]);
  console.log(usage);
  process.exit();
}

const baseUrl = 'https://developer-api.nest.com';

// config.json is in root directory
let config;
try {
  const configPath = path.join(__dirname, './config.json');
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch (e) {
  console.error('Missing config.json, please copy from config.example.json and setup.');
  process.exit(1);
}

if (!config) {
  console.error('Missing config.json, please copy from config.example.json and setup.');
  process.exit(1);
}

const {
  device,
  token
} = config;

const req = (err, resp, data) => {
  nested++;
  if (!resp) {
    return;
  }
  const { statusCode } = resp;
  // Redirect
  if (statusCode === 307) {
    if (nested > 3) {
      console.error('Too many redirects!');
      process.exit(1);
    } else {
      requestOptions.url = resp.headers.location;
      return request(requestOptions, req);
    }
  } else if (statusCode > 199 && statusCode < 300) {
    data = JSON.parse(data);
    if (temp) {
      return data.target_temperature_f;
    } else {
      try {
        return data.devices.thermostats[device].target_temperature_f;
      } catch (e) {
      }
    }
  }
};

const requestOptions = {
  'headers': {
    'Authorization': 'Bearer ' + token
  },
  'followRedirect': true
};

let nested;

const setTemp = (temp) => {
  // Writing temperature
  requestOptions.method = 'PUT';
  requestOptions.body = JSON.stringify({ 'target_temperature_f': temp });
  requestOptions.headers['Content-Type'] = 'application/json';
  requestOptions.url = `${baseUrl}/devices/thermostats/${device}`;
  requestOptions.removeRefererHeader = false;
  nested = 0;
  return request(requestOptions, req);
};

const setMode = (mode) => {
  // Writing mode
  requestOptions.method = 'PUT';
  requestOptions.body = JSON.stringify({ 'hvac_mode': mode });
  requestOptions.headers['Content-Type'] = 'application/json';
  requestOptions.url = `${baseUrl}/devices/thermostats/${device}`;
  requestOptions.removeRefererHeader = false;
  nested = 0;
  return request(requestOptions, req);
};

const read = () => {
  // Reading temperature
  requestOptions.method = 'GET';
  requestOptions.url = baseUrl;
  requestOptions.path = '/';
  nested = 0;
  return request(requestOptions, req);
};

// Writing temperature
if (temp) {
  setTemp(temp);
}

if (mode) {
  setMode(mode);
}

let currentTemp = read();
console.log(currentTemp);

