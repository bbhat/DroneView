////////////////////////////////////////////////////////////////////////////////
//
//						Copyright 2019 xxxxxxx, xxxxxxx
//	File:	DroneConnect.js
//	Author:	Bala B. (bhat.balasubramanya@gmail.com)
//	Description: Program to connect to Drone over mavlink
//
////////////////////////////////////////////////////////////////////////////////

// Required modules
const MavLink       = require('mavlink');
const SerialPort    = require('serialport');
const EventEmitter  = require('events');

//------------------------------------------------------------------------------
//        GPS class
//------------------------------------------------------------------------------
class GPSStatus {
    constructor() {
      this.timestamp = 0;
      this.lat = 0.0;
      this.lon = 0.0;
      this.alt = 0.0;
      this.relative_alt = 0.0;
      this.hdg = 0.0;
    }
}

//------------------------------------------------------------------------------
//        Baro class
//------------------------------------------------------------------------------
class BaroStatus {
  constructor() {
    this.timestamp = 0;
    this.alt = 0.0;
  }
}

//------------------------------------------------------------------------------
//        DroneLink class
//------------------------------------------------------------------------------
class DroneLink extends EventEmitter {
  constructor(portname) {

    super();

    this._mavportname = portname;
    this._mavport  = new SerialPort(this._mavportname, {
                          baudRate: 57600
                        });
    this.temperature = 0.0;
    this.gps = new GPSStatus;
    this.baro = new BaroStatus;

    // Create a new mavlink instance passing (sysid, compid, version, definitions)
    // Pass 0, 0 so that we can receive all incoming messages
    this._mavlink       = new MavLink(0, 0, 'v1.0', ['common', 'pixhawk']);

    this._mavport.on('open', () => {
      console.log('Serial port ' + this._mavportname + ' ' + 'opened successfully. Waiting for data...');
    });

    //------------------------------------------------------------------------------
    //        MavLink functions
    //------------------------------------------------------------------------------

    // Wait for 'ready' event on the mav
    this._mavlink.on('ready', () => {
      console.log('Mavlink ready. Waiting for drone connection...');

      this._mavport.on('data', (data) => {
        this._mavlink.parse(data);
      });
    });


    // _mavlink.on('message', (message) => {
    //   console.log(message.id);
    // });

    this._mavlink.on('GLOBAL_POSITION_INT', (message, fields) => {
      // console.log('GPS (lat: ' + fields.lat +
      //                 ' lon: ' + fields.lon +
      //                 ' alt: ' + fields.alt +
      //                 ' gnd alt: ' + fields.relative_alt +
      //                 ' hdg: ' + fields.hdg);

      this.gps.timestamp = fields.timestamp;
      this.gps.lat = fields.lat / 10000000.0; // Convert to float from degE7 format
      this.gps.lon = fields.lon / 10000000.0; // Convert to float from degE7 format
      this.gps.alt = fields.alt / 1000.0;      // Convert from mm to Meters
      this.gps.relative_alt = fields.relative_alt;
      this.gps.hdg = fields.hdg;

      this.emit('global_position');
    });

    this._mavlink.on('HIGHRES_IMU', (message, fields) => {
      // console.log('HIGHRES_IMU (pressure_alt: ' + fields.pressure_alt +
      //                      ' temperature: ' + fields.temperature);
      this.baro.alt = fields.pressure_alt;
      this.temperature = fields.temperature;
      this.emit('pressure_alt');
    });
  }
}

module.exports = DroneLink;
