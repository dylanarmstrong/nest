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

const request = require('request');
const fs = require('fs');
const path = require('path');

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

const options = {
  'headers': {
    'Authorization': 'Bearer ' + token
  },
  'followRedirect': true
};

const { argv } = process;
if (argv.length > 2) {
  // Writing temperature
  const temp = Number(argv[2]);
  if (isNaN(temp) || temp > 76 || temp < 65) {
    console.log(`${temp} is either not a number or too crazy!`);
    process.exit(1);
  }

  options.method = 'PUT';
  options.body = JSON.stringify({ 'target_temperature_f': temp });
  options.headers['Content-Type'] = 'application/json';
  options.url = `${baseUrl}/devices/thermostats/${device}`;
  options.removeRefererHeader = false;

} else {
  // Reading temperature
  options.method = 'GET';
  options.url = baseUrl;
  options.path = '/';
}

request(options, (err, resp, data) => {
  const { statusCode } = resp;
  // Redirect
  if (statusCode === 307) {
    options.url = resp.headers.location;
    request(options, (_err, _resp, _data) => {
      if (_resp.statusCode === 200) {
        _data = JSON.parse(_data);
        const temp = _data.target_temperature_f;
        console.log(temp);
      }
    });
  } else {
    data = JSON.parse(data);
    const temp = data.devices.thermostats[device].target_temperature_f;
    console.log(temp);
  }
});

