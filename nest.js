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
const rp = require('request-promise');

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

const req = (data) => JSON.parse(data).devices.thermostats[device].target_temperature_f;

const reject = (resp) => {
  const { response } = resp;

  if (!response) {
    return;
  }

  // Rate limit
  if (response.statusCode === 429) {
    console.error('Unable to set: rate limit exceeded');
    return;
  }

  if (nested > 3) {
    console.error('Unable to set: too many redirects');
    return;
  }

  nested++;
  requestOptions.url = resp.response.headers.location;
  return rp(requestOptions).catch(reject);
};

const requestOptions = {
  'headers': {
    'Authorization': 'Bearer ' + token
  },
  'followRedirect': true
};

let nested;

const set = () => {
  nested = 0;

  requestOptions.method = 'PUT';
  requestOptions.headers['Content-Type'] = 'application/json';
  requestOptions.url = `${baseUrl}/devices/thermostats/${device}`;
  requestOptions.removeRefererHeader = false;

  return rp(requestOptions).catch(reject);
};

// Writing temperature
const setTemp = (temp) => {
  requestOptions.body = JSON.stringify({ 'target_temperature_f': temp });
  return set();
};

// Writing mode
const setMode = (mode) => {
  requestOptions.body = JSON.stringify({ 'hvac_mode': mode });
  return set();
};

const read = () => {
  // Reading temperature
  requestOptions.method = 'GET';
  requestOptions.url = baseUrl;
  requestOptions.path = '/';
  nested = 0;

  return rp(requestOptions).then(req);
};

// Writing temperature
const rs = [];
if (temp) {
  rs.push(setTemp(temp));
}

if (mode) {
  rs.push(setMode(mode));
}

// Doesn't matter if setters overlap, but read can't
Promise.all(rs).then(() =>
  read()
    .then(t => console.log(t))
    .catch(e => {})
);

